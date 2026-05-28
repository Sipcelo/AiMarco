import { z } from "zod";
import { BrazilianPhoneSchema } from "../../validators/phone.js";

const BUSINESS_SEGMENTS = ['barbershop', 'nails', 'hair'] as const;

/**
 * Validates the creation of a new appointment.
 */
export const AppointmentCreateSchema = z.object({
  professional_id: z
    .string()
    .uuid({ message: "professional_id deve ser um UUID válido." }),
  service_id: z
    .string()
    .uuid({ message: "service_id deve ser um UUID válido." }),
  scheduled_at: z
    .string()
    .datetime({
      message: "scheduled_at deve ser uma data ISO8601 válida.",
      offset: true,
    }),
  client_name: z
    .string()
    .trim()
    .min(2, { message: "client_name deve ter pelo menos 2 caracteres." }),
  client_phone: BrazilianPhoneSchema,
});

export type AppointmentCreate = z.infer<typeof AppointmentCreateSchema>;

/**
 * Validates the rescheduling of an existing appointment.
 */
export const RescheduleRequestSchema = z.object({
  new_scheduled_at: z
    .string()
    .datetime({
      message: "new_scheduled_at deve ser uma data ISO8601 válida.",
      offset: true,
    }),
});

export type RescheduleRequest = z.infer<typeof RescheduleRequestSchema>;

/**
 * Validates the creation of a blocked time slot.
 */
export const BlockedSlotCreateSchema = z
  .object({
    starts_at: z
      .string()
      .datetime({
        message: "starts_at deve ser uma data ISO8601 válida.",
        offset: true,
      }),
    ends_at: z
      .string()
      .datetime({
        message: "ends_at deve ser uma data ISO8601 válida.",
        offset: true,
      }),
    reason: z.string().optional(),
  })
  .refine(
    (data: { starts_at: string; ends_at: string; reason?: string }) =>
      new Date(data.ends_at) > new Date(data.starts_at),
    {
      message: "ends_at deve ser posterior a starts_at.",
      path: ["ends_at"],
    },
  );

export type BlockedSlotCreate = z.infer<typeof BlockedSlotCreateSchema>;

/**
 * Validates the creation of a new service.
 */
export const ServiceCreateSchema = z.object({
  name: z
    .string()
    .min(2, { message: "O nome do serviço deve ter pelo menos 2 caracteres." }),
  duration_minutes: z
    .number()
    .int()
    .positive({ message: "A duração deve ser um número inteiro positivo." }),
  price_cents: z
    .number()
    .int()
    .nonnegative({ message: "O preço deve ser um valor não negativo." })
    .optional(),
  description: z.string().optional(),
});

export type ServiceCreate = z.infer<typeof ServiceCreateSchema>;

/**
 * Validates the update of an existing service.
 */
export const ServiceUpdateSchema = z.object({
  name: z.string().min(2).optional(),
  duration_minutes: z.number().int().positive().optional(),
  price_cents: z.number().int().nonnegative().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
});

export type ServiceUpdate = z.infer<typeof ServiceUpdateSchema>;

/**
 * Validates a recurring availability rule.
 */
export const AvailabilityRuleSchema = z
  .object({
    day_of_week: z
      .number()
      .int()
      .min(0)
      .max(6, {
        message: "day_of_week deve estar entre 0 (Domingo) e 6 (Sábado).",
      }),
    start_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: "start_time deve estar no formato HH:mm.",
      }),
    end_time: z
      .string()
      .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, {
        message: "end_time deve estar no formato HH:mm.",
      }),
    remove: z.boolean().optional(),
  })
  .refine(
    (data: { start_time: string; end_time: string }) => {
      const [startH, startM] = data.start_time.split(":").map(Number);
      const [endH, endM] = data.end_time.split(":").map(Number);
      return endH > startH || (endH === startH && endM > startM);
    },
    {
      message: "end_time deve ser posterior a start_time.",
      path: ["end_time"],
    },
  );

export type AvailabilityRule = z.infer<typeof AvailabilityRuleSchema>;

/**
 * Validates the update of a professional's profile.
 */
export const ProfessionalUpdateSchema = z.object({
  display_name: z
    .string()
    .trim()
    .min(2)
    .max(50, {
      message: "O nome de exibição deve ter entre 2 e 50 caracteres.",
    })
    .optional(),
  full_name: z.string().trim().optional(),
  bio: z
    .string()
    .max(500, { message: "A bio deve ter no máximo 500 caracteres." })
    .optional(),
  avatar_url: z
    .string()
    .url({ message: "A URL do avatar deve ser válida." })
    .optional()
    .or(z.literal("")),
  timezone: z.string().default("America/Sao_Paulo"),
  slot_interval_minutes: z
    .union([z.literal(15), z.literal(30), z.literal(60)])
    .optional(),
  minimum_booking_notice_minutes: z
    .number()
    .int()
    .nonnegative({
      message: "O aviso mínimo de reserva deve ser um valor não negativo.",
    })
    .optional(),
  business_type: z.enum(BUSINESS_SEGMENTS).optional(),
  phone: BrazilianPhoneSchema.optional(),
});

export type ProfessionalUpdate = z.infer<typeof ProfessionalUpdateSchema>;
