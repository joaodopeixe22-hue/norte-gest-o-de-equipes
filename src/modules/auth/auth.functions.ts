import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { matriculaSchema, matriculaToEmail, passwordSchema } from "./matricula";

async function adminCount() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("user_roles")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin");
  if (error) throw new Error("Não foi possível verificar a configuração.");
  return count ?? 0;
}

/** Public: tells the login screen whether first-time setup is still open. Returns only a boolean. */
export const needsBootstrap = createServerFn({ method: "GET" }).handler(async () => {
  return { needed: (await adminCount()) === 0 };
});

const bootstrapSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome.").max(80),
  matricula: matriculaSchema,
  password: passwordSchema,
});

/** Public, but only works while no admin exists; afterwards it always refuses. */
export const bootstrapAdmin = createServerFn({ method: "POST" })
  .inputValidator((d) => bootstrapSchema.parse(d))
  .handler(async ({ data }) => {
    if ((await adminCount()) > 0) throw new Error("O Norte já foi configurado.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const matricula = data.matricula.toLowerCase();
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: matriculaToEmail(matricula),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, matricula },
    });
    if (error || !created.user) throw new Error(error?.message ?? "Não foi possível criar o administrador.");
    const uid = created.user.id;
    // Re-check to close the race between two simultaneous setups.
    if ((await adminCount()) > 0) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error("O Norte já foi configurado.");
    }
    const { error: rErr } = await supabaseAdmin.from("user_roles").insert({ user_id: uid, role: "admin" });
    if (rErr) {
      await supabaseAdmin.auth.admin.deleteUser(uid);
      throw new Error("Não foi possível concluir a configuração.");
    }
    return { ok: true };
  });
