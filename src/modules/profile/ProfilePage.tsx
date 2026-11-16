import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { toastError } from "@/lib/errors";
import { matriculaToEmail, passwordSchema } from "@/modules/auth/matricula";
import { ROLE_LABEL, useMe } from "@/modules/auth/useMe";
import { Field } from "@/modules/shell/Field";
import { PageHeader, Section } from "@/modules/shell/PageHeader";
import { UserAvatar } from "@/modules/shell/UserAvatar";

const MAX_AVATAR_BYTES = 2 * 1024 * 1024;
const AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function ProfilePage() {
  const me = useMe()!;
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [nameError, setNameError] = useState<string | undefined>();
  const [passErrors, setPassErrors] = useState<Record<string, string>>({});

  async function onAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = AVATAR_TYPES[file.type];
    if (!ext) {
      toast.error("Use uma imagem JPG, PNG ou WebP.");
      return;
    }
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("A imagem precisa ter no máximo 2 MB.");
      return;
    }
    setUploading(true);
    try {
      // A pasta com o próprio id é a única em que o banco deixa a pessoa gravar.
      const path = `${me.id}/avatar-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("avatars").getPublicUrl(path);
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: data.publicUrl })
        .eq("id", me.id);
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["ranking"] });
      toast.success("Foto atualizada.");
    } catch (err) {
      toastError(err);
    } finally {
      setUploading(false);
    }
  }

  async function onName(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const full_name = String(new FormData(e.currentTarget).get("full_name") ?? "").trim();
    if (full_name.length < 2) {
      setNameError("Informe seu nome.");
      return;
    }
    setNameError(undefined);
    setSavingName(true);
    const { error } = await supabase.from("profiles").update({ full_name }).eq("id", me.id);
    setSavingName(false);
    if (error) {
      toastError(error);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["me"] });
    qc.invalidateQueries({ queryKey: ["ranking"] });
    toast.success("Nome atualizado.");
  }

  async function onPassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const current = String(fd.get("current") ?? "");
    const next = String(fd.get("next") ?? "");
    const confirm = String(fd.get("confirm") ?? "");
    const errs: Record<string, string> = {};
    if (!current) errs["current"] = "Informe a senha atual.";
    const parsed = passwordSchema.safeParse(next);
    if (!parsed.success) errs["next"] = parsed.error.issues[0]?.message ?? "Senha inválida.";
    else if (next === current) errs["next"] = "A nova senha precisa ser diferente da atual.";
    if (next !== confirm) errs["confirm"] = "As senhas não conferem.";
    setPassErrors(errs);
    if (Object.keys(errs).length) return;
    setSavingPass(true);
    try {
      // Confere a senha atual antes de trocar: evita troca por alguém com o aparelho destravado.
      const { error: authErr } = await supabase.auth.signInWithPassword({
        email: matriculaToEmail(me.matricula),
        password: current,
      });
      if (authErr) {
        setPassErrors({ current: "Senha atual incorreta." });
        return;
      }
      const { error } = await supabase.auth.updateUser({
        password: next,
        current_password: current,
      });
      if (error) throw error;
      form.reset();
      toast.success("Senha alterada.");
    } catch (err) {
      toastError(err);
    } finally {
      setSavingPass(false);
    }
  }

  return (
    <div className="fade-up max-w-2xl">
      <PageHeader
        crumbs={[{ label: "Home", to: "/inicio" }, { label: "Meu perfil" }]}
        title="Meu perfil"
      />

      <div className="space-y-10">
        <Section
          title="Identificação"
          description={`Matrícula ${me.matricula} · ${ROLE_LABEL[me.role]}`}
        >
          <div className="flex flex-wrap items-center gap-5 py-3">
            <UserAvatar
              name={me.full_name || me.matricula}
              url={me.avatar_url}
              className="size-16 text-base"
            />
            <div>
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="sr-only"
                onChange={onAvatar}
                aria-label="Escolher foto"
                tabIndex={-1}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="animate-spin" /> : <Camera strokeWidth={1.75} />}{" "}
                Trocar foto
              </Button>
              <p className="mt-1.5 text-xs text-muted-foreground">
                JPG, PNG ou WebP, até 2 MB. A foto aparece no ranking.
              </p>
            </div>
          </div>
          <form onSubmit={onName} noValidate className="flex flex-wrap items-end gap-3 py-2">
            <div className="min-w-56 flex-1">
              <Field id="p-name" label="Nome completo" error={nameError}>
                <Input
                  id="p-name"
                  name="full_name"
                  defaultValue={me.full_name}
                  autoComplete="name"
                  maxLength={80}
                />
              </Field>
            </div>
            <Button type="submit" variant="outline" disabled={savingName}>
              {savingName && <Loader2 className="animate-spin" />} Salvar nome
            </Button>
          </form>
          <p className="pt-1 text-xs text-muted-foreground">
            Equipe, matrícula e papel só o administrador altera.
          </p>
        </Section>

        <Section title="Senha" description="Troque a senha inicial por uma que só você saiba.">
          <form onSubmit={onPassword} noValidate className="max-w-sm space-y-4 py-3">
            <Field id="p-current" label="Senha atual" error={passErrors["current"]}>
              <Input
                id="p-current"
                name="current"
                type="password"
                autoComplete="current-password"
              />
            </Field>
            <Field
              id="p-next"
              label="Nova senha"
              error={passErrors["next"]}
              hint="Mínimo de 8 caracteres."
            >
              <Input id="p-next" name="next" type="password" autoComplete="new-password" />
            </Field>
            <Field id="p-confirm" label="Confirmar nova senha" error={passErrors["confirm"]}>
              <Input id="p-confirm" name="confirm" type="password" autoComplete="new-password" />
            </Field>
            <Button type="submit" disabled={savingPass}>
              {savingPass && <Loader2 className="animate-spin" />} Alterar senha
            </Button>
          </form>
        </Section>
      </div>
    </div>
  );
}
