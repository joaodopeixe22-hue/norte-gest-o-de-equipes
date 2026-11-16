import {
  Home,
  BarChart3,
  ClipboardList,
  NotebookPen,
  CalendarCheck2,
  Users,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import type { Me } from "@/modules/auth/useMe";

export interface NavItem {
  title: string;
  to: "/inicio" | "/performance" | "/formularios" | "/workspace" | "/agenda" | "/equipes" | "/admin";
  icon: LucideIcon;
  visible: (me: Me) => boolean;
}

export const NAV: NavItem[] = [
  { title: "Home", to: "/inicio", icon: Home, visible: () => true },
  { title: "Performance", to: "/performance", icon: BarChart3, visible: () => true },
  { title: "Formulários", to: "/formularios", icon: ClipboardList, visible: () => true },
  { title: "Meu Workspace", to: "/workspace", icon: NotebookPen, visible: () => true },
  { title: "Agenda e tarefas", to: "/agenda", icon: CalendarCheck2, visible: () => true },
  { title: "Equipes", to: "/equipes", icon: Users, visible: (me) => me.isManager },
  { title: "Administração", to: "/admin", icon: Settings2, visible: (me) => me.isAdmin },
];
