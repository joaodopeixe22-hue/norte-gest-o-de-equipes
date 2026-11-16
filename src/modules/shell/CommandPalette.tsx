import { useNavigate } from "@tanstack/react-router";
import { CalendarDays, ClipboardList, ListPlus, NotebookPen, PenLine } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import { useMe } from "@/modules/auth/useMe";
import { NAV } from "./nav";
import type { UiActions } from "./ui-actions";

export function CommandPalette({
  open,
  onOpenChange,
  actions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  actions: UiActions;
}) {
  const me = useMe();
  const navigate = useNavigate();
  const run = (fn: () => void) => {
    onOpenChange(false);
    setTimeout(fn, 50);
  };
  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Buscar páginas e ações…" />
      <CommandList>
        <CommandEmpty>Nada encontrado.</CommandEmpty>
        <CommandGroup heading="Ações rápidas">
          <CommandItem onSelect={() => run(actions.openRegisterKpi)}>
            <PenLine strokeWidth={1.75} /> Registrar indicadores
          </CommandItem>
          <CommandItem onSelect={() => run(actions.openNewTask)}>
            <ListPlus strokeWidth={1.75} /> Nova tarefa
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ to: "/workspace" }))}>
            <NotebookPen strokeWidth={1.75} /> Nova anotação
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ to: "/formularios" }))}>
            <ClipboardList strokeWidth={1.75} /> Abrir formulários
          </CommandItem>
          <CommandItem onSelect={() => run(() => navigate({ to: "/agenda" }))}>
            <CalendarDays strokeWidth={1.75} /> Abrir calendário
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Ir para">
          {me &&
            NAV.filter((n) => n.visible(me)).map((n) => (
              <CommandItem key={n.to} onSelect={() => run(() => navigate({ to: n.to }))}>
                <n.icon strokeWidth={1.75} /> {n.title}
              </CommandItem>
            ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
