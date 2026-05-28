import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { URL } from 'node:url';

/**
 * Public handler to get professional availability.
 * GET /v1/public/professional/:id/availability?date=YYYY-MM-DD&service_id=UUID
 */
export async function getPublicAvailability(req: IncomingMessage, res: ServerResponse, params: Record<string, string>) {
  const professionalSlug = params.id;

  return new Promise<void>(async (resolve) => {
    try {
      // Parse query string
      const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
      const date = url.searchParams.get('date');
      const serviceId = url.searchParams.get('service_id');

      if (!date || !serviceId) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Faltam os parametros "date" e "service_id" na query.' }));
        resolve();
        return;
      }

      // 1. Fetch professional ID from slug
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id')
        .eq('slug', professionalSlug)
        .single();

      if (profError || !professional) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Profissional não encontrado.' }));
        resolve();
        return;
      }

      // 2. Call the RPC to calculate available slots
      const { data: slots, error: rpcError } = await supabase.rpc('get_available_slots_v1', {
        p_professional_id: professional.id,
        p_service_id: serviceId,
        p_date: date
      });

      if (rpcError) {
        console.error('RPC Error:', rpcError);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Erro ao calcular disponibilidade.' }));
      } else {
        // Return simple array of strings [ "09:00", "09:15" ]
        const timeArray = (slots || []).map((s: any) => s.available_time);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(timeArray));
      }
    } catch (err) {
      console.error('Availability Error:', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro interno no servidor.' }));
    } finally {
      resolve();
    }
  });
}
