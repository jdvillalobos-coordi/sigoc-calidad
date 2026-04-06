import React from "react";
import { eventos, personas, vehiculos, PAISES_REGIONALES, actividadesLesivas, estudiosSeguridad, decisionesPersona } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { Users, Car, MapPin, Building2, CalendarDays, X, Search, ArrowUpDown } from "lucide-react";
import { format, isBefore, startOfDay, isAfter, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { CategoriaEvento } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

const CATS: { value: CategoriaEvento | "todas"; label: string }[] = [
  { value: "todas",             label: "Todas" },
  { value: "dineros",           label: "💰 Dineros" },
  { value: "unidades",          label: "📦 Unidades" },
  { value: "listas_vinculantes",label: "📋 Listas" },
  { value: "pqr",               label: "📞 PQR" },
  { value: "disciplinarios",    label: "⚖️ Disciplinarios" },
  { value: "evidencias",        label: "📸 Evidencias" },
];

const TABS = [
  { id: "regionales",  label: "Regionales",  icon: MapPin },
  { id: "terminales",  label: "Terminales",  icon: Building2 },
  { id: "personas",    label: "Personas",    icon: Users },
  { id: "vehiculos",   label: "Vehículos",   icon: Car },
] as const;

type TabId = typeof TABS[number]["id"];

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
      <div className="h-full bg-primary rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

const DECISION_LABELS: Record<string, string> = {
  caso_insuficiente: "Sin acción",
  llamado_atencion_verbal: "Llamado verbal",
  llamado_atencion_escrito: "Llamado escrito",
  suspension_temporal: "Suspensión",
  proceso_disciplinario: "Proceso disc.",
  desvinculacion: "Desvinculado",
  escalamiento_seguridad: "Esc. seguridad",
  sin_hallazgos: "Sin hallazgos",
};

export default function CuadroContactoPage() {
  const { abrirPersona, abrirVehiculo, abrirTerminal, dataVersion } = useApp();
  const [cat, setCat]             = React.useState<CategoriaEvento | "todas">("todas");
  const [tab, setTab]             = React.useState<TabId>("regionales");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen]     = React.useState(false);
  const [ccBusqueda, setCcBusqueda] = React.useState("");
  const [sortDir, setSortDir]     = React.useState<"desc" | "asc">("desc");
  const [subTabPersonas, setSubTabPersonas] = React.useState<"activos" | "desvinculados">("activos");
  const [subTabVehiculos, setSubTabVehiculos] = React.useState<"activos" | "bloqueados">("activos");
  const [filtroDecision, setFiltroDecision] = React.useState<string>("todas");

  const filtrados = React.useMemo(() => {
    return eventos.filter((e) => {
      const fecha = new Date(e.fecha);
      let okFecha = true;
      if (dateRange?.from || dateRange?.to) {
        if (dateRange.from) okFecha = okFecha && !isBefore(fecha, startOfDay(dateRange.from));
        if (dateRange.to)   okFecha = okFecha && !isAfter(fecha, endOfDay(dateRange.to));
      }
      const okCat = cat === "todas" || e.categoria === cat;
      return okFecha && okCat;
    });
  }, [cat, dateRange]);

  const termToRegional = React.useMemo(() => {
    const map: Record<string, string> = {};
    for (const [, regs] of Object.entries(PAISES_REGIONALES))
      for (const [reg, terms] of Object.entries(regs))
        for (const t of terms) map[t] = reg;
    return map;
  }, []);

  const rankRegionales = React.useMemo(() => {
    const c: Record<string, number> = {};
    filtrados.forEach((e) => { const r = termToRegional[e.terminal] ?? "Otra"; c[r] = (c[r] ?? 0) + 1; });
    return Object.entries(c).map(([k, v]) => ({ label: k, count: v })).sort((a, b) => b.count - a.count);
  }, [filtrados, termToRegional]);

  const rankTerminales = React.useMemo(() => {
    const c: Record<string, number> = {};
    filtrados.forEach((e) => { c[e.terminal] = (c[e.terminal] ?? 0) + 1; });
    return Object.entries(c).map(([k, v]) => ({ label: k, count: v })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtrados]);

  const rankVehiculos = React.useMemo(() => {
    const c: Record<string, { vehiculo: typeof vehiculos[0]; count: number }> = {};
    filtrados.forEach((ev) => {
      (ev.vehiculosVinculados ?? []).forEach((v) => {
        if (!c[v.vehiculoId]) { const x = vehiculos.find((y) => y.id === v.vehiculoId); if (x) c[v.vehiculoId] = { vehiculo: x, count: 0 }; }
        if (c[v.vehiculoId]) c[v.vehiculoId].count++;
      });
    });
    return Object.values(c).sort((a, b) => b.count - a.count);
  }, [filtrados, dataVersion]);

  const cuadroContacto = React.useMemo(() => {
    return personas.map((p) => {
      const evsPeriodo = filtrados.filter((e) =>
        e.personasResponsables.some((pv) => pv.personaId === p.id) ||
        e.personasParticipantes.some((pv) => pv.personaId === p.id)
      );
      const tieneEventosEnPeriodo = evsPeriodo.length > 0;
      if (!tieneEventosEnPeriodo) return null;

      const lesivas = actividadesLesivas.filter((a) => a.personaId === p.id).length;
      const ultimaDecision = decisionesPersona.filter(d => d.personaId === p.id).sort((a, b) => b.fecha.localeCompare(a.fecha))[0];
      return { ...p, totalEventos: evsPeriodo.length, lesivas, ultimaDecision };
    }).filter(Boolean).sort((a, b) => {
      const diff = (a?.totalEventos ?? 0) - (b?.totalEventos ?? 0);
      return sortDir === "desc" ? -diff : diff;
    });
  }, [filtrados, sortDir, dataVersion]);

  const cuadroFiltrado = React.useMemo(() => {
    let lista = cuadroContacto;
    if (subTabPersonas === "desvinculados") {
      lista = lista.filter(p => p?.ultimaDecision?.decision === "desvinculacion");
    } else {
      lista = lista.filter(p => p?.ultimaDecision?.decision !== "desvinculacion");
      if (filtroDecision !== "todas") {
        if (filtroDecision === "sin_decision") {
          lista = lista.filter(p => !p?.ultimaDecision);
        } else {
          lista = lista.filter(p => p?.ultimaDecision?.decision === filtroDecision);
        }
      }
    }
    if (ccBusqueda) {
      const q = ccBusqueda.toLowerCase();
      lista = lista.filter((p) => p?.nombre.toLowerCase().includes(q) || p?.cedula.toLowerCase().includes(q) || p?.terminal.toLowerCase().includes(q));
    }
    return lista;
  }, [cuadroContacto, ccBusqueda, filtroDecision, subTabPersonas]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" /> Cuadro de Contacto
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Control y seguimiento de entidades con eventos — insumo para toma de decisiones
          </p>
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

          <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card flex-wrap">
            {CATS.map((c) => (
              <button key={c.value} onClick={() => setCat(c.value)}
                className={`px-3 py-1.5 transition-colors ${cat === c.value ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          <div className="flex border-b border-border">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${tab === id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>

          {/* Regionales */}
          {tab === "regionales" && (
            <div className="divide-y divide-border">
              {rankRegionales.length === 0
                ? <p className="text-center py-8 text-muted-foreground text-xs">Sin eventos en el período</p>
                : rankRegionales.map(({ label, count }, i) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                    <span className="text-xs font-medium text-foreground flex-1">{label}</span>
                    <Bar value={count} max={rankRegionales[0]?.count ?? 1} />
                    <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                    <span className="text-[10px] text-muted-foreground w-9 text-right">{filtrados.length > 0 ? `${Math.round((count / filtrados.length) * 100)}%` : "—"}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Terminales */}
          {tab === "terminales" && (
            <div className="divide-y divide-border">
              {rankTerminales.length === 0
                ? <p className="text-center py-8 text-muted-foreground text-xs">Sin eventos en el período</p>
                : rankTerminales.map(({ label, count }, i) => (
                  <div key={label} className="flex items-center gap-3 px-4 py-3">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                    <button onClick={() => abrirTerminal(label)} className="text-xs font-medium text-foreground hover:text-primary hover:underline flex-1 text-left">{label}</button>
                    <Bar value={count} max={rankTerminales[0]?.count ?? 1} />
                    <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                  </div>
                ))}
            </div>
          )}

          {/* Vehículos */}
          {tab === "vehiculos" && (() => {
            const vehActivos = rankVehiculos.filter(({ vehiculo }) => vehiculo.estado !== "bloqueado");
            const vehBloqueados = rankVehiculos.filter(({ vehiculo }) => vehiculo.estado === "bloqueado");
            const listaVeh = subTabVehiculos === "activos" ? vehActivos : vehBloqueados;
            return (
            <div>
              <div className="flex border-b border-border">
                <button
                  onClick={() => setSubTabVehiculos("activos")}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                    subTabVehiculos === "activos" ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Activos ({vehActivos.length})
                  {subTabVehiculos === "activos" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />}
                </button>
                <button
                  onClick={() => setSubTabVehiculos("bloqueados")}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                    subTabVehiculos === "bloqueados" ? "text-red-600" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Bloqueados ({vehBloqueados.length})
                  {subTabVehiculos === "bloqueados" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t" />}
                </button>
              </div>
              <div className="divide-y divide-border">
                {listaVeh.length === 0
                  ? <p className="text-center py-8 text-muted-foreground text-xs">
                      {subTabVehiculos === "bloqueados" ? "No hay vehículos bloqueados" : "Sin vehículos activos vinculados en el período"}
                    </p>
                  : listaVeh.map(({ vehiculo, count }, i) => (
                    <button key={vehiculo.id} onClick={() => abrirVehiculo(vehiculo.id)}
                      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-muted/30 transition-colors">
                      <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        subTabVehiculos === "bloqueados" ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-700"
                      }`}>
                        <Car className="w-3.5 h-3.5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold block ${subTabVehiculos === "bloqueados" ? "text-muted-foreground" : "text-foreground"}`}>{vehiculo.placa}</span>
                        <span className="text-[10px] text-muted-foreground">{vehiculo.tipo}</span>
                      </div>
                      <Bar value={count} max={rankVehiculos[0]?.count ?? 1} />
                      <span className="text-xs font-bold text-foreground w-4 text-right flex-shrink-0">{count} evento{count !== 1 ? "s" : ""}</span>
                    </button>
                  ))}
              </div>
            </div>
            );
          })()}

          {/* Personas */}
          {tab === "personas" && (() => {
            const totalActivos = cuadroContacto.filter(p => p?.ultimaDecision?.decision !== "desvinculacion").length;
            const totalDesvinculados = cuadroContacto.filter(p => p?.ultimaDecision?.decision === "desvinculacion").length;
            return (
            <div>
              {/* Sub-tabs Activos / Desvinculados */}
              <div className="flex border-b border-border">
                <button
                  onClick={() => { setSubTabPersonas("activos"); setFiltroDecision("todas"); }}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                    subTabPersonas === "activos"
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Activos ({totalActivos})
                  {subTabPersonas === "activos" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />}
                </button>
                <button
                  onClick={() => { setSubTabPersonas("desvinculados"); setFiltroDecision("todas"); }}
                  className={`flex-1 px-4 py-2.5 text-xs font-semibold transition-colors relative ${
                    subTabPersonas === "desvinculados"
                      ? "text-red-600"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Desvinculados ({totalDesvinculados})
                  {subTabPersonas === "desvinculados" && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-red-500 rounded-t" />}
                </button>
              </div>

              <div className="px-4 py-3 border-b border-border space-y-2">
                <div className="flex items-center gap-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      className="w-full pl-8 pr-3 py-1.5 border border-border rounded-lg text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Buscar nombre, cédula o terminal..."
                      value={ccBusqueda}
                      onChange={(e) => setCcBusqueda(e.target.value)}
                    />
                  </div>
                  <button
                    onClick={() => setSortDir(d => d === "desc" ? "asc" : "desc")}
                    className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded border border-border"
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    {sortDir === "desc" ? "Más eventos primero" : "Menos eventos primero"}
                  </button>
                  <span className="text-[11px] text-muted-foreground">{cuadroFiltrado.length} personas</span>
                </div>
                {subTabPersonas === "activos" && (
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { value: "todas", label: "Todas" },
                    { value: "sin_decision", label: "Sin decisión" },
                    { value: "proceso_disciplinario", label: "Proceso disc." },
                    { value: "suspension_temporal", label: "Suspensión" },
                    { value: "llamado_atencion_escrito", label: "Llamado escrito" },
                    { value: "llamado_atencion_verbal", label: "Llamado verbal" },
                    { value: "caso_insuficiente", label: "Sin acción" },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setFiltroDecision(opt.value)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-colors ${
                        filtroDecision === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:text-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                )}
              </div>

              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {cuadroFiltrado.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground text-xs">
                    {subTabPersonas === "desvinculados" ? "No hay personas desvinculadas" : "Sin personas con los filtros aplicados"}
                  </p>
                ) : cuadroFiltrado.map((p) => {
                  if (!p) return null;
                  return (
                    <button key={p.id} onClick={() => abrirPersona(p.id)}
                      className="flex items-center gap-3 px-4 py-2.5 w-full text-left hover:bg-muted/30 transition-colors">
                      <div className={`w-7 h-7 rounded-full text-[11px] font-bold flex items-center justify-center flex-shrink-0 ${
                        subTabPersonas === "desvinculados" ? "bg-red-100 text-red-600" : "bg-primary/10 text-primary"
                      }`}>
                        {p.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className={`text-xs font-semibold truncate block ${subTabPersonas === "desvinculados" ? "text-muted-foreground" : "text-foreground"}`}>{p.nombre}</span>
                        <span className="text-[10px] text-muted-foreground">{p.cargo} · {p.terminal}</span>
                        {subTabPersonas === "desvinculados" && p.ultimaDecision && (
                          <span className="text-[10px] text-red-500 block">
                            Desvinculado el {p.ultimaDecision.fecha}{p.ultimaDecision.observacion ? ` — ${p.ultimaDecision.observacion}` : ""}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary font-semibold flex-shrink-0">
                        {p.totalEventos} evento{p.totalEventos !== 1 ? "s" : ""}
                      </span>
                      {p.lesivas > 0 && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200 font-medium flex-shrink-0">
                          {p.lesivas} lesiva{p.lesivas > 1 ? "s" : ""}
                        </span>
                      )}
                      {subTabPersonas === "activos" && p.ultimaDecision && (
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 border ${
                          p.ultimaDecision.decision === "proceso_disciplinario" ? "bg-orange-50 text-orange-700 border-orange-200"
                          : p.ultimaDecision.decision === "caso_insuficiente" || p.ultimaDecision.decision === "sin_hallazgos" ? "bg-green-50 text-green-700 border-green-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                        }`}>
                          {DECISION_LABELS[p.ultimaDecision.decision] ?? p.ultimaDecision.decision}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            );
          })()}
        </div>

      </div>
    </div>
  );
}
