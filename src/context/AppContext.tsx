import React, { createContext, useContext, useState, useCallback } from "react";
import type { PaginaActiva, DrawerState, FormPrefill, Notificacion, TipoNotificacion } from "@/types";
import { notificaciones as notificacionesIniciales, persistirDatos } from "@/data/mockData";

export interface RegistrosNavFiltro {
  estadoFlujo?: string;
  soloAbiertos?: boolean;
  soloCerrados?: boolean;
  soloVencidos?: boolean;
  soloMios?: boolean;
  soloEscaladosAMi?: boolean;
  etiqueta?: string;
}

interface AppContextType {
  paginaActiva: PaginaActiva;
  setPaginaActiva: (p: PaginaActiva) => void;
  drawer: DrawerState;
  abrirRegistro: (id: string) => void;
  abrirPersona: (id: string) => void;
  abrirVehiculo: (id: string) => void;
  abrirGuia: (numero: string) => void;
  abrirTerminal: (nombre: string) => void;
  abrirResolucionAcumulativa: (alertaId: string) => void;
  cerrarDrawer: () => void;
  nuevaRegistroAbierto: boolean;
  setNuevaRegistroAbierto: (v: boolean) => void;
  busquedaQuery: string;
  setBusquedaQuery: (q: string) => void;
  formPrefill: FormPrefill | null;
  setFormPrefill: (p: FormPrefill | null) => void;
  notificacionesState: Notificacion[];
  setNotificacionesState: React.Dispatch<React.SetStateAction<Notificacion[]>>;
  agregarNotificacion: (tipo: TipoNotificacion, texto: string, linkRegistroId?: string) => void;
  registrosNavFiltro: RegistrosNavFiltro | null;
  setRegistrosNavFiltro: (f: RegistrosNavFiltro | null) => void;
  irARegistros: (filtro: RegistrosNavFiltro) => void;
  dataVersion: number;
  bumpData: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [paginaActiva, setPaginaActiva] = useState<PaginaActiva>("inicio");
  const [drawer, setDrawer] = useState<DrawerState>({ tipo: null, id: null });
  const [nuevaRegistroAbierto, setNuevaRegistroAbierto] = useState(false);
  const [busquedaQuery, setBusquedaQuery] = useState("");
  const [formPrefill, setFormPrefill] = useState<FormPrefill | null>(null);
  const [notificacionesState, setNotificacionesState] = useState<Notificacion[]>(notificacionesIniciales);
  const [registrosNavFiltro, setRegistrosNavFiltro] = useState<RegistrosNavFiltro | null>(null);
  const [dataVersion, setDataVersion] = useState(0);
  const bumpData = useCallback(() => { setDataVersion(v => v + 1); persistirDatos(); }, []);

  const irARegistros = useCallback((filtro: RegistrosNavFiltro) => {
    setRegistrosNavFiltro(filtro);
    setPaginaActiva("registros");
  }, []);

  const agregarNotificacion = useCallback((tipo: TipoNotificacion, texto: string, linkRegistroId?: string) => {
    setNotificacionesState(prev => [{
      id: `N-${Date.now()}`,
      tipo,
      texto,
      tiempo: "ahora",
      leida: false,
      linkRegistroId,
      linkTipo: linkRegistroId ? "registro" : undefined,
    }, ...prev]);
  }, []);

  const abrirRegistro = useCallback((id: string) => setDrawer({ tipo: "registro", id }), []);
  const abrirPersona = useCallback((id: string) => setDrawer({ tipo: "persona360", id }), []);
  const abrirVehiculo = useCallback((id: string) => setDrawer({ tipo: "vehiculo360", id }), []);
  const abrirGuia = useCallback((numero: string) => setDrawer({ tipo: "guia360", id: numero }), []);
  const abrirTerminal = useCallback((nombre: string) => setDrawer({ tipo: "terminal360", id: nombre }), []);
  const abrirResolucionAcumulativa = useCallback((alertaId: string) => setDrawer({ tipo: "resolucion_acumulativa", id: alertaId }), []);
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
        abrirTerminal,
        abrirResolucionAcumulativa,
        cerrarDrawer,
        nuevaRegistroAbierto,
        setNuevaRegistroAbierto,
        busquedaQuery,
        setBusquedaQuery,
        formPrefill,
        setFormPrefill,
        notificacionesState,
        setNotificacionesState,
        agregarNotificacion,
        registrosNavFiltro,
        setRegistrosNavFiltro,
        irARegistros,
        dataVersion,
        bumpData,
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
