import { Link, useRouterState } from "@tanstack/react-router";
import {
  BarChart3,
  CalendarCheck2,
  Home,
  Menu,
  PenLine,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useSidebar } from "@/components/ui/sidebar";
import { todaySP } from "@/lib/dates";
import { useMe } from "@/modules/auth/useMe";
import { useDaySummary } from "@/modules/home/hooks";
import { useUiActions } from "./ui-actions";

type Tab = {
  to: "/inicio" | "/agenda" | "/performance" | "/equipes";
  label: string;
  icon: LucideIcon;
  badge?: number;
};

/**
 * Navegação do celular: o que se usa todo dia fica ao alcance do polegar,
 * com "Registrar" no centro. O resto do menu abre em "Mais".
 */
export function MobileTabBar() {
  const me = useMe();
  const ui = useUiActions();
  const { setOpenMobile } = useSidebar();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const summary = useDaySummary(todaySP());
  if (!me) return null;

  const pending = me.isManager ? (summary.data?.pending_approvals ?? 0) : 0;
  const left: Tab[] = [
    { to: "/inicio", label: "Home", icon: Home },
    { to: "/agenda", label: "Agenda", icon: CalendarCheck2 },
  ];
  // Quem gerencia equipe usa a fila de aprovação todo dia; os demais, a própria evolução.
  const right: Tab = me.isManager
    ? { to: "/equipes", label: "Equipes", icon: Users, badge: pending }
    : { to: "/performance", label: "Evolução", icon: BarChart3 };
  const isActive = (to: string) => path === to || path.startsWith(to + "/");
  const inBar = [...left, right].some((t) => isActive(t.to));

  const item =
    "relative flex h-full min-w-0 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150";
  const renderTab = (t: Tab) => (
    <Link
      key={t.to}
      to={t.to}
      aria-current={isActive(t.to) ? "page" : undefined}
      className={`${item} ${isActive(t.to) ? "text-primary" : "text-muted-foreground"}`}
    >
      <span className="relative">
        <t.icon className="size-[22px]" strokeWidth={isActive(t.to) ? 2.1 : 1.75} aria-hidden />
        {!!t.badge && (
          <span className="num absolute -right-2.5 -top-1.5 flex min-w-4 items-center justify-center rounded-full bg-warning px-1 text-[10px] font-bold leading-4 text-white">
            {t.badge > 9 ? "9+" : t.badge}
            <span className="sr-only"> registros aguardando aprovação</span>
          </span>
        )}
      </span>
      <span className="truncate">{t.label}</span>
    </Link>
  );

  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <div className="mx-auto grid h-16 max-w-md grid-cols-5 items-stretch px-1">
        {left.map(renderTab)}
        <button type="button" onClick={ui.openRegisterKpi} className={`${item} text-foreground`}>
          <span className="-mt-6 flex size-[52px] items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-background transition-transform duration-150 active:scale-95">
            <PenLine className="size-[22px]" strokeWidth={2} aria-hidden />
          </span>
          <span>Registrar</span>
        </button>
        {renderTab(right)}
        <button
          type="button"
          onClick={() => setOpenMobile(true)}
          aria-label="Mais opções do menu"
          className={`${item} ${inBar ? "text-muted-foreground" : "text-primary"}`}
        >
          <Menu className="size-[22px]" strokeWidth={inBar ? 1.75 : 2.1} aria-hidden />
          <span>Mais</span>
        </button>
      </div>
    </nav>
  );
}
