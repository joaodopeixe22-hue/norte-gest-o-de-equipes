import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Compass, LogOut, UserRound } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { ROLE_LABEL, useMe } from "@/modules/auth/useMe";
import { NAV } from "./nav";
import { UserAvatar } from "./UserAvatar";

export function AppSidebar() {
  const me = useMe();
  const { setOpenMobile } = useSidebar();
  const navigate = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });
  if (!me) return null;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex h-10 items-center gap-2 px-1.5">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Compass className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="truncate text-[0.95rem] font-bold tracking-tight group-data-[collapsible=icon]:hidden">
            Norte
          </span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {NAV.filter((n) => n.visible(me)).map((item) => {
                const active = path === item.to || path.startsWith(item.to + "/");
                return (
                  <SidebarMenuItem key={item.to}>
                    <SidebarMenuButton asChild isActive={active} tooltip={item.title}>
                      <Link to={item.to} onClick={() => setOpenMobile(false)}>
                        <item.icon strokeWidth={1.75} aria-hidden />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton size="lg" tooltip={me.full_name} className="data-[state=open]:bg-sidebar-accent">
              <UserAvatar name={me.full_name} url={me.avatar_url} className="size-7" />
              <span className="flex min-w-0 flex-col text-left leading-tight">
                <span className="truncate text-sm font-semibold">{me.full_name || me.matricula}</span>
                <span className="truncate text-xs text-muted-foreground">{ROLE_LABEL[me.role]}</span>
              </span>
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="text-sm font-semibold">{me.full_name}</div>
              <div className="text-xs text-muted-foreground">Matrícula {me.matricula}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link to="/perfil">
                <UserRound strokeWidth={1.75} /> Meu perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={signOut}>
              <LogOut strokeWidth={1.75} /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
