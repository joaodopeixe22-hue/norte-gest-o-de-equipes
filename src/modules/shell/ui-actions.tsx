import { createContext, useContext } from "react";

export interface UiActions {
  openRegisterKpi: () => void;
  openNewTask: () => void;
  openNewEvent: () => void;
  openCommand: () => void;
}

export const UiActionsContext = createContext<UiActions | null>(null);

export function useUiActions(): UiActions {
  const ctx = useContext(UiActionsContext);
  if (!ctx) throw new Error("useUiActions fora do AppShell");
  return ctx;
}
