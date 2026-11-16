import { toast } from "sonner";

const MAP: Array<[RegExp, string]> = [
  [/Invalid login credentials/i, "Matrícula ou senha incorretas."],
  [/banned|User is banned/i, "Seu acesso está desativado. Fale com o administrador."],
  [/Failed to fetch|NetworkError/i, "Sem conexão. Verifique sua internet e tente novamente."],
  [/duplicate key.*matricula/i, "Já existe um usuário com essa matrícula."],
  [/duplicate key.*teams_name/i, "Já existe uma equipe com esse nome."],
  [/row-level security|permission denied/i, "Você não tem permissão para fazer isso."],
  [/Password should be at least/i, "A senha precisa ter pelo menos 8 caracteres."],
  [/pwned|weak|known to be/i, "Essa senha é muito comum. Escolha outra."],
  [/current password|Current password required/i, "Senha atual incorreta."],
];

export function errorMessage(err: unknown): string {
  const raw =
    err && typeof err === "object" && "message" in err ? String((err as { message: unknown }).message) : String(err ?? "");
  for (const [re, msg] of MAP) if (re.test(raw)) return msg;
  // Server-side messages from our RPCs are already in Portuguese.
  if (/[ãçéíóúâêô]/i.test(raw) && raw.length < 200) return raw;
  return "Algo deu errado. Tente novamente.";
}

export function toastError(err: unknown) {
  toast.error(errorMessage(err));
}
