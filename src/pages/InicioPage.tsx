import React from "react";
import { eventos, alertasIA, guias, insumosRCE, insumosFaltantes, usuarioLogueado } from "@/data/mockData";
import { useApp } from "@/context/AppContext";

import { FolderOpen, Clock, Bot, Inbox, Briefcase, ArrowUpRight, Check, CalendarDays, X } from "lucide-react";
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

export default function InicioPage() {
  const { setPaginaActiva, irARegistros } = useApp();
  const [cat, setCat]             = React.useState<CategoriaEvento | "todas">("todas");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen]     = React.useState(false);

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

  /* Mi trabajo */
  const misEventos    = eventos.filter((e) => e.asignadoA.id === usuarioLogueado.id && e.estadoFlujo !== "cerrado");
  const escaladosAMi  = eventos.filter((e) => e.escaladoA?.id === usuarioLogueado.id && e.estadoFlujo === "escalado");
  const misCerrados   = eventos.filter((e) => e.asignadoA.id === usuarioLogueado.id && e.estadoFlujo === "cerrado");

  /* KPIs */
  const abiertos        = filtrados.filter((e) => e.estadoFlujo === "abierto");
  const cerradosPeriodo = filtrados.filter((e) => e.estadoFlujo === "cerrado");
  const escaladosTotal  = filtrados.filter((e) => e.estadoFlujo === "escalado");
  const vencidos        = filtrados.filter((e) => e.diasAbierto > 30 && e.estado === "abierto");
  const nuevasIA        = alertasIA.filter((a) => a.estado === "nueva");
  const criticas        = nuevasIA.filter((a) => a.severidad === "critica");

  const totalSinGestionar = React.useMemo(() => {
    const conEventos = new Set<string>();
    eventos.forEach((e) => (e.guias ?? []).forEach((g) => conEventos.add(g.trim())));
    return guias.filter((g) => !conEventos.has(g.numero.trim()) && (g.valorDeclarado >= 1_000_000 || g.estadoGeneral === "con_novedad")).length;
  }, []);

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Panel de Control</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{fechaHoy}</p>
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

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: "Insumos pendientes",  value: insumosRCE.filter(i => i.estadoRevision === "pendiente").length + insumosFaltantes.filter(i => i.estadoRevision === "pendiente").length, sub: "guías por revisar hoy", icon: Inbox, color: "amber", onClick: () => setPaginaActiva("bandeja") },
            { label: "Eventos abiertos",    value: abiertos.length,        sub: `de ${filtrados.length} en período`, icon: FolderOpen, color: "default", onClick: () => irARegistros({ soloAbiertos: true, etiqueta: "Eventos abiertos" }) },
            { label: "Eventos cerrados",    value: cerradosPeriodo.length,  sub: "en período", icon: Check, color: "green", onClick: () => irARegistros({ soloCerrados: true, etiqueta: "Eventos cerrados" }) },
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

      </div>
    </div>
  );
}
