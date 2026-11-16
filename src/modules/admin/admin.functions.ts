import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { matriculaSchema, matriculaToEmail, passwordSchema } from "@/modules/auth/matricula";

/**
 * Gestão de usuários. Tudo aqui roda no servidor com a service role e SEMPRE confere,
 * no banco, se quem chamou é um administrador ativo. A interface não é barreira.
 */

const roleSchema = z.enum(["admin", "gerente", "colaborador"]);
const BAN_FOREVER = "876000h"; // ~100 anos: bloqueia login e renovação de sessão

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

async function assertAdmin(userId: string) {
  const db = await admin();
  const [{ data: role }, { data: profile }] = await Promise.all([
    db.from("user_roles").select("id").eq("user_id", userId).eq("role", "admin").maybeSingle(),
    db.from("profiles").select("is_active").eq("id", userId).maybeSingle(),
  ]);
  if (!role || !profile?.is_active) throw new Error("Apenas administradores podem fazer isso.");
}

/** Quantos administradores ativos existem além da pessoa informada. */
async function otherActiveAdmins(exceptUserId: string) {
  const db = await admin();
  const { data: roles, error } = await db
    .from("user_roles")
    .select("user_id")
    .eq("role", "admin")
    .neq("user_id", exceptUserId);
  if (error) throw new Error("Não foi possível verificar os administradores.");
  const ids = (roles ?? []).map((r) => r.user_id);
  if (!ids.length) return 0;
  const { count } = await db
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .in("id", ids)
    .eq("is_active", true);
  return count ?? 0;
}

async function isAdminUser(userId: string) {
  const db = await admin();
  const { data } = await db
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

const createSchema = z.object({
  full_name: z.string().trim().min(2, "Informe o nome.").max(80),
  matricula: matriculaSchema,
  password: passwordSchema,
  role: roleSchema,
  team_id: z.string().uuid().nullable(),
});

export const adminCreateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => createSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const db = await admin();
    const matricula = data.matricula.toLowerCase();
    const { data: created, error } = await db.auth.admin.createUser({
      email: matriculaToEmail(matricula),
      password: data.password,
      email_confirm: true,
      user_metadata: { full_name: data.full_name, matricula },
    });
    if (error || !created.user) {
      if (/already|registered|exists/i.test(error?.message ?? ""))
        throw new Error("Já existe um usuário com essa matrícula.");
      throw new Error(error?.message ?? "Não foi possível criar o usuário.");
    }
    const uid = created.user.id;
    // O perfil nasce pelo gatilho do banco; aqui só completamos equipe e papel.
    const { error: pErr } = await db
      .from("profiles")
      .update({ full_name: data.full_name, team_id: data.team_id })
      .eq("id", uid);
    const { error: rErr } = pErr
      ? { error: pErr }
      : await db.from("user_roles").insert({ user_id: uid, role: data.role });
    if (pErr || rErr) {
      await db.auth.admin.deleteUser(uid);
      throw new Error("Não foi possível concluir o cadastro. Nada foi criado.");
    }
    return { id: uid };
  });

const updateSchema = z.object({
  user_id: z.string().uuid(),
  full_name: z.string().trim().min(2, "Informe o nome.").max(80),
  role: roleSchema,
  team_id: z.string().uuid().nullable(),
});

export const adminUpdateUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => updateSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const db = await admin();
    if (data.role !== "admin" && (await isAdminUser(data.user_id))) {
      if (data.user_id === context.userId)
        throw new Error("Você não pode tirar o próprio papel de administrador.");
      if ((await otherActiveAdmins(data.user_id)) === 0)
        throw new Error("O Norte precisa de pelo menos um administrador ativo.");
    }
    const { error: pErr } = await db
      .from("profiles")
      .update({ full_name: data.full_name, team_id: data.team_id })
      .eq("id", data.user_id);
    if (pErr) throw new Error("Não foi possível salvar o usuário.");

    const { data: current } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user_id);
    const has = (current ?? []).map((r) => r.role);
    if (has.length !== 1 || has[0] !== data.role) {
      // Grava o novo papel antes de remover os antigos: a pessoa nunca fica sem papel.
      if (!has.includes(data.role)) {
        const { error } = await db
          .from("user_roles")
          .insert({ user_id: data.user_id, role: data.role });
        if (error) throw new Error("Não foi possível alterar o papel.");
      }
      const { error } = await db
        .from("user_roles")
        .delete()
        .eq("user_id", data.user_id)
        .neq("role", data.role);
      if (error) throw new Error("Não foi possível alterar o papel.");
    }
    // Quem deixa de ser gestor deixa de responder por equipes.
    if (data.role === "colaborador")
      await db.from("teams").update({ manager_id: null }).eq("manager_id", data.user_id);
    return { ok: true };
  });

const activeSchema = z.object({ user_id: z.string().uuid(), active: z.boolean() });

export const adminSetActive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => activeSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const db = await admin();
    if (!data.active) {
      if (data.user_id === context.userId) throw new Error("Você não pode desativar a si mesmo.");
      if ((await isAdminUser(data.user_id)) && (await otherActiveAdmins(data.user_id)) === 0)
        throw new Error("O Norte precisa de pelo menos um administrador ativo.");
    }
    // Bloqueio de verdade: o banimento no Auth impede login e renovação de sessão.
    const { error: aErr } = await db.auth.admin.updateUserById(data.user_id, {
      ban_duration: data.active ? "none" : BAN_FOREVER,
    });
    if (aErr) throw new Error("Não foi possível alterar o acesso.");
    const { error } = await db
      .from("profiles")
      .update({ is_active: data.active })
      .eq("id", data.user_id);
    if (error)
      throw new Error("O acesso foi alterado, mas o cadastro não atualizou. Tente de novo.");
    return { ok: true };
  });

const passwordResetSchema = z.object({ user_id: z.string().uuid(), password: passwordSchema });

export const adminResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => passwordResetSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const db = await admin();
    const { error } = await db.auth.admin.updateUserById(data.user_id, { password: data.password });
    if (error)
      throw new Error(
        /pwned|weak|known/i.test(error.message)
          ? "Essa senha é muito comum. Escolha outra."
          : "Não foi possível redefinir a senha.",
      );
    return { ok: true };
  });
