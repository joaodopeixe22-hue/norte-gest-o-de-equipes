import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { z } from "zod";
import { Compass, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { bootstrapAdmin, needsBootstrap } from "@/modules/auth/auth.functions";
import { matriculaSchema, matriculaToEmail, passwordSchema } from "@/modules/auth/matricula";
import { errorMessage } from "@/lib/errors";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({ inativo: typeof s.inativo === "string" ? s.inativo : undefined }),
  head: () => ({
    meta: [
      { title: "Entrar — Norte" },
      { name: "description", content: "Acesse o Norte com sua matrícula e senha." },
      { property: "og:title", content: "Entrar — Norte" },
      { property: "og:description", content: "Acesse o Norte com sua matrícula e senha." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const loginSchema = z.object({ matricula: matriculaSchema, password: z.string().min(1, "Informe a senha.") });

function AuthPage() {
  const { inativo } = Route.useSearch();
  const check = useServerFn(needsBootstrap);
  const bootstrap = useQuery({ queryKey: ["needs-bootstrap"], queryFn: () => check(), staleTime: 0 });

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-sm fade-up">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Compass className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="text-lg font-bold tracking-tight">Norte</span>
        </div>
        {inativo && (
          <p role="alert" className="mb-6 rounded-lg border border-destructive/30 bg-destructive-soft px-3 py-2 text-sm text-destructive">
            Seu acesso está desativado. Fale com o administrador.
          </p>
        )}
        {bootstrap.isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : bootstrap.data?.needed ? (
          <BootstrapForm onDone={() => bootstrap.refetch()} />
        ) : (
          <LoginForm />
        )}
      </div>
    </main>
  );
}

function LoginForm() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ matricula: fd.get("matricula"), password: fd.get("password") });
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: matriculaToEmail(parsed.data.matricula),
      password: parsed.data.password,
    });
    setBusy(false);
    if (error) {
      toast.error(errorMessage(error));
      return;
    }
    navigate({ to: "/inicio" });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-bold">Entrar</h1>
        <p className="mt-1 text-sm text-muted-foreground">Use sua matrícula e senha.</p>
      </div>
      <Field id="matricula" label="Matrícula" error={errors.matricula}>
        <Input id="matricula" name="matricula" autoComplete="username" autoFocus inputMode="text" />
      </Field>
      <Field id="password" label="Senha" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden />} Entrar
      </Button>
      <p className="text-xs text-muted-foreground">Esqueceu a senha? Peça ao administrador para redefinir.</p>
    </form>
  );
}

const bootstrapSchema = z
  .object({
    full_name: z.string().trim().min(2, "Informe seu nome."),
    matricula: matriculaSchema,
    password: passwordSchema,
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, { path: ["confirm"], message: "As senhas não conferem." });

function BootstrapForm({ onDone }: { onDone: () => void }) {
  const run = useServerFn(bootstrapAdmin);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const navigate = useNavigate();

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = bootstrapSchema.safeParse(Object.fromEntries(fd));
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path[0], i.message])));
      return;
    }
    setErrors({});
    setBusy(true);
    try {
      const { confirm: _c, ...payload } = parsed.data;
      await run({ data: payload });
      const { error } = await supabase.auth.signInWithPassword({
        email: matriculaToEmail(payload.matricula),
        password: payload.password,
      });
      if (error) throw error;
      toast.success("Norte configurado. Bem-vindo!");
      navigate({ to: "/admin" });
    } catch (err) {
      toast.error(errorMessage(err));
      onDone();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <div>
        <h1 className="text-2xl font-bold">Configurar o Norte</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Primeiro acesso: crie a conta de administrador. Depois disso, esta tela deixa de existir.
        </p>
      </div>
      <Field id="full_name" label="Nome completo" error={errors.full_name}>
        <Input id="full_name" name="full_name" autoComplete="name" autoFocus />
      </Field>
      <Field id="matricula" label="Matrícula" error={errors.matricula}>
        <Input id="matricula" name="matricula" autoComplete="username" />
      </Field>
      <Field id="password" label="Senha (mín. 8 caracteres)" error={errors.password}>
        <Input id="password" name="password" type="password" autoComplete="new-password" />
      </Field>
      <Field id="confirm" label="Confirmar senha" error={errors.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" />
      </Field>
      <Button type="submit" className="w-full" size="lg" disabled={busy}>
        {busy && <Loader2 className="animate-spin" aria-hidden />} Criar administrador
      </Button>
    </form>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
