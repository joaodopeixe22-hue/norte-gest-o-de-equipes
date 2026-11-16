import { z } from "zod";

export const matriculaSchema = z
  .string()
  .trim()
  .min(2, "Informe a matrícula.")
  .max(32, "Matrícula muito longa.")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado.");

export const passwordSchema = z.string().min(8, "A senha precisa ter pelo menos 8 caracteres.").max(72);

/** Matrícula is the credential; auth uses a synthetic, deterministic e-mail. */
export function matriculaToEmail(matricula: string): string {
  return `${matricula.trim().toLowerCase()}@norte.app`;
}
