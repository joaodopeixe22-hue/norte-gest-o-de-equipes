import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

export function PageHeader({
  crumbs,
  title,
  description,
  actions,
}: {
  crumbs: Crumb[];
  title: string;
  description?: string | undefined;
  actions?: React.ReactNode;
}) {
  // No celular a barra inferior já situa a pessoa; a trilha vira só um "voltar" nas páginas internas.
  const parent = crumbs.length > 2 ? crumbs[crumbs.length - 2] : undefined;
  return (
    <header className="mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {parent?.to && (
          <Link
            to={parent.to}
            className="-ml-1.5 mb-1 inline-flex h-10 items-center gap-0.5 pr-3 text-sm font-medium text-muted-foreground sm:hidden"
          >
            <ChevronLeft className="size-4" aria-hidden /> {parent.label}
          </Link>
        )}
        <nav aria-label="Trilha" className="mb-1.5 max-sm:hidden">
          <ol className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
            {crumbs.map((c, i) => (
              <li key={c.label} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="size-3" aria-hidden />}
                {c.to ? (
                  <Link to={c.to} className="rounded hover:text-foreground">
                    {c.label}
                  </Link>
                ) : (
                  <span aria-current={i === crumbs.length - 1 ? "page" : undefined}>{c.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 max-sm:[&>a]:flex-1 max-sm:[&>button]:flex-1">
          {actions}
        </div>
      )}
    </header>
  );
}

export function Section({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string | undefined;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string | undefined;
}) {
  return (
    <section className={className} aria-label={title}>
      <div className="mb-3 flex flex-wrap items-end justify-between gap-x-3 gap-y-2 border-b border-border pb-2.5">
        <div className="min-w-0">
          <h2 className="section-title">{title}</h2>
          {description && <p className="eyebrow mt-0.5">{description}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}
