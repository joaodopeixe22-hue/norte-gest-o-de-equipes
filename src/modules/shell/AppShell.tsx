import { Link, Outlet } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Compass, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { CommandPalette } from "./CommandPalette";
import { MobileTabBar } from "./MobileTabBar";
import { NotificationsBell } from "./NotificationsBell";
import { UiActionsContext, type UiActions } from "./ui-actions";
import { RegisterKpiDialog } from "@/modules/kpi/RegisterKpiDialog";
import { TaskDialog } from "@/modules/tasks/TaskDialog";
import { EventDialog } from "@/modules/tasks/EventDialog";

function readSidebarCookie(): boolean {
  if (typeof document === "undefined") return true;
  const m = document.cookie.match(/(?:^|; )sidebar_state=(true|false)/);
  return m ? m[1] === "true" : true;
}

export function AppShell() {
  const [cmd, setCmd] = useState(false);
  const [kpi, setKpi] = useState(false);
  const [task, setTask] = useState(false);
  const [event, setEvent] = useState(false);
  const [defaultOpen] = useState(readSidebarCookie);

  const actions: UiActions = useMemo(
    () => ({
      openRegisterKpi: () => setKpi(true),
      openNewTask: () => setTask(true),
      openNewEvent: () => setEvent(true),
      openCommand: () => setCmd(true),
    }),
    [],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmd((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <UiActionsContext.Provider value={actions}>
      <SidebarProvider defaultOpen={defaultOpen}>
        <AppSidebar />
        <SidebarInset className="bg-background">
          <div className="sticky top-0 z-20 flex h-[calc(3.5rem+env(safe-area-inset-top))] items-center gap-2 border-b border-border bg-background/85 px-4 pt-[env(safe-area-inset-top)] backdrop-blur sm:px-5">
            <SidebarTrigger aria-label="Abrir ou recolher menu" className="max-md:hidden" />
            <Link to="/inicio" className="flex h-11 items-center gap-2 md:hidden" aria-label="Norte — ir para a Home">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Compass className="size-[18px]" strokeWidth={1.75} aria-hidden />
              </span>
              <span className="text-base font-bold tracking-tight">Norte</span>
            </Link>
            <button
              onClick={() => setCmd(true)}
              className="ml-1 flex h-9 w-full max-w-xs items-center gap-2 rounded-lg border border-border bg-surface px-3 text-sm text-muted-foreground transition-colors hover:border-input max-md:hidden"
            >
              <Search className="size-4" strokeWidth={1.75} aria-hidden />
              <span className="flex-1 text-left">Buscar ou agir…</span>
              <kbd className="hidden rounded border border-border bg-muted px-1.5 text-[10px] font-medium sm:inline">Ctrl K</kbd>
            </button>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Buscar ou agir" onClick={() => setCmd(true)}>
                <Search strokeWidth={1.75} />
              </Button>
              <NotificationsBell />
            </div>
          </div>
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-28 pt-6 sm:px-8 md:py-8">
            <Outlet />
          </main>
          <MobileTabBar />
        </SidebarInset>
      </SidebarProvider>
      <CommandPalette open={cmd} onOpenChange={setCmd} actions={actions} />
      <RegisterKpiDialog open={kpi} onOpenChange={setKpi} />
      <TaskDialog open={task} onOpenChange={setTask} />
      <EventDialog open={event} onOpenChange={setEvent} />
    </UiActionsContext.Provider>
  );
}

