import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  compact,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <div className={`flex flex-col items-center text-center ${compact ? "py-6" : "py-14"}`}>
      <span className="mb-3 flex size-10 items-center justify-center rounded-full bg-primary-soft text-primary">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <p className="text-sm font-semibold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function UnderConstruction({ icon, items }: { icon: LucideIcon; items: string }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-surface">
      <EmptyState
        icon={icon}
        title="Em construção nesta etapa"
        description={`Chega em breve: ${items}. Nenhum dado é exibido aqui até o módulo estar pronto.`}
      />
    </div>
  );
}
