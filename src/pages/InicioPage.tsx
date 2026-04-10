import React from "react";
import { eventos, alertasIA, guias, insumosRCE, insumosFaltantes, usuarioLogueado } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

import { FolderOpen, Clock, Bot, Inbox, Briefcase, ArrowUpRight, Check, CalendarDays, X, BarChart3, Timer } from "lucide-react";
import { eventoSinAsignarSlaCritico } from "@/lib/evento-sla";
import { format, isBefore, startOfDay, isAfter, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

export default function InicioPage() {
  const { setPaginaActiva, irARegistros, dataVersion } = useApp();

  /* Mi trabajo */
  const misEventos    = React.useMemo(() => eventos.filter((e) => e.asignadoA?.id === usuarioLogueado.id && e.estadoFlujo !== "cerrado"), [dataVersion]);
  const escaladosAMi  = React.useMemo(() => eventos.filter((e) => e.escaladoA?.id === usuarioLogueado.id && e.estadoFlujo === "escalado"), [dataVersion]);
  const misCerrados   = React.useMemo(() => eventos.filter((e) => e.asignadoA?.id === usuarioLogueado.id && e.estadoFlujo === "cerrado"), [dataVersion]);

  /* KPIs — sobre todos los eventos, sin filtro */
  const abiertos       = React.useMemo(() => eventos.filter((e) => e.estadoFlujo === "abierto"), [dataVersion]);
  const cerradosTotal  = React.useMemo(() => eventos.filter((e) => e.estadoFlujo === "cerrado"), [dataVersion]);
  const escaladosTotal = React.useMemo(() => eventos.filter((e) => e.estadoFlujo === "escalado"), [dataVersion]);
  const vencidos       = React.useMemo(() => eventos.filter((e) => e.diasAbierto > 30 && e.estado === "abierto"), [dataVersion]);
  const sinAsignarSla  = React.useMemo(() => eventos.filter(eventoSinAsignarSlaCritico).length, [dataVersion]);
  const nuevasIA       = alertasIA.filter((a) => a.estado === "nueva");
  const criticas       = nuevasIA.filter((a) => a.severidad === "critica");

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Panel de Control</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{fechaHoy}</p>
        </div>

        {/* Mi trabajo */}
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <Briefcase className="w-4 h-4 text-primary" /> Mi trabajo — {usuarioLogueado.nombre}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <button onClick={() => irARegistros({ soloMios: true, soloAbiertos: true, etiqueta: "Mis eventos activos" })}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-left w-full hover:shadow-md hover:border-primary/30 transition-all">
              <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                <FolderOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-foreground">{misEventos.length}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Mis eventos activos</div>
              </div>
            </button>
            <button onClick={() => irARegistros({ soloEscaladosAMi: true, etiqueta: "Escalados a mí" })}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-left w-full hover:shadow-md hover:border-primary/30 transition-all">
              <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <ArrowUpRight className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className={`text-2xl font-bold ${escaladosAMi.length > 0 ? "text-amber-600" : "text-foreground"}`}>{escaladosAMi.length}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Escalados a mí</div>
              </div>
            </button>
            <button onClick={() => irARegistros({ soloMios: true, soloCerrados: true, etiqueta: "Mis eventos cerrados" })}
              className="bg-card border border-border rounded-xl p-4 flex items-center gap-3 text-left w-full hover:shadow-md hover:border-primary/30 transition-all">
              <div className="w-10 h-10 rounded-lg bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                <Check className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-2xl font-bold text-foreground">{misCerrados.length}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">Mis eventos cerrados</div>
              </div>
            </button>
          </div>
        </div>

        {/* Trabajo general */}
        <div>
          <h2 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
            <FolderOpen className="w-4 h-4 text-primary" /> Trabajo general
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 -mt-3">
          {[
            { label: "Insumos pendientes",  value: insumosRCE.filter(i => i.estadoRevision === "pendiente").length + insumosFaltantes.filter(i => i.estadoRevision === "pendiente").length, sub: "guías por revisar hoy", icon: Inbox, color: "amber", onClick: () => setPaginaActiva("bandeja") },
            { label: "Eventos abiertos",    value: abiertos.length,        sub: `de ${eventos.length} totales`, icon: FolderOpen, color: "default", onClick: () => irARegistros({ soloAbiertos: true, etiqueta: "Eventos abiertos" }) },
            { label: "Eventos cerrados",    value: cerradosTotal.length,   sub: "totales", icon: Check, color: "green", onClick: () => irARegistros({ soloCerrados: true, etiqueta: "Eventos cerrados" }) },
            { label: "Sin asignar >24 h",   value: sinAsignarSla,           sub: sinAsignarSla > 0 ? "Requieren asignación" : "al día", icon: Timer, color: sinAsignarSla > 0 ? "red" : "default", onClick: () => irARegistros({ soloSinAsignar24h: true, etiqueta: "Sin asignar >24 h" }) },
            { label: "Vencidos >30d",       value: vencidos.length,         sub: vencidos.length > 0 ? "urgente" : "al día", icon: Clock, color: vencidos.length > 0 ? "red" : "default", onClick: () => irARegistros({ soloVencidos: true, etiqueta: "Vencidos >30d" }) },
            { label: "Escalados activos",   value: escaladosTotal.length,   sub: escaladosTotal.length > 0 ? "requieren atención" : "sin escalados", icon: ArrowUpRight, color: escaladosTotal.length > 0 ? "amber" : "default", onClick: () => irARegistros({ estadoFlujo: "escalado", etiqueta: "Escalados activos" }) },
            { label: "Alertas IA activas",  value: nuevasIA.length,         sub: criticas.length > 0 ? `${criticas.length} críticas` : "sin críticas", icon: Bot, color: criticas.length > 0 ? "red" : "blue", onClick: () => setPaginaActiva("ia") },
          ].map(({ label, value, sub, icon: Icon, color, onClick }) => {
            const iconCls = { default: "bg-primary/10 text-primary", red: "bg-destructive/10 text-destructive", amber: "bg-amber-100 text-amber-600", blue: "bg-blue-100 text-blue-600", green: "bg-green-100 text-green-600" }[color as string];
            const valCls  = { default: "text-foreground", red: "text-destructive", amber: "text-amber-600", blue: "text-blue-600", green: "text-green-600" }[color as string];
            return (
              <button key={label} onClick={onClick}
                className="bg-card border border-border rounded-xl p-4 flex flex-col gap-2 text-left w-full transition-all hover:shadow-md hover:border-primary/30 cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconCls}`}><Icon className="w-3.5 h-3.5" /></div>
                </div>
                <div className={`text-2xl font-bold ${valCls}`}>{value}</div>
                <div className="text-[11px] text-muted-foreground leading-tight">{sub}</div>
              </button>
            );
          })}
        </div>

        {/* ── Consulta de eventos ── */}
        <ConsultaEventos dataVersion={dataVersion} />

      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Consulta de eventos — desglose interactivo por categoría           */
/* ------------------------------------------------------------------ */

const CAT_CARDS: { key: string; label: string; icon: string; border: string; bg: string; bar: string }[] = [
  { key: "dineros",           label: "Dineros",            icon: "💰", border: "border-amber-200",  bg: "bg-amber-50",  bar: "bg-amber-500" },
  { key: "unidades",          label: "Unidades",           icon: "📦", border: "border-blue-200",   bg: "bg-blue-50",   bar: "bg-blue-500" },
  { key: "listas_vinculantes",label: "Listas Vinculantes", icon: "📋", border: "border-purple-200", bg: "bg-purple-50", bar: "bg-purple-500" },
  { key: "pqr",               label: "PQR",                icon: "📞", border: "border-cyan-200",   bg: "bg-cyan-50",   bar: "bg-cyan-500" },
  { key: "disciplinarios",    label: "Disciplinarios",     icon: "⚖️", border: "border-red-200",    bg: "bg-red-50",    bar: "bg-red-500" },
  { key: "eventos_seguridad", label: "Eventos Seguridad",  icon: "🛡️", border: "border-orange-200", bg: "bg-orange-50", bar: "bg-orange-500" },
  { key: "evidencias",        label: "Evidencias",         icon: "📸", border: "border-green-200",  bg: "bg-green-50",  bar: "bg-green-500" },
];

function ConsultaEventos({ dataVersion }: { dataVersion: number }) {
  const [catAbierta, setCatAbierta] = React.useState<string | null>(null);
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen]     = React.useState(false);

  const filtrados = React.useMemo(() => {
    if (!dateRange?.from && !dateRange?.to) return eventos;
    return eventos.filter((e) => {
      const fecha = new Date(e.fecha);
      let ok = true;
      if (dateRange?.from) ok = ok && !isBefore(fecha, startOfDay(dateRange.from));
      if (dateRange?.to)   ok = ok && !isAfter(fecha, endOfDay(dateRange.to));
      return ok;
    });
  }, [dateRange, dataVersion]);

  const conteos = React.useMemo(() => {
    const map: Record<string, number> = {};
    filtrados.forEach((e) => { map[e.categoria] = (map[e.categoria] || 0) + 1; });
    return map;
  }, [filtrados]);

  const desglose = React.useMemo(() => {
    if (!catAbierta) return [];
    const map: Record<string, { count: number; abiertos: number; cerrados: number }> = {};
    filtrados
      .filter((e) => e.categoria === catAbierta)
      .forEach((e) => {
        if (!map[e.tipoEvento]) map[e.tipoEvento] = { count: 0, abiertos: 0, cerrados: 0 };
        map[e.tipoEvento].count++;
        if (e.estadoFlujo === "cerrado") map[e.tipoEvento].cerrados++;
        else map[e.tipoEvento].abiertos++;
      });
    return Object.entries(map)
      .map(([tipo, data]) => ({ tipo, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filtrados, catAbierta]);

  const catInfo = CAT_CARDS.find((c) => c.key === catAbierta);
  const totalCat = conteos[catAbierta ?? ""] ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Consulta de eventos
        </h2>
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
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar mode="range" selected={dateRange} onSelect={setDateRange} locale={es} numberOfMonths={2} initialFocus />
            {dateRange?.from && (
              <div className="flex justify-end px-3 pb-3">
                <button onClick={() => { setDateRange(undefined); setCalOpen(false); }}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <X className="w-3 h-3" /> Limpiar
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">Selecciona una categoría para ver el desglose por tipo de evento</p>

      {/* Tarjetas de categoría */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {CAT_CARDS.map((c) => {
          const n = conteos[c.key] ?? 0;
          const activa = catAbierta === c.key;
          return (
            <button key={c.key}
              onClick={() => setCatAbierta(activa ? null : c.key)}
              className={`rounded-xl p-3 text-center transition-all border ${activa ? `${c.border} ${c.bg} shadow-sm` : "border-border bg-card hover:border-muted-foreground/30"}`}>
              <div className="text-lg">{c.icon}</div>
              <div className="text-xl font-bold text-foreground mt-1">{n}</div>
              <div className="text-[10px] text-muted-foreground leading-tight">{c.label}</div>
            </button>
          );
        })}
      </div>

      {/* Desglose de la categoría seleccionada */}
      {catAbierta && catInfo && (
        <div className={`border ${catInfo.border} rounded-xl p-5 ${catInfo.bg} transition-all`}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground">
              {catInfo.icon} {catInfo.label} — {totalCat} eventos
            </h3>
            <button onClick={() => setCatAbierta(null)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cerrar</button>
          </div>

          {desglose.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin eventos en esta categoría para el período seleccionado</p>
          ) : (
            <div className="space-y-2.5">
              {desglose.map((d) => {
                const pct = Math.round((d.count / totalCat) * 100);
                return (
                  <div key={d.tipo}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-foreground font-medium">{d.tipo}</span>
                      <span className="text-xs font-bold text-foreground">{d.count} <span className="font-normal text-muted-foreground">({pct}%)</span></span>
                    </div>
                    <div className="flex h-4 bg-white/60 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${catInfo.bar} transition-all`} style={{ width: `${Math.max(pct, 3)}%` }} />
                    </div>
                    <div className="flex gap-3 mt-0.5">
                      <span className="text-[10px] text-muted-foreground">{d.abiertos} abiertos</span>
                      <span className="text-[10px] text-muted-foreground">{d.cerrados} cerrados</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
