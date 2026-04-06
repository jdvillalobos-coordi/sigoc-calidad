import React, { useState, useMemo, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { insumosRCE, insumosFaltantes, getGuia, PAISES_REGIONALES, REGIONALES_FLAT, TODAS_TERMINALES, usuarioLogueado, CAUSALES_LABELS, eventos } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, X, Filter, CalendarDays, Search } from "lucide-react";
import { EvidenciasPanel, evidenciasPendientesCount } from "./EvidenciasPage";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format, isBefore, startOfDay, isAfter, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";
import type { InsumoRCE, InsumoFaltante, CausalFaltante, EstadoRevisionInsumo } from "@/types";

type PageSize = 50 | 100 | "all";
const PAGE_SIZES: { value: PageSize; label: string }[] = [
  { value: 50,    label: "50" },
  { value: 100,   label: "100" },
  { value: "all", label: "Todo" },
];

type TabId = "rce" | "faltantes" | "evidencias";
type FiltroEstadoRevision = "todas" | EstadoRevisionInsumo;
type FiltroCausal = "todas" | "solo_sg" | CausalFaltante;

const CAUSALES_OPTIONS: { value: FiltroCausal; label: string }[] = [
  { value: "todas", label: "Todas las causales" },
  { value: "solo_sg", label: "Solo SG (100/101)" },
  { value: "2_solucion_no_ubicado_sin_100", label: "Sol. No Ubicado Sin 100" },
  { value: "3_causal_pendientes", label: "Causal Pendientes" },
  { value: "4_causal_100_sin_400_previo", label: "Causal 100 sin 400" },
  { value: "5_causal_100_solucion_despacho_no_ubicado", label: "Sol. Despacho No Ubicado" },
  { value: "7_solucion_notificar_y_sin_notificar", label: "Sol. Notificar y sin Notificar" },
  { value: "8_notificado", label: "Notificado" },
];

function CheckpointBadge({ origen, destino }: { origen?: boolean; destino?: boolean }) {
  if (!origen && !destino) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {origen && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-blue-100 text-blue-700 border border-blue-200 whitespace-nowrap">En origen</span>}
      {destino && <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-medium bg-green-100 text-green-700 border border-green-200 whitespace-nowrap">En destino</span>}
    </div>
  );
}

function CausalBadge({ causal }: { causal?: string }) {
  if (!causal) return <span className="text-muted-foreground">—</span>;
  const label = CAUSALES_LABELS[causal] ?? causal;
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-medium border bg-indigo-50 text-indigo-700 border-indigo-200 whitespace-nowrap">
      {label}
    </span>
  );
}

function diasDesde(fecha: string): number {
  const diff = Date.now() - new Date(fecha).getTime();
  return Math.max(0, Math.floor(diff / 86_400_000));
}

function DiasBadge({ dias }: { dias: number }) {
  const cls =
    dias > 7
      ? "bg-destructive/10 text-destructive border-destructive/20"
      : dias > 3
        ? "bg-orange-100 text-orange-700 border-orange-200"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium border ${cls}`}>
      {dias}d
    </span>
  );
}

function EstadoRevisionBadge({ estado, eventoId }: { estado: string; eventoId?: string }) {
  const { abrirRegistro } = useApp();
  const map: Record<string, { label: string; cls: string }> = {
    pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    sin_novedad: { label: "Sin novedad", cls: "bg-green-100 text-green-700 border-green-200" },
    abierto: { label: "Evento abierto", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    cerrado: { label: "Evento cerrado", cls: "bg-gray-100 text-gray-600 border-gray-200" },
  };
  const { label, cls } = map[estado] ?? { label: estado, cls: "bg-muted text-muted-foreground border-border" };
  if ((estado === "abierto" || estado === "cerrado") && eventoId) {
    return (
      <button
        onClick={(e) => { e.stopPropagation(); abrirRegistro(eventoId); }}
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap hover:opacity-80 transition-opacity ${cls}`}
      >
        {label} · {eventoId}
      </button>
    );
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function NovedadBadge({ codigo }: { codigo: string }) {
  const colors: Record<string, string> = {
    "100": "bg-red-100 text-red-700 border-red-200",
    "101": "bg-red-100 text-red-700 border-red-200",
    "300": "bg-orange-100 text-orange-700 border-orange-200",
    "400": "bg-amber-100 text-amber-700 border-amber-200",
    "403": "bg-blue-100 text-blue-700 border-blue-200",
    "529": "bg-purple-100 text-purple-700 border-purple-200",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border ${colors[codigo] ?? "bg-muted text-muted-foreground border-border"}`}>
      {codigo}
    </span>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors whitespace-nowrap ${
        active ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

function PanelDetalle({ guiaNum }: { guiaNum: string }) {
  const guia = getGuia(guiaNum);

  return (
    <div className="bg-muted/30 border-t border-border px-4 py-3">
      {guia && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <div><span className="text-muted-foreground">Origen:</span> <span className="font-medium">{guia.terminalOrigen} ({guia.ciudadOrigen})</span></div>
          <div><span className="text-muted-foreground">Destino:</span> <span className="font-medium">{guia.terminalDestino} ({guia.ciudadDestino})</span></div>
          <div><span className="text-muted-foreground">Valor declarado:</span> <span className="font-medium">{formatCurrency(guia.valorDeclarado)}</span></div>
          <div><span className="text-muted-foreground">Fecha:</span> <span className="font-medium">{guia.fechaCreacion}</span></div>
          <div><span className="text-muted-foreground">Cliente:</span> <span className="font-medium">{guia.nombreCliente}</span></div>
          <div><span className="text-muted-foreground">NIT:</span> <span className="font-medium">{guia.nitCliente}</span></div>
        </div>
      )}
    </div>
  );
}

export default function BandejaPage() {
  const { setNuevaRegistroAbierto, setFormPrefill } = useApp();
  const [tab, setTab] = useState<TabId>("rce");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filtroRegional, setFiltroRegional] = useState("todos");
  const [filtroTerminal, setFiltroTerminal] = useState("todos");
  const [filtroEstadoRCE, setFiltroEstadoRCE] = useState<FiltroEstadoRevision>("todas");
  const [filtroEstadoFalt, setFiltroEstadoFalt] = useState<FiltroEstadoRevision>("todas");
  const [filtroCausal, setFiltroCausal] = useState<FiltroCausal>("todas");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen] = useState(false);
  const [pageSize, setPageSize] = useState<PageSize>(50);

  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [clienteBusqueda, setClienteBusqueda] = useState("");
  const [clienteDropOpen, setClienteDropOpen] = useState(false);
  const clienteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (clienteRef.current && !clienteRef.current.contains(e.target as Node)) setClienteDropOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [sortField, setSortField] = useState<string>("dias");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const [rceData, setRceData] = useState<InsumoRCE[]>(insumosRCE);
  const [faltData, setFaltData] = useState<InsumoFaltante[]>(insumosFaltantes);

  function toggleSort(field: string) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortHeader({ field, children, align }: { field: string; children: React.ReactNode; align?: string }) {
    const active = sortField === field;
    return (
      <th
        className={`${align ?? "text-left"} px-3 py-2.5 font-semibold text-muted-foreground cursor-pointer hover:text-foreground select-none transition-colors`}
        onClick={() => toggleSort(field)}
      >
        <span className="inline-flex items-center gap-1">
          {children}
          <span className="text-[10px]">{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
        </span>
      </th>
    );
  }

  function handleRegionalChange(val: string) { setFiltroRegional(val); setFiltroTerminal("todos"); }

  const regionalesDisponibles: string[] = useMemo(() =>
    Object.values(PAISES_REGIONALES).flatMap((r) => Object.keys(r))
  , []);

  const terminalesDisponibles: string[] = useMemo(() =>
    filtroRegional !== "todos"
      ? REGIONALES_FLAT[filtroRegional] ?? []
      : TODAS_TERMINALES
  , [filtroRegional]);

  const hayFiltrosGeo = filtroRegional !== "todos" || filtroTerminal !== "todos";

  const clientesUnicos: string[] = useMemo(() => {
    const set = new Set<string>();
    [...rceData, ...faltData].forEach((i) => {
      const g = getGuia(i.guia);
      if (g?.nombreCliente) set.add(g.nombreCliente);
    });
    return [...set].sort();
  }, [rceData, faltData]);

  const clientesSugeridos = useMemo(() => {
    if (!clienteBusqueda.trim()) return clientesUnicos;
    const q = clienteBusqueda.toLowerCase();
    return clientesUnicos.filter((c) => c.toLowerCase().includes(q));
  }, [clientesUnicos, clienteBusqueda]);

  function matchTerminal(terminal: string): boolean {
    if (filtroTerminal !== "todos") return terminal === filtroTerminal;
    if (filtroRegional !== "todos") return (REGIONALES_FLAT[filtroRegional] ?? []).includes(terminal);
    return true;
  }

  function limpiarFiltrosGeo() { setFiltroRegional("todos"); setFiltroTerminal("todos"); }

  function matchFecha(fechaStr: string): boolean {
    if (!dateRange?.from && !dateRange?.to) return true;
    const fecha = new Date(fechaStr);
    if (dateRange?.from && isBefore(fecha, startOfDay(dateRange.from))) return false;
    if (dateRange?.to && isAfter(fecha, endOfDay(dateRange.to))) return false;
    return true;
  }

  const fechaDesdeStr = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : "";
  const fechaHastaStr = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : "";

  const rceFiltered = useMemo(() => {
    return rceData.filter((i) => {
      if (filtroEstadoRCE !== "todas" && i.estadoRevision !== filtroEstadoRCE) return false;
      if (!matchFecha(i.fechaAsignacion)) return false;
      const g = getGuia(i.guia);
      if (filtroRegional !== "todos" || filtroTerminal !== "todos") {
        if (!g) return false;
        if (!matchTerminal(g.terminalOrigen) && !matchTerminal(g.terminalDestino)) return false;
      }
      if (filtroCliente !== "todos" && g?.nombreCliente !== filtroCliente) return false;
      return true;
    });
  }, [rceData, filtroEstadoRCE, filtroRegional, filtroTerminal, filtroCliente, dateRange]);

  const faltFiltered = useMemo(() => {
    return faltData.filter((i) => {
      if (filtroCausal === "solo_sg" && i.codigoNovedad !== "100" && i.codigoNovedad !== "101") return false;
      if (filtroEstadoFalt !== "todas" && i.estadoRevision !== filtroEstadoFalt) return false;
      if (filtroCausal !== "todas" && filtroCausal !== "solo_sg" && i.causal !== filtroCausal) return false;
      if (!matchFecha(i.fechaNovedad)) return false;
      if (!matchTerminal(i.terminal)) return false;
      if (filtroCliente !== "todos") {
        const g = getGuia(i.guia);
        if (g?.nombreCliente !== filtroCliente) return false;
      }
      return true;
    });
  }, [faltData, filtroEstadoFalt, filtroCausal, filtroRegional, filtroTerminal, filtroCliente, dateRange]);

  const rceSorted = useMemo(() => {
    const sorted = [...rceFiltered].sort((a, b) => {
      const g1 = getGuia(a.guia);
      const g2 = getGuia(b.guia);
      let cmp = 0;
      switch (sortField) {
        case "valor": cmp = a.valorRecaudo - b.valorRecaudo; break;
        case "dias": cmp = diasDesde(a.fechaAsignacion) - diasDesde(b.fechaAsignacion); break;
        case "fecha": cmp = new Date(a.fechaAsignacion).getTime() - new Date(b.fechaAsignacion).getTime(); break;
        case "cliente": cmp = (g1?.nombreCliente ?? "").localeCompare(g2?.nombreCliente ?? ""); break;
        default: break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [rceFiltered, sortField, sortDir]);

  const faltSorted = useMemo(() => {
    const sorted = [...faltFiltered].sort((a, b) => {
      const g1 = getGuia(a.guia);
      const g2 = getGuia(b.guia);
      let cmp = 0;
      switch (sortField) {
        case "dias": cmp = diasDesde(a.fechaNovedad) - diasDesde(b.fechaNovedad); break;
        case "fecha": cmp = new Date(a.fechaNovedad).getTime() - new Date(b.fechaNovedad).getTime(); break;
        case "cliente": cmp = (g1?.nombreCliente ?? "").localeCompare(g2?.nombreCliente ?? ""); break;
        case "novedad": cmp = a.codigoNovedad.localeCompare(b.codigoNovedad); break;
        case "terminal_origen": cmp = (g1?.terminalOrigen ?? a.terminal).localeCompare(g2?.terminalOrigen ?? b.terminal); break;
        case "terminal_destino": cmp = (g1?.terminalDestino ?? "").localeCompare(g2?.terminalDestino ?? ""); break;
        case "estado_qlik": cmp = (a.causal ?? "").localeCompare(b.causal ?? ""); break;
        default: break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [faltFiltered, sortField, sortDir]);

  const rceVisible = pageSize === "all" ? rceSorted : rceSorted.slice(0, pageSize);
  const faltVisible = pageSize === "all" ? faltSorted : faltSorted.slice(0, pageSize);

  const pendientesRCE = rceData.filter((i) => i.estadoRevision === "pendiente").length;
  const pendientesFalt = faltData.filter((i) => i.estadoRevision === "pendiente").length;
  const pendientesEvi = evidenciasPendientesCount();

  function marcarRCESinNovedad(id: string) {
    const idx = insumosRCE.findIndex((i) => i.id === id);
    if (idx !== -1) {
      insumosRCE[idx].estadoRevision = "sin_novedad";
      insumosRCE[idx].revisadoPor = usuarioLogueado.nombre;
      insumosRCE[idx].fechaRevision = new Date().toISOString().split("T")[0];
    }
    setRceData([...insumosRCE]);
    const item = insumosRCE.find((i) => i.id === id);
    toast({ title: `Guía ${item?.guia ?? id} marcada sin novedad` });
  }

  function registrarEventoRCE(item: InsumoRCE) {
    const g = getGuia(item.guia);
    setFormPrefill({
      categoria: "dineros",
      guia: item.guia,
      terminal: g?.terminalOrigen,
      insumoId: item.id,
      insumoTipo: "rce",
    });
    setNuevaRegistroAbierto(true);
  }

  function marcarFaltSinNovedad(id: string) {
    const idx = insumosFaltantes.findIndex((i) => i.id === id);
    if (idx !== -1) {
      insumosFaltantes[idx].estadoRevision = "sin_novedad";
      insumosFaltantes[idx].revisadoPor = usuarioLogueado.nombre;
      insumosFaltantes[idx].fechaRevision = new Date().toISOString().split("T")[0];
    }
    setFaltData([...insumosFaltantes]);
    const item = insumosFaltantes.find((i) => i.id === id);
    toast({ title: `Guía ${item?.guia ?? id} marcada sin novedad` });
  }

  function registrarEventoFalt(item: InsumoFaltante) {
    setFormPrefill({
      categoria: "unidades",
      guia: item.guia,
      terminal: item.terminal,
      codigoNovedad: item.codigoNovedad,
      insumoId: item.id,
      insumoTipo: "faltante",
    });
    setNuevaRegistroAbierto(true);
  }

  function toggleRow(id: string) {
    setExpandedRow((prev) => (prev === id ? null : id));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-4">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Carga de Trabajo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Insumos pendientes de revisión — tu carga de trabajo diaria
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          <TabButton active={tab === "rce"} onClick={() => { setTab("rce"); setSortField("dias"); setSortDir("desc"); }}>
            💰 RCE ({rceFiltered.length} guías)
          </TabButton>
          <TabButton active={tab === "faltantes"} onClick={() => { setTab("faltantes"); setSortField("dias"); setSortDir("desc"); }}>
            📦 Faltantes ({faltFiltered.length} guías)
          </TabButton>
          <TabButton active={tab === "evidencias"} onClick={() => { setTab("evidencias"); setSortField("dias"); setSortDir("desc"); }}>
            📸 Evidencias ({pendientesEvi} pendientes)
          </TabButton>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2">
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pendientesRCE + pendientesFalt + pendientesEvi} pendientes
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${dateRange?.from ? "border-primary bg-primary/5 text-primary font-medium" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                <CalendarDays className="w-3.5 h-3.5" />
                {dateRange?.from
                  ? dateRange.to
                    ? `${format(dateRange.from, "d MMM", { locale: es })} – ${format(dateRange.to, "d MMM", { locale: es })}`
                    : format(dateRange.from, "d MMM yyyy", { locale: es })
                  : "Rango de fechas"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={setDateRange}
                locale={es}
                numberOfMonths={2}
                initialFocus
              />
              {dateRange?.from && (
                <div className="flex justify-end px-3 pb-3">
                  <button onClick={() => { setDateRange(undefined); setCalOpen(false); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3 h-3" /> Limpiar rango
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>


          {tab !== "evidencias" && (
            <>
              <div className="w-px h-5 bg-border mx-0.5" />
              <div className="flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                  value={filtroRegional}
                  onChange={(e) => handleRegionalChange(e.target.value)}
                >
                  <option value="todos">Todas las regionales</option>
                  {regionalesDisponibles.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                <select
                  className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
                  value={filtroTerminal}
                  onChange={(e) => setFiltroTerminal(e.target.value)}
                >
                  <option value="todos">Todas las terminales</option>
                  {terminalesDisponibles.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
                {hayFiltrosGeo && (
                  <button
                    onClick={limpiarFiltrosGeo}
                    className="inline-flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    title="Limpiar filtros geográficos"
                  >
                    <X className="w-3 h-3" /> Limpiar
                  </button>
                )}
                <div className="relative" ref={clienteRef}>
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <input
                      type="text"
                      placeholder={filtroCliente !== "todos" ? filtroCliente : "Buscar cliente..."}
                      value={clienteBusqueda}
                      onChange={(e) => { setClienteBusqueda(e.target.value); setClienteDropOpen(true); }}
                      onFocus={() => setClienteDropOpen(true)}
                      className={`text-xs border rounded-lg pl-7 pr-7 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring w-[200px] ${
                        filtroCliente !== "todos" ? "border-green-300 bg-green-50/50" : "border-border"
                      }`}
                    />
                    {filtroCliente !== "todos" && (
                      <button
                        onClick={() => { setFiltroCliente("todos"); setClienteBusqueda(""); setClienteDropOpen(false); }}
                        className="absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-muted transition-colors"
                      >
                        <X className="w-3 h-3 text-muted-foreground" />
                      </button>
                    )}
                  </div>
                  {clienteDropOpen && clientesSugeridos.length > 0 && (
                    <div className="absolute top-full left-0 mt-1 w-[260px] max-h-48 overflow-y-auto bg-card border border-border rounded-lg shadow-lg z-50">
                      {clientesSugeridos.map((c) => (
                        <button
                          key={c}
                          onClick={() => { setFiltroCliente(c); setClienteBusqueda(""); setClienteDropOpen(false); }}
                          className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${
                            filtroCliente === c ? "bg-green-50 text-green-700 font-medium" : ""
                          }`}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                  {clienteDropOpen && clientesSugeridos.length === 0 && clienteBusqueda.trim() && (
                    <div className="absolute top-full left-0 mt-1 w-[260px] bg-card border border-border rounded-lg shadow-lg z-50 px-3 py-2 text-xs text-muted-foreground">
                      Sin resultados
                    </div>
                  )}
                </div>
              </div>

              <div className="w-px h-5 bg-border mx-0.5" />

              {tab === "rce" && (
                <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
                  {([["todas", "Todas"], ["pendiente", "Pendientes"], ["sin_novedad", "Sin novedad"], ["abierto", "Abierto"], ["cerrado", "Cerrado"]] as [FiltroEstadoRevision, string][]).map(([val, label]) => (
                    <button key={val} onClick={() => setFiltroEstadoRCE(val)}
                      className={`px-3 py-1.5 transition-colors ${filtroEstadoRCE === val ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                      {label}
                    </button>
                  ))}
                </div>
              )}
              {tab === "faltantes" && (
                <>
                  <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
                    {([["todas", "Todas"], ["pendiente", "Pendientes"], ["sin_novedad", "Sin novedad"], ["abierto", "Abierto"], ["cerrado", "Cerrado"]] as [FiltroEstadoRevision, string][]).map(([val, label]) => (
                      <button key={val} onClick={() => setFiltroEstadoFalt(val)}
                        className={`px-3 py-1.5 transition-colors ${filtroEstadoFalt === val ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <select
                    value={filtroCausal}
                    onChange={(e) => setFiltroCausal(e.target.value as FiltroCausal)}
                    className={`text-xs border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring ${
                      filtroCausal !== "todas" ? "border-indigo-300 bg-indigo-50/50 text-indigo-700 font-medium" : "border-border text-muted-foreground"
                    }`}
                  >
                    {CAUSALES_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </>
              )}
            </>
          )}
        </div>

        {/* Pills de filtros activos */}
        {(hayFiltrosGeo || !!dateRange?.from || filtroCliente !== "todos" || (tab === "faltantes" && filtroCausal !== "todas")) && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Filtros:</span>
            {dateRange?.from && (
              <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700 border border-blue-200">
                {dateRange.to
                  ? `${format(dateRange.from, "d MMM", { locale: es })} – ${format(dateRange.to, "d MMM", { locale: es })}`
                  : format(dateRange.from, "d MMM yyyy", { locale: es })}
                <button onClick={() => setDateRange(undefined)} className="hover:bg-blue-200 rounded-full p-0.5 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filtroRegional !== "todos" && (
              <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Regional: {filtroRegional}
                <button onClick={() => handleRegionalChange("todos")} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filtroTerminal !== "todos" && (
              <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
                Terminal: {filtroTerminal}
                <button onClick={() => setFiltroTerminal("todos")} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {filtroCliente !== "todos" && (
              <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                Cliente: {filtroCliente}
                <button onClick={() => setFiltroCliente("todos")} className="hover:bg-green-200 rounded-full p-0.5 transition-colors ml-0.5">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {tab === "faltantes" && filtroCausal !== "todas" && (
              <span className={`inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium border ${
                filtroCausal === "solo_sg" ? "bg-red-100 text-red-700 border-red-200" : "bg-indigo-100 text-indigo-700 border-indigo-200"
              }`}>
                {filtroCausal === "solo_sg" ? "Solo SG (100/101)" : (CAUSALES_LABELS[filtroCausal] ?? filtroCausal)}
                <button onClick={() => setFiltroCausal("todas")} className={`rounded-full p-0.5 transition-colors ml-0.5 ${
                  filtroCausal === "solo_sg" ? "hover:bg-red-200" : "hover:bg-indigo-200"
                }`}>
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}

        {/* Tabla RCE */}
        {tab === "rce" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-8"></th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Guía</th>
                    <SortHeader field="cliente">Cliente</SortHeader>
                    <SortHeader field="valor" align="text-right">Valor recaudo</SortHeader>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Terminal origen</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Terminal destino</th>
                    <SortHeader field="fecha">Fecha</SortHeader>
                    <SortHeader field="dias" align="text-center">Días</SortHeader>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Revisión</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rceVisible.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Sin guías RCE en este filtro</td></tr>
                  ) : rceVisible.map((item) => {
                    const g = getGuia(item.guia);
                    const dias = diasDesde(item.fechaAsignacion);
                    const isExpanded = expandedRow === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${isExpanded ? "bg-muted/20" : ""}`}
                          onClick={() => toggleRow(item.id)}
                        >
                          <td className="px-3 py-2.5">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono font-bold">{item.guia}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium truncate max-w-[160px]">{g?.nombreCliente ?? "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{g?.nitCliente ?? ""}</div>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <span className={`font-bold ${item.valorRecaudo >= 5_000_000 ? "text-green-600" : ""}`}>
                              {formatCurrency(item.valorRecaudo)}
                            </span>
                          </td>
                          <td className="px-3 py-2.5">{g?.terminalOrigen ?? "—"}</td>
                          <td className="px-3 py-2.5">{g?.terminalDestino ?? "—"}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{g?.fechaCreacion ?? "—"}</td>
                          <td className="px-3 py-2.5 text-center"><DiasBadge dias={dias} /></td>
                          <td className="px-3 py-2.5 text-center"><EstadoRevisionBadge estado={item.estadoRevision} eventoId={item.eventoGenerado} /></td>
                          <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            {item.estadoRevision === "pendiente" && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => marcarRCESinNovedad(item.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-[10px] font-medium"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Sin novedad
                                </button>
                                <button
                                  onClick={() => registrarEventoRCE(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-[10px] font-medium"
                                >
                                  <AlertTriangle className="w-3 h-3" /> Evento
                                </button>
                              </div>
                            )}
                            {item.estadoRevision !== "pendiente" && item.revisadoPor && (
                              <span className="text-[10px] text-muted-foreground">{item.revisadoPor}</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={10} className="p-0">
                              <PanelDetalle guiaNum={item.guia} />
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {rceVisible.length} de {rceFiltered.length} guías
              </span>
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] bg-background">
                {PAGE_SIZES.map((s) => (
                  <button key={String(s.value)} onClick={() => setPageSize(s.value)}
                    className={`px-2.5 py-1 transition-colors ${pageSize === s.value ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Panel Evidencias */}
        {tab === "evidencias" && (
          <EvidenciasPanel filtroTerminalExt={filtroTerminal} fechaDesde={fechaDesdeStr} fechaHasta={fechaHastaStr} />
        )}

        {/* Tabla Faltantes */}
        {tab === "faltantes" && (
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground w-8"></th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Guía</th>
                    <SortHeader field="cliente">Cliente</SortHeader>
                    <SortHeader field="novedad" align="text-center">Novedad</SortHeader>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Checkpoint</th>
                    <SortHeader field="terminal_origen">Terminal origen</SortHeader>
                    <SortHeader field="terminal_destino">Terminal destino</SortHeader>
                    <SortHeader field="fecha">Fecha novedad</SortHeader>
                    <SortHeader field="dias" align="text-center">Días</SortHeader>
                    <SortHeader field="estado_qlik" align="text-center">Causal</SortHeader>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Revisión</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {faltVisible.length === 0 ? (
                    <tr><td colSpan={12} className="text-center py-8 text-muted-foreground">Sin guías faltantes en este filtro</td></tr>
                  ) : faltVisible.map((item) => {
                    const g = getGuia(item.guia);
                    const dias = diasDesde(item.fechaNovedad);
                    const isExpanded = expandedRow === item.id;
                    return (
                      <React.Fragment key={item.id}>
                        <tr
                          className={`hover:bg-muted/30 transition-colors cursor-pointer ${isExpanded ? "bg-muted/20" : ""}`}
                          onClick={() => toggleRow(item.id)}
                        >
                          <td className="px-3 py-2.5">
                            {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronRight className="w-3.5 h-3.5 text-muted-foreground" />}
                          </td>
                          <td className="px-3 py-2.5">
                            <span className="font-mono font-bold">{item.guia}</span>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="font-medium truncate max-w-[160px]">{g?.nombreCliente ?? "—"}</div>
                            <div className="text-[10px] text-muted-foreground">{g?.nitCliente ?? ""}</div>
                          </td>
                          <td className="px-3 py-2.5 text-center"><NovedadBadge codigo={item.codigoNovedad} /></td>
                          <td className="px-3 py-2.5 text-center"><CheckpointBadge origen={item.checkpointOrigen} destino={item.checkpointDestino} /></td>
                          <td className="px-3 py-2.5">{g?.terminalOrigen ?? item.terminal}</td>
                          <td className="px-3 py-2.5">{g?.terminalDestino ?? "—"}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{item.fechaNovedad}</td>
                          <td className="px-3 py-2.5 text-center"><DiasBadge dias={dias} /></td>
                          <td className="px-3 py-2.5 text-center"><CausalBadge causal={item.causal} /></td>
                          <td className="px-3 py-2.5 text-center"><EstadoRevisionBadge estado={item.estadoRevision} eventoId={item.eventoGenerado} /></td>
                          <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            {item.estadoRevision === "pendiente" && (
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => marcarFaltSinNovedad(item.id)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-green-100 text-green-700 hover:bg-green-200 transition-colors text-[10px] font-medium"
                                >
                                  <CheckCircle2 className="w-3 h-3" /> Sin novedad
                                </button>
                                <button
                                  onClick={() => registrarEventoFalt(item)}
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors text-[10px] font-medium"
                                >
                                  <AlertTriangle className="w-3 h-3" /> Evento
                                </button>
                              </div>
                            )}
                            {item.estadoRevision !== "pendiente" && item.revisadoPor && (
                              <span className="text-[10px] text-muted-foreground">{item.revisadoPor}</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={12} className="p-0">
                              <div>
                                <PanelDetalle guiaNum={item.guia} />
                                {item.infoInterventorOps && (
                                  <div className="bg-amber-50/50 border-t border-amber-200 px-4 py-2.5">
                                    <div className="flex items-start gap-2 text-xs">
                                      <span className="font-semibold text-amber-700 whitespace-nowrap">📋 Ops (400):</span>
                                      <span className="text-amber-800">{item.infoInterventorOps}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border px-4 py-2.5 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {faltVisible.length} de {faltFiltered.length} guías
              </span>
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px] bg-background">
                {PAGE_SIZES.map((s) => (
                  <button key={String(s.value)} onClick={() => setPageSize(s.value)}
                    className={`px-2.5 py-1 transition-colors ${pageSize === s.value ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
