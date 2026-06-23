import 'dotenv/config';
import pkg from 'pg';
const { Client } = pkg;
import { supabase } from './lib/supabase.js';
import { config } from './config.js';
import { sendWhatsAppMessage } from './services/whatsapp.js';
import { buildClientMessage, formatAppointmentDateTime } from './services/whatsapp-templates.js';

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
            professionals (display_name, slug),
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
        
        // Formatação no fuso do produto (America/Sao_Paulo), não no fuso do servidor (UTC).
        const { date: formattedDate, time: formattedTime } = formatAppointmentDateTime(appt.scheduled_start);
        
        // Montar slug fallback
        const slug = appt.professionals.slug || appt.professionals.id;

        // Mensagens ao cliente: template centralizado (usa display_name público).
        // recipient_type != 'client' (ex.: profissional) → não envia por aqui.
        const message =
          notification.recipient_type === 'client'
            ? buildClientMessage(notification.template_key, {
                clientName: appt.clients.full_name,
                professionalName: appt.professionals.display_name,
                date: formattedDate,
                time: formattedTime,
                slug,
              })
            : null;

        if (message) {
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
