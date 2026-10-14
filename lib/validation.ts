import { z } from "zod";

export const slugSchema = z.string().regex(/^[a-z0-9-]{3,60}$/);
export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

/** Normaliza para 55 + DDD + número. Retorna null se inválido. */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!/^55[1-9][0-9][0-9]{8,9}$/.test(digits)) return null;
  return digits;
}

export const bookSchema = z.object({
  slug: slugSchema,
  serviceId: z.string().uuid(),
  date: dateSchema,
  startTime: timeSchema,
  name: z.string().trim().min(3).max(100),
  whatsapp: z
    .string()
    .max(30)
    .transform((v, ctx) => {
      const n = normalizeWhatsapp(v);
      if (!n) {
        ctx.addIssue({ code: "custom", message: "WhatsApp inválido" });
        return z.NEVER;
      }
      return n;
    }),
  consent: z.literal(true),
  website: z.string().max(200).optional(),
});

export const slotsQuerySchema = z.object({
  slug: slugSchema,
  serviceId: z.string().uuid(),
  date: dateSchema,
});
