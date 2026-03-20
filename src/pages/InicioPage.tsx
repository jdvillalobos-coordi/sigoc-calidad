import React from "react";
import { eventos, alertasIA, personas, vehiculos, guias, PAISES_REGIONALES } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { EstadoPersonaBadge, formatCurrency } from "@/lib/utils-app";
import { FolderOpen, Clock, Bot, ChevronRight, Users, Car, MapPin, Building2, CalendarDays, X, AlertTriangle, PackageSearch, DollarSign, ArrowRight, Plus } from "lucide-react";
import { format, subDays, isAfter, isBefore, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import type { AlertaIA, CategoriaEvento } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { DateRange } from "react-day-picker";

const PERIODOS = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Todo", days: 0 },
] as const;

const CATS: { value: CategoriaEvento | "todas"; label: string }[] = [
  { value: "todas",             label: "Todas" },
  { value: "dineros",           label: "💰 Dineros" },
  { value: "unidades",          label: "📦 Unidades" },
  { value: "listas_vinculantes",label: "📋 Listas" },
  { value: "pqr",               label: "📞 PQR" },
  { value: "disciplinarios",    label: "⚖️ Disciplinarios" },
];

const RANKING_TABS = [
  { id: "regionales",  label: "Regionales", icon: MapPin },
  { id: "terminales",  label: "Terminales", icon: Building2 },
  { id: "personas",    label: "Personas",   icon: Users },
  { id: "vehiculos",   label: "Vehículos",  icon: Car },
] as const;

type RankingTab = typeof RANKING_TABS[number]["id"];

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
      <div className="h-full bg-primary rounded-full" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%` }} />
    </div>
  );
}

export default function InicioPage() {
  const { setPaginaActiva, abrirPersona, abrirVehiculo, abrirTerminal, abrirGuia, setNuevaRegistroAbierto } = useApp();
  const [alertas, setAlertas]     = React.useState<AlertaIA[]>(alertasIA);
  const [periodo, setPeriodo]     = React.useState<number>(30);
  const [cat, setCat]             = React.useState<CategoriaEvento | "todas">("todas");
  const [tab, setTab]             = React.useState<RankingTab>("regionales");
  const [dateRange, setDateRange] = React.useState<DateRange | undefined>(undefined);
  const [calOpen, setCalOpen]     = React.useState(false);

  /* ── Filtrado ── */
  const filtrados = React.useMemo(() => {
    return eventos.filter((e) => {
      const fecha = new Date(e.fecha);
      let okFecha = true;
      if (dateRange?.from || dateRange?.to) {
        if (dateRange.from) okFecha = okFecha && !isBefore(fecha, startOfDay(dateRange.from));
        if (dateRange.to)   okFecha = okFecha && !isAfter(fecha, endOfDay(dateRange.to));
      } else if (periodo > 0) {
        okFecha = isAfter(fecha, subDays(new Date(), periodo));
      }
      const okCat = cat === "todas" || e.categoria === cat;
      return okFecha && okCat;
    });
  }, [periodo, cat, dateRange]);

  /* ── KPIs ── */
  const abiertos   = filtrados.filter((e) => e.estado === "abierto");
  const vencidos   = filtrados.filter((e) => e.diasAbierto > 30 && e.estado === "abierto");
  const nuevasIA   = alertas.filter((a) => a.estado === "nueva");
  const criticas   = nuevasIA.filter((a) => a.severidad === "critica");
  const enSeguim   = personas.filter((p) => p.estado === "en_seguimiento" || p.estado === "bloqueado");

  /* ── Brechas de cobertura (guías sin evento asociado) ──
     Son el corazón del valor de la plataforma: casos que DEBEN gestionarse
     pero que nadie ha iniciado todavía.
  ── */
  const guiasConEventos = React.useMemo(() => {
    const set = new Set<string>();
    eventos.forEach((e) => (e.guias ?? []).forEach((g) => set.add(g)));
    return set;
  }, []);

  // Guías con alto valor (>$1M) sin ningún evento → necesitan seguimiento RCE
  const guiasRCESinGestion = React.useMemo(() =>
    guias.filter(
      (g) => g.valorDeclarado >= 1_000_000 && !guiasConEventos.has(g.numero)
    ).slice(0, 5)
  , [guiasConEventos]);

  // Guías con novedad activa sin evento → necesitan investigación
  const guiasFaltantesSinEvento = React.useMemo(() =>
    guias.filter(
      (g) => g.estadoGeneral === "con_novedad" && !guiasConEventos.has(g.numero)
    ).slice(0, 5)
  , [guiasConEventos]);

  const totalSinGestionar = guiasRCESinGestion.length + guiasFaltantesSinEvento.length;

  /* ── Rankings ── */
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

  const rankPersonas = React.useMemo(() => {
    const c: Record<string, { persona: typeof personas[0]; count: number }> = {};
    filtrados.forEach((ev) => {
      [...ev.personasResponsables, ...ev.personasParticipantes].forEach((p) => {
        if (!c[p.personaId]) { const x = personas.find((y) => y.id === p.personaId); if (x) c[p.personaId] = { persona: x, count: 0 }; }
        if (c[p.personaId]) c[p.personaId].count++;
      });
    });
    return Object.values(c).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtrados]);

  const rankVehiculos = React.useMemo(() => {
    const c: Record<string, { vehiculo: typeof vehiculos[0]; count: number }> = {};
    filtrados.forEach((ev) => {
      (ev.vehiculosVinculados ?? []).forEach((v) => {
        if (!c[v.vehiculoId]) { const x = vehiculos.find((y) => y.id === v.vehiculoId); if (x) c[v.vehiculoId] = { vehiculo: x, count: 0 }; }
        if (c[v.vehiculoId]) c[v.vehiculoId].count++;
      });
    });
    return Object.values(c).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtrados]);

  const topAlertas = [...alertas]
    .filter((a) => a.estado !== "descartada")
    .sort((a, b) => ({ critica: 0, alta: 1, media: 2, baja: 3 }[a.severidad] - { critica: 0, alta: 1, media: 2, baja: 3 }[b.severidad]))
    .slice(0, 5);

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
          {/* Períodos rápidos */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
            {PERIODOS.map((p) => (
              <button key={p.label}
                onClick={() => { setPeriodo(p.days); setDateRange(undefined); }}
                className={`px-3 py-1.5 transition-colors ${!dateRange && periodo === p.days ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                {p.label}
              </button>
            ))}
          </div>

          {/* Rango de fechas personalizado */}
          <Popover open={calOpen} onOpenChange={setCalOpen}>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs transition-colors ${dateRange?.from ? "border-primary bg-primary/5 text-primary font-medium" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}>
                <CalendarDays className="w-3.5 h-3.5" />
                {dateRange?.from
                  ? dateRange.to
                    ? `${format(dateRange.from, "d MMM", { locale: es })} – ${format(dateRange.to, "d MMM", { locale: es })}`
                    : format(dateRange.from, "d MMM yyyy", { locale: es })
                  : "Rango personalizado"}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="range"
                selected={dateRange}
                onSelect={(range) => { setDateRange(range); if (range?.from) setPeriodo(0); }}
                locale={es}
                numberOfMonths={2}
                initialFocus
              />
              {dateRange?.from && (
                <div className="flex justify-end px-3 pb-3">
                  <button onClick={() => { setDateRange(undefined); setPeriodo(30); setCalOpen(false); }}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <X className="w-3 h-3" /> Limpiar rango
                  </button>
                </div>
              )}
            </PopoverContent>
          </Popover>

          {/* Categorías */}
          <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card flex-wrap">
            {CATS.map((c) => (
              <button key={c.value} onClick={() => setCat(c.value)}
                className={`px-3 py-1.5 transition-colors ${cat === c.value ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* 4 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Eventos abiertos",        value: abiertos.length,  sub: `de ${filtrados.length} en período`,      icon: FolderOpen, color: "default", onClick: () => setPaginaActiva("registros") },
            { label: "Vencidos >30d",            value: vencidos.length,  sub: vencidos.length > 0 ? "urgente" : "ok",  icon: Clock,      color: vencidos.length > 0 ? "red" : "default", onClick: () => setPaginaActiva("registros") },
            { label: "Alertas IA activas",       value: nuevasIA.length,  sub: criticas.length > 0 ? `${criticas.length} críticas` : "sin críticas", icon: Bot, color: criticas.length > 0 ? "red" : "blue", onClick: () => setPaginaActiva("ia") },
            { label: "Personas en seguimiento",  value: enSeguim.length,  sub: `${personas.filter(p => p.estado === "bloqueado").length} bloqueadas`, icon: Users, color: "amber" },
          ].map(({ label, value, sub, icon: Icon, color, onClick }) => {
            const iconCls = { default: "bg-primary/10 text-primary", red: "bg-destructive/10 text-destructive", amber: "bg-amber-100 text-amber-600", blue: "bg-blue-100 text-blue-600" }[color as string];
            const valCls  = { default: "text-foreground", red: "text-destructive", amber: "text-amber-600", blue: "text-blue-600" }[color as string];
            return (
              <button key={label} onClick={onClick}
                className={`bg-card border border-border rounded-xl p-4 flex flex-col gap-2 text-left w-full transition-all ${onClick ? "hover:shadow-md hover:border-primary/30 cursor-pointer" : "cursor-default"}`}>
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

        {/* Alertas IA */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" /> Alertas IA
            </h2>
            <button onClick={() => setPaginaActiva("ia")} className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-2">
            {topAlertas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-xl text-sm">
                <Bot className="w-7 h-7 mx-auto mb-2 opacity-30" />Sin alertas activas
              </div>
            ) : topAlertas.map((a) => {
              const dot = { critica: "bg-destructive", alta: "bg-orange-500", media: "bg-amber-400", baja: "bg-green-500" }[a.severidad];
              const bg  = { critica: "border-destructive/20 bg-destructive/5", alta: "border-orange-200 bg-orange-50", media: "border-amber-200 bg-amber-50", baja: "border-green-200 bg-green-50" }[a.severidad];
              return (
                <div key={a.id} className={`rounded-xl border p-3.5 ${bg}`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{a.titulo}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2 leading-relaxed">{a.descripcion}</p>
                      {a.entidadesInvolucradas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          {a.entidadesInvolucradas.map((e) => (
                            <button key={e.id}
                              onClick={() => e.tipo === "persona" ? abrirPersona(e.id) : abrirTerminal(e.nombre)}
                              className="text-[11px] font-medium text-primary underline hover:no-underline">{e.nombre}</button>
                          ))}
                        </div>
                      )}
                    </div>
                    {a.estado === "nueva" && (
                      <button onClick={() => setAlertas((prev) => prev.map((x) => x.id === a.id ? { ...x, estado: "revisada" } : x))}
                        className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">
                        Marcar revisada
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Ranking con tabs */}
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {RANKING_TABS.map(({ id, label, icon: Icon }) => (
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

          {/* Personas */}
          {tab === "personas" && (
            <div className="divide-y divide-border">
              {rankPersonas.length === 0
                ? <p className="text-center py-8 text-muted-foreground text-xs">Sin datos en el período</p>
                : rankPersonas.map(({ persona, count }, i) => (
                  <div key={persona.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {persona.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => abrirPersona(persona.id)} className="text-xs font-semibold text-foreground hover:text-primary hover:underline truncate block text-left max-w-full">
                        {persona.nombre}
                      </button>
                      <p className="text-[10px] text-muted-foreground truncate">{persona.cargo} · {persona.terminal}</p>
                    </div>
                    <Bar value={count} max={rankPersonas[0]?.count ?? 1} />
                    <span className="text-xs font-bold text-foreground w-4 text-right flex-shrink-0">{count}</span>
                    <EstadoPersonaBadge estado={persona.estado} />
                  </div>
                ))}
            </div>
          )}

          {/* Vehículos */}
          {tab === "vehiculos" && (
            <div className="divide-y divide-border">
              {rankVehiculos.length === 0
                ? <p className="text-center py-8 text-muted-foreground text-xs">Sin vehículos vinculados en el período</p>
                : rankVehiculos.map(({ vehiculo, count }, i) => (
                  <div key={vehiculo.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center flex-shrink-0">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => abrirVehiculo(vehiculo.id)} className="text-xs font-semibold text-foreground hover:text-primary hover:underline text-left">{vehiculo.placa}</button>
                      <p className="text-[10px] text-muted-foreground">{vehiculo.tipo}</p>
                    </div>
                    <Bar value={count} max={rankVehiculos[0]?.count ?? 1} />
                    <span className="text-xs font-bold text-foreground w-4 text-right flex-shrink-0">{count}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border flex-shrink-0 ${vehiculo.estado === "bloqueado" ? "bg-destructive/10 text-destructive border-destructive/20" : "bg-green-100 text-green-700 border-green-200"}`}>
                      {vehiculo.estado === "bloqueado" ? "Bloqueado" : "Activo"}
                    </span>
                  </div>
                ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
