import { IncomingMessage, ServerResponse } from 'node:http';
import { supabase } from '../../../lib/supabase.js';
import { LoginSchema } from '../../../shared/schemas/auth.js';
import { ZodError } from 'zod';

export async function loginHandler(req: IncomingMessage & { body?: any }, res: ServerResponse): Promise<void> {
  // Fastify já parseou o body; usar req.body injetado pelo adapter
  const parsed = req.body;

  try {
    const { email, password } = await LoginSchema.parseAsync(parsed);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.warn('Login failed:', error.message);
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Email ou senha incorretos.' }));
      return;
    }

    // Lookup professional by auth_user_id
    const { data: professional, error: profError } = await supabase
      .from('professionals')
      .select('id, slug, display_name, business_type')
      .eq('auth_user_id', data.user.id)
      .single();

    if (profError || !professional) {
      console.warn('Professional not found for user:', data.user.id);
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Profissional não encontrado para este usuário.' }));
      return;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      professional,
    }));
  } catch (err: any) {
    if (err instanceof SyntaxError) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "JSON inválido." }));
    } else if (err instanceof ZodError) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Dados de entrada inválidos.",
          details: err.issues.map((e) => ({
            field: e.path.join("."),
            message: e.message,
          })),
        }),
      );
    } else {
      console.error('Login unexpected error:', err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Erro interno no servidor." }));
    }
  }
}
