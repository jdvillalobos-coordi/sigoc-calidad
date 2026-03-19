import React, { createContext, useContext, useState, useCallback } from "react";
import type { PaginaActiva, DrawerState } from "@/types";

interface AppContextType {
  paginaActiva: PaginaActiva;
  setPaginaActiva: (p: PaginaActiva) => void;
  drawer: DrawerState;
  abrirRegistro: (id: string) => void;
  abrirPersona: (id: string) => void;
  abrirVehiculo: (id: string) => void;
  abrirGuia: (numero: string) => void;
  cerrarDrawer: () => void;
  nuevaRegistroAbierto: boolean;
  setNuevaRegistroAbierto: (v: boolean) => void;
  busquedaQuery: string;
  setBusquedaQuery: (q: string) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [paginaActiva, setPaginaActiva] = useState<PaginaActiva>("inicio");
  const [drawer, setDrawer] = useState<DrawerState>({ tipo: null, id: null });
  const [nuevaRegistroAbierto, setNuevaRegistroAbierto] = useState(false);
  const [busquedaQuery, setBusquedaQuery] = useState("");

  const abrirRegistro = useCallback((id: string) => setDrawer({ tipo: "registro", id }), []);
  const abrirPersona = useCallback((id: string) => setDrawer({ tipo: "persona360", id }), []);
  const abrirVehiculo = useCallback((id: string) => setDrawer({ tipo: "vehiculo360", id }), []);
  const abrirGuia = useCallback((numero: string) => setDrawer({ tipo: "guia360", id: numero }), []);
  const cerrarDrawer = useCallback(() => setDrawer({ tipo: null, id: null }), []);

  return (
    <AppContext.Provider
      value={{
        paginaActiva,
        setPaginaActiva,
        drawer,
        abrirRegistro,
        abrirPersona,
        abrirVehiculo,
        abrirGuia,
        cerrarDrawer,
        nuevaRegistroAbierto,
        setNuevaRegistroAbierto,
        busquedaQuery,
        setBusquedaQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
