import React, { createContext, useContext, useState } from "react";

interface SidebarContextType {
  expanded: boolean;
  toggleExpanded: () => void;
}

const SidebarContext = createContext<SidebarContextType | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [expanded, setExpanded] = useState(true);
  const toggleExpanded = () => setExpanded((v) => !v);
  return (
    <SidebarContext.Provider value={{ expanded, toggleExpanded }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarState() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebarState must be used within SidebarProvider");
  return ctx;
}
