import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().default(3333),
  DATABASE_URL: z.string().url(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_ANON_KEY: z.string().min(1, "Chave necessária"),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, "Chave necessária"),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  WHATSAPP_API_URL: z.string().catch("pending"),
  WHATSAPP_API_KEY: z.string().catch("pending"),
  GEMINI_API_KEY: z.string().catch("pending"), // IA para drafts de recall
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("❌ Erro de configuração:", parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
