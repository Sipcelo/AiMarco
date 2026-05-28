import { z } from "zod";
import { BrazilianPhoneSchema } from "../../validators/phone.js";

const BUSINESS_SEGMENTS = ['barbershop', 'nails', 'hair'] as const;

export const SignupSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email({ message: "Este e-mail parece estar escrito errado. Verifique se tem '@' e '.com' ou '.com.br'." }),
  password: z
    .string()
    .min(6, { message: "Senha muito curta! Use pelo menos 6 caracteres para sua segurança." })
    .max(100, { message: "Senha muito longa. Use no máximo 100 caracteres." }),
  display_name: z
    .string()
    .trim()
    .min(2, { message: "Nome de exibição muito curto. Use pelo menos 2 caracteres." })
    .max(50, { message: "Nome de exibição muito longo. Máximo de 50 caracteres." }),
  phone: BrazilianPhoneSchema,
  business_type: z.enum(BUSINESS_SEGMENTS, {
    message: "Tipo de negócio inválido. Escolha: Barbeiro, Manicure/Pedicure ou Cabelereiro.",
  }),
});

export type SignupInput = z.infer<typeof SignupSchema>;

export const LoginSchema = z.object({
  email: z.string().trim().toLowerCase().email({ message: "E-mail inválido. Verifique o formato." }),
  password: z.string().min(1, { message: "Digite sua senha." }),
});

export type LoginInput = z.infer<typeof LoginSchema>;
