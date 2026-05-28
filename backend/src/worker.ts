import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import { supabase } from './lib/supabase.js';
import { config } from './config.js';
import { sendWhatsAppMessage } from './services/whatsapp.js';

async function startWorker() {
  const client = new Client({ connectionString: config.DATABASE_URL });

  try {
    await client.connect();
    console.log('Worker connected to database.');

    await client.query('LISTEN new_notification');
    console.log('Worker listening for new_notification...');

    // Cleanup stale "processing" notifications every 5 minutes
    setInterval(async () => {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { error } = await supabase
        .from('notifications')
        .update({ status: 'pending', updated_at: new Date().toISOString() })
        .eq('status', 'processing')
        .lt('updated_at', fiveMinutesAgo);
      
      if (error) console.error('Error cleaning up stale notifications:', error);
    }, 5 * 60 * 1000);

    client.on('notification', async (msg) => {
      const notificationId = msg.payload;
      if (!notificationId) return;

      console.log(`Received notification: ${notificationId}`);

      // Concurrency Safety: Try to claim the notification
      // We use UPDATE ... WHERE status = 'pending' to ensure only one worker processes it
      const { data: notification, error: claimError } = await supabase
        .from('notifications')
        .update({ status: 'processing', updated_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('status', 'pending')
        .select(`
          *,
          appointments (
            scheduled_start,
            professionals (full_name, phone, slug),
            clients (full_name, phone),
            services (name)
          )
        `)
        .single();

      if (claimError || !notification) {
        // Either already processed, or error fetching
        return;
      }

      try {
        const appt = notification.appointments;
        const recipientPhone = appt.clients.phone;
        
        // Formatação de data/hora (Fuso: pt-BR local)
        const dateObj = new Date(appt.scheduled_start);
        const formattedDate = dateObj.toLocaleDateString('pt-BR');
        const formattedTime = dateObj.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        
        // Montar slug fallback
        const slug = appt.professionals.slug || appt.professionals.id;

        // Validar e enviar mensagem customizada baseada no tipo de template
        if (notification.template_key === 'APPOINTMENT_CREATED' && notification.recipient_type === 'client') {
          const message = `Olá ¹!! Confirmamos seu horário na ²! para o dia ³! às ⁴!. Link para reagendar/cancelar: https://aimarco.com.br/p/⁵!`
            .replace('¹!', appt.clients.full_name)
            .replace('²!', appt.professionals.full_name)
            .replace('³!', formattedDate)
            .replace('⁴!', formattedTime)
            .replace('⁵!', slug);

          console.log(`[WHATSAPP] Enviando para ${recipientPhone}...`);
          await sendWhatsAppMessage(recipientPhone, message);
        } else if (notification.template_key === 'APPOINTMENT_CANCELLED' && notification.recipient_type === 'client') {
          const message = `Olá ¹! Informamos que seu agendamento com ²! foi cancelado. Para agendar novamente, acesse: https://aimarco.com.br/p/³!`
            .replace('¹!', appt.clients.full_name)
            .replace('²!', appt.professionals.full_name)
            .replace('³!', slug);

          console.log(`[WHATSAPP] Enviando para ${recipientPhone}...`);
          await sendWhatsAppMessage(recipientPhone, message);
        } else if (notification.template_key === 'APPOINTMENT_RESCHEDULED' && notification.recipient_type === 'client') {
          const message = `Olá ¹! Seu horário com ²! foi remarcado para o dia ³! às ⁴!. Confirme ou altere em: https://aimarco.com.br/p/⁵!`
            .replace('¹!', appt.clients.full_name)
            .replace('²!', appt.professionals.full_name)
            .replace('³!', formattedDate)
            .replace('⁴!', formattedTime)
            .replace('⁵!', slug);

          console.log(`[WHATSAPP] Enviando para ${recipientPhone}...`);
          await sendWhatsAppMessage(recipientPhone, message);
        } else {
          console.log(`[SIMULATION] Notificação ${notification.template_key} para ${notification.recipient_type} não configurada para envio real.`);
        }

        // Update to sent
        await supabase
          .from('notifications')
          .update({ 
            status: 'sent', 
            sent_at: new Date().toISOString(),
            updated_at: new Date().toISOString() 
          })
          .eq('id', notificationId);

        console.log(`Notification ${notificationId} marked as sent.`);
      } catch (sendError: any) {
        console.error(`Failed to process notification ${notificationId}:`, sendError);
        // Fail-safe and status feedback (vulnerability-scanner principle: log failure but stay alive)
        await supabase
          .from('notifications')
          .update({ 
            status: 'failed', 
            updated_at: new Date().toISOString(),
            failure_reason: sendError.message || 'Unknown network error'
          })
          .eq('id', notificationId);
      }
    });

  } catch (err) {
    console.error('Worker error:', err);
    process.exit(1);
  }
}

startWorker();
