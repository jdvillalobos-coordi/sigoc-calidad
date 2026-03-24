import React, { useState, useMemo } from "react";
import { useApp } from "@/context/AppContext";
import { insumosRCE, insumosFaltantes, getGuia, PAISES_REGIONALES, REGIONALES_FLAT, TODAS_TERMINALES } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";
import { ChevronDown, ChevronRight, CheckCircle2, AlertTriangle, Eye, X, Filter } from "lucide-react";
import type { InsumoRCE, InsumoFaltante } from "@/types";

type TabId = "rce" | "faltantes";
type FiltroEstadoRCE = "todas" | "pendiente" | "revisada_sin_novedad" | "con_novedad";
type FiltroEstadoFalt = "todas" | "pendiente" | "en_investigacion" | "revisada_sin_novedad" | "con_novedad";

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

function EstadoRevisionBadge({ estado }: { estado: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    pendiente: { label: "Pendiente", cls: "bg-amber-100 text-amber-700 border-amber-200" },
    en_investigacion: { label: "En investigación", cls: "bg-blue-100 text-blue-700 border-blue-200" },
    revisada_sin_novedad: { label: "Sin novedad", cls: "bg-green-100 text-green-700 border-green-200" },
    con_novedad: { label: "Con novedad", cls: "bg-destructive/10 text-destructive border-destructive/20" },
  };
  const { label, cls } = map[estado] ?? { label: estado, cls: "bg-muted text-muted-foreground border-border" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border whitespace-nowrap ${cls}`}>
      {label}
    </span>
  );
}

function NovedadBadge({ codigo }: { codigo: string }) {
  const colors: Record<string, string> = {
    "100": "bg-red-100 text-red-700 border-red-200",
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
  const { abrirGuia, setNuevaRegistroAbierto, setFormPrefill } = useApp();
  const [tab, setTab] = useState<TabId>("rce");
  const [expandedRow, setExpandedRow] = useState<string | null>(null);
  const [filtroRegional, setFiltroRegional] = useState("todos");
  const [filtroTerminal, setFiltroTerminal] = useState("todos");
  const [filtroEstadoRCE, setFiltroEstadoRCE] = useState<FiltroEstadoRCE>("todas");
  const [filtroEstadoFalt, setFiltroEstadoFalt] = useState<FiltroEstadoFalt>("todas");

  const [rceData, setRceData] = useState<InsumoRCE[]>(insumosRCE);
  const [faltData, setFaltData] = useState<InsumoFaltante[]>(insumosFaltantes);

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

  function matchTerminal(terminal: string): boolean {
    if (filtroTerminal !== "todos") return terminal === filtroTerminal;
    if (filtroRegional !== "todos") return (REGIONALES_FLAT[filtroRegional] ?? []).includes(terminal);
    return true;
  }

  function limpiarFiltrosGeo() { setFiltroRegional("todos"); setFiltroTerminal("todos"); }

  const rceFiltered = useMemo(() => {
    return rceData.filter((i) => {
      if (filtroEstadoRCE !== "todas" && i.estadoRevision !== filtroEstadoRCE) return false;
      if (filtroRegional !== "todos" || filtroTerminal !== "todos") {
        const g = getGuia(i.guia);
        if (!g) return false;
        if (!matchTerminal(g.terminalOrigen) && !matchTerminal(g.terminalDestino)) return false;
      }
      return true;
    });
  }, [rceData, filtroEstadoRCE, filtroRegional, filtroTerminal]);

  const faltFiltered = useMemo(() => {
    return faltData.filter((i) => {
      if (filtroEstadoFalt !== "todas" && i.estadoRevision !== filtroEstadoFalt) return false;
      if (!matchTerminal(i.terminal)) return false;
      return true;
    });
  }, [faltData, filtroEstadoFalt, filtroRegional, filtroTerminal]);

  const pendientesRCE = rceData.filter((i) => i.estadoRevision === "pendiente").length;
  const pendientesFalt = faltData.filter((i) => i.estadoRevision === "pendiente" || i.estadoRevision === "en_investigacion").length;

  function marcarRCESinNovedad(id: string) {
    setRceData((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, estadoRevision: "revisada_sin_novedad" as const, revisadoPor: "Sandra Herrera", fechaRevision: new Date().toISOString().split("T")[0] } : i
      )
    );
    const item = rceData.find((i) => i.id === id);
    toast({ title: `Guía ${item?.guia ?? id} marcada sin novedad` });
  }

  function registrarEventoRCE(item: InsumoRCE) {
    const g = getGuia(item.guia);
    setFormPrefill({
      categoria: "dineros",
      guia: item.guia,
      terminal: g?.terminalOrigen,
    });
    setNuevaRegistroAbierto(true);
  }

  function marcarFaltSinNovedad(id: string) {
    setFaltData((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, estadoRevision: "revisada_sin_novedad" as const, revisadoPor: "Sandra Herrera", fechaRevision: new Date().toISOString().split("T")[0] } : i
      )
    );
    const item = faltData.find((i) => i.id === id);
    toast({ title: `Guía ${item?.guia ?? id} marcada sin novedad` });
  }

  function marcarFaltEnInvestigacion(id: string) {
    setFaltData((prev) =>
      prev.map((i) =>
        i.id === id ? { ...i, estadoRevision: "en_investigacion" as const, revisadoPor: "Sandra Herrera", fechaRevision: new Date().toISOString().split("T")[0] } : i
      )
    );
    const item = faltData.find((i) => i.id === id);
    toast({ title: `Guía ${item?.guia ?? id} marcada en investigación` });
  }

  function registrarEventoFalt(item: InsumoFaltante) {
    setFormPrefill({
      categoria: "unidades",
      guia: item.guia,
      terminal: item.terminal,
      codigoNovedad: item.codigoNovedad,
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
          <h1 className="text-xl font-bold text-foreground">Bandeja de trabajo</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Guías pendientes de revisión — tu insumo diario de trabajo
          </p>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 border-b border-border">
          <TabButton active={tab === "rce"} onClick={() => setTab("rce")}>
            💰 RCE ({rceFiltered.length} guías)
          </TabButton>
          <TabButton active={tab === "faltantes"} onClick={() => setTab("faltantes")}>
            📦 Faltantes ({faltFiltered.length} guías)
          </TabButton>
          <div className="flex-1" />
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground pb-2">
            <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
              {pendientesRCE + pendientesFalt} pendientes
            </span>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-wrap gap-2 items-center">
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
          </div>

          <div className="w-px h-5 bg-border mx-0.5" />

          {tab === "rce" && (
            <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
              {([["todas", "Todas"], ["pendiente", "Pendientes"], ["revisada_sin_novedad", "Revisadas"], ["con_novedad", "Con novedad"]] as [FiltroEstadoRCE, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setFiltroEstadoRCE(val)}
                  className={`px-3 py-1.5 transition-colors ${filtroEstadoRCE === val ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
          {tab === "faltantes" && (
            <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
              {([["todas", "Todas"], ["pendiente", "Pendientes"], ["en_investigacion", "En invest."], ["revisada_sin_novedad", "Revisadas"], ["con_novedad", "Con novedad"]] as [FiltroEstadoFalt, string][]).map(([val, label]) => (
                <button key={val} onClick={() => setFiltroEstadoFalt(val)}
                  className={`px-3 py-1.5 transition-colors ${filtroEstadoFalt === val ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Pills de filtros activos */}
        {hayFiltrosGeo && (
          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium">Filtros:</span>
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
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Cliente</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Valor recaudo</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Terminal origen</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Terminal destino</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Fecha</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Días</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Estado</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rceFiltered.length === 0 ? (
                    <tr><td colSpan={10} className="text-center py-8 text-muted-foreground">Sin guías RCE en este filtro</td></tr>
                  ) : rceFiltered.map((item) => {
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
                            <button
                              onClick={(e) => { e.stopPropagation(); abrirGuia(item.guia); }}
                              className="font-mono font-bold text-primary hover:underline"
                            >
                              {item.guia}
                            </button>
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
                          <td className="px-3 py-2.5 text-center"><EstadoRevisionBadge estado={item.estadoRevision} /></td>
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
          </div>
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
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Novedad</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Terminal</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Ciudad</th>
                    <th className="text-left px-3 py-2.5 font-semibold text-muted-foreground">Fecha novedad</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Días</th>
                    <th className="text-center px-3 py-2.5 font-semibold text-muted-foreground">Estado</th>
                    <th className="text-right px-3 py-2.5 font-semibold text-muted-foreground">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {faltFiltered.length === 0 ? (
                    <tr><td colSpan={9} className="text-center py-8 text-muted-foreground">Sin guías faltantes en este filtro</td></tr>
                  ) : faltFiltered.map((item) => {
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
                            <button
                              onClick={(e) => { e.stopPropagation(); abrirGuia(item.guia); }}
                              className="font-mono font-bold text-primary hover:underline"
                            >
                              {item.guia}
                            </button>
                          </td>
                          <td className="px-3 py-2.5 text-center"><NovedadBadge codigo={item.codigoNovedad} /></td>
                          <td className="px-3 py-2.5">{item.terminal}</td>
                          <td className="px-3 py-2.5">{item.ciudad}</td>
                          <td className="px-3 py-2.5 text-muted-foreground">{item.fechaNovedad}</td>
                          <td className="px-3 py-2.5 text-center"><DiasBadge dias={dias} /></td>
                          <td className="px-3 py-2.5 text-center"><EstadoRevisionBadge estado={item.estadoRevision} /></td>
                          <td className="px-3 py-2.5 text-right" onClick={(e) => e.stopPropagation()}>
                            {(item.estadoRevision === "pendiente" || item.estadoRevision === "en_investigacion") && (
                              <div className="flex items-center justify-end gap-1">
                                {item.estadoRevision === "pendiente" && (
                                  <button
                                    onClick={() => marcarFaltEnInvestigacion(item.id)}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors text-[10px] font-medium"
                                  >
                                    <Eye className="w-3 h-3" /> Investigar
                                  </button>
                                )}
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
                            {item.estadoRevision !== "pendiente" && item.estadoRevision !== "en_investigacion" && item.revisadoPor && (
                              <span className="text-[10px] text-muted-foreground">{item.revisadoPor}</span>
                            )}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr>
                            <td colSpan={9} className="p-0">
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
          </div>
        )}
      </div>
    </div>
  );
}
