import { IncomingMessage, ServerResponse } from "node:http";
import { supabase } from "../../../lib/supabase.js";
import { SignupSchema } from "../../../shared/schemas/auth.js";
import { ZodError } from "zod";

function toSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function signupHandler(req: IncomingMessage & { body?: any }, res: ServerResponse): Promise<void> {
  // Fastify já parseou o body; usar req.body injetado pelo adapter
  const parsed = req.body;

  try {
    const {
      email,
      password,
      display_name,
      phone,
      business_type,
    } = await SignupSchema.parseAsync(parsed);

    const normalizedPhone = phone.trim();

    // 1. Create Supabase Auth user (admin API — service_role)
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

    if (authError) {
      console.error("Signup auth error:", authError);
      const isAlreadyExists =
        authError.message?.includes("already") || authError.status === 422;
      const status = isAlreadyExists ? 409 : 500;
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: isAlreadyExists
            ? "Este email já está cadastrado."
            : `Erro ao criar conta: ${authError.message}`,
        }),
      );
      return;
    }

    const authUserId = authData.user.id;
    let slug = toSlug(display_name);

    // 2. Create professional row with auth_user_id bridge
    const buildRow = (s: string) => ({
      auth_user_id: authUserId,
      email,
      display_name,
      full_name: display_name, // DB requires NOT NULL — mirrors display_name
      phone: normalizedPhone,
      slug: s,
      business_type,
    });

    let { data: professional, error: profError } = await supabase
      .from("professionals")
      .insert([buildRow(slug)])
      .select("id, slug, display_name, full_name, phone, business_type, email, timezone, created_at")
      .single();

    // Auto-Suffix: retry once if slug is already taken
    if (profError?.code === '23505' && profError?.details?.includes('slug')) {
      const suffix = Math.floor(Math.random() * 900) + 100;
      slug = `${slug}-${suffix}`;
      ({ data: professional, error: profError } = await supabase
        .from("professionals")
        .insert([buildRow(slug)])
        .select("id, slug, display_name, full_name, phone, business_type, email, timezone, created_at")
        .single());
    }

    if (profError) {
      // Rollback: delete the auth user if professional creation fails
      console.error('❌ [DATABASE DETAIL]: Falha ao criar profissional', {
        authUserId,
        slug,
        phone: normalizedPhone,
        business_type,
        profError,
      });
      await supabase.auth.admin.deleteUser(authUserId);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          error: "Erro no Banco de Dados",
          code: profError.code,
          message: profError.message,
          detail: profError.details,
        }),
      );
      return;
    }

    // 3. Generate session JWT for the new user
    const { data: sessionData, error: sessionError } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (sessionError || !sessionData.session) {
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          user: professional,
          message: "Conta criada. Faça login para obter o token.",
        }),
      );
      return;
    }

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        user: professional,
      }),
    );
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
      console.error('Signup unexpected error:', err);
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Erro interno no servidor." }));
    }
  }
}
