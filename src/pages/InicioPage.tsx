import React, { useState } from "react";
import { registros, alertasIA, personas, vehiculos, PAISES_REGIONALES, TODAS_TERMINALES, REGIONALES_FLAT } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { TrendingUp, TrendingDown, FileText, AlertTriangle, Clock, CheckCircle, Users, Truck, CalendarIcon, ChevronDown, X } from "lucide-react";
import { format, isWithinInterval, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

// ── helpers ───────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round((a / b) * 100);
}

function regionalDeTerminal(terminal: string): string {
  for (const [, regionales] of Object.entries(PAISES_REGIONALES)) {
    for (const [regional, terminalesList] of Object.entries(regionales)) {
      if (terminalesList.includes(terminal)) return regional;
    }
  }
  return "Otras";
}

// ── sub-componentes ───────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, trend, trendUp, color = "primary", icon: Icon,
}: {
  label: string; value: number | string; sub?: string; trend?: string;
  trendUp?: boolean; color?: "primary"|"red"|"amber"|"green"|"purple"; icon: React.ElementType;
}) {
  const colorMap = {
    primary: "bg-primary/8 text-primary",
    red:     "bg-red-50 text-red-600",
    amber:   "bg-amber-50 text-amber-600",
    green:   "bg-green-50 text-green-600",
    purple:  "bg-purple-50 text-purple-600",
  };
  return (
    <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className="text-3xl font-bold text-foreground">{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
      {trend && (
        <div className={`flex items-center gap-1 text-xs font-medium ${trendUp ? "text-green-600" : "text-red-500"}`}>
          {trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {trend}
        </div>
      )}
    </div>
  );
}

function BarChart({ data, label, colorClass = "bg-primary" }: {
  data: { name: string; value: number }[]; label: string; colorClass?: string;
}) {
  const max = Math.max(...data.map((d) => d.value), 1);
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">{label}</h3>
      <div className="space-y-2.5">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground w-24 flex-shrink-0 truncate">{d.name}</span>
            <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-500 ${colorClass}`} style={{ width: `${pct(d.value, max)}%` }} />
            </div>
            <span className="text-xs font-semibold text-foreground w-6 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutStat({ label, segments }: {
  label: string; segments: { name: string; value: number; color: string }[];
}) {
  const total = segments.reduce((s, x) => s + x.value, 0);
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-4">{label}</h3>
      <div className="space-y-2">
        {segments.map((seg) => (
          <div key={seg.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${seg.color}`} />
              <span className="text-xs text-foreground">{seg.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-muted rounded-full h-1.5 overflow-hidden">
                <div className={`h-full rounded-full ${seg.color}`} style={{ width: `${pct(seg.value, total)}%` }} />
              </div>
              <span className="text-xs font-semibold text-foreground w-5 text-right">{seg.value}</span>
            </div>
          </div>
        ))}
        <div className="pt-1 border-t border-border flex justify-between text-xs text-muted-foreground">
          <span>Total</span>
          <span className="font-semibold text-foreground">{total}</span>
        </div>
      </div>
    </div>
  );
}

// ── Selector rango de fechas ──────────────────────────────────────────────────

const PRESETS = [
  { label: "Últimos 7 días",  days: 7 },
  { label: "Últimos 30 días", days: 30 },
  { label: "Últimos 90 días", days: 90 },
  { label: "Este año",        days: 365 },
];

function DateRangeButton({ range, onChange }: {
  range: DateRange | undefined;
  onChange: (r: DateRange | undefined) => void;
}) {
  const [open, setOpen] = useState(false);

  const label = range?.from
    ? range.to
      ? `${format(range.from, "dd MMM", { locale: es })} – ${format(range.to, "dd MMM yyyy", { locale: es })}`
      : format(range.from, "dd MMM yyyy", { locale: es })
    : "Todas las fechas";

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
          range?.from
            ? "bg-primary text-primary-foreground border-primary"
            : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <CalendarIcon className="w-3 h-3" />
          {label}
          {range?.from && (
            <span
              className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}
            >
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          {/* Presets */}
          <div className="border-r border-border p-3 flex flex-col gap-1 min-w-[140px]">
            {PRESETS.map((p) => (
              <button
                key={p.label}
                onClick={() => { onChange({ from: subDays(new Date(), p.days), to: new Date() }); setOpen(false); }}
                className="text-left text-xs px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors"
              >
                {p.label}
              </button>
            ))}
            <button
              onClick={() => { onChange(undefined); setOpen(false); }}
              className="text-left text-xs px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors mt-1 border-t border-border pt-2"
            >
              Sin filtro
            </button>
          </div>
          {/* Calendar */}
          <Calendar
            mode="range"
            selected={range}
            onSelect={onChange}
            numberOfMonths={2}
            className={cn("p-3 pointer-events-auto")}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Dropdown select simple ────────────────────────────────────────────────────

function SimpleDropdown({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string;
  onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const isActive = value !== "";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
          isActive ? "bg-primary text-primary-foreground border-primary"
            : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        <span>{label}</span>
        {isActive && <><span className="opacity-70">·</span><span>{value}</span></>}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-lg z-40 min-w-[160px] overflow-hidden">
          <button onClick={() => { onChange(""); setOpen(false); }}
            className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${value === "" ? "font-semibold text-primary" : "text-muted-foreground"}`}>
            {placeholder}
          </button>
          <div className="border-t border-border" />
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${value === opt ? "font-semibold text-primary bg-primary/5" : "text-foreground"}`}>
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sección ranking de incidentes ─────────────────────────────────────────────

function RankingIncidentes({ onAbrirPersona, onAbrirVehiculo }: {
  onAbrirPersona: (id: string) => void;
  onAbrirVehiculo: (id: string) => void;
}) {
  const [regional, setRegional] = useState("");
  const [terminal, setTerminal] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tab, setTab] = useState<"personas" | "vehiculos">("personas");

  function handleRegional(v: string) { setRegional(v); setTerminal(""); }

  const terminalesDisponibles = regional ? REGIONALES_FLAT[regional] ?? [] : TODAS_TERMINALES;

  // Filtrar registros por zona y fecha
  const regFiltrados = registros.filter((r) => {
    const enZona = terminal
      ? r.terminal === terminal
      : regional
        ? (REGIONALES_FLAT[regional] ?? []).includes(r.terminal)
        : true;
    if (!enZona) return false;
    if (dateRange?.from) {
      const fecha = parseISO(r.fecha);
      const to = dateRange.to ?? new Date();
      return isWithinInterval(fecha, { start: dateRange.from, end: to });
    }
    return true;
  });

  // Contar incidentes por persona usando personasVinculadas
  const personaCount: Record<string, number> = {};
  regFiltrados.forEach((r) => {
    (r.personasVinculadas ?? []).forEach(({ personaId }) => {
      personaCount[personaId] = (personaCount[personaId] ?? 0) + 1;
    });
  });

  const topPersonas = personas
    .map((p) => ({ ...p, incidentes: personaCount[p.id] ?? 0 }))
    .filter((p) => p.incidentes > 0)
    .sort((a, b) => b.incidentes - a.incidentes)
    .slice(0, 8);

  // Contar incidentes por vehículo usando vehiculosVinculados
  const vehiculoCount: Record<string, number> = {};
  regFiltrados.forEach((r) => {
    (r.vehiculosVinculados ?? []).forEach(({ vehiculoId }) => {
      vehiculoCount[vehiculoId] = (vehiculoCount[vehiculoId] ?? 0) + 1;
    });
  });
  const topVehiculos = vehiculos
    .map((v) => ({ ...v, incidentes: vehiculoCount[v.id] ?? 0 }))
    .filter((v) => v.incidentes > 0)
    .sort((a, b) => b.incidentes - a.incidentes)
    .slice(0, 8);

  const hayFiltros = regional || terminal || dateRange?.from;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      {/* Header de la sección */}
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Ranking de incidentes por entidad</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Personas y vehículos con más registros asociados en el período seleccionado</p>
        </div>
        {/* Filtros */}
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <DateRangeButton range={dateRange} onChange={setDateRange} />
          <SimpleDropdown label="Regional" options={Object.keys(REGIONALES_FLAT)} value={regional} onChange={handleRegional} placeholder="Todas las regionales" />
          <SimpleDropdown label="Terminal" options={terminalesDisponibles} value={terminal} onChange={setTerminal} placeholder="Todas las terminales" />
          {hayFiltros && (
            <button onClick={() => { setRegional(""); setTerminal(""); setDateRange(undefined); }}
              className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {(["personas", "vehiculos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={cn("px-3 pb-2 text-xs font-medium border-b-2 transition-colors -mb-px",
              tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
            )}>
            {t === "personas" ? `👤 Personas (${topPersonas.length})` : `🚛 Vehículos (${topVehiculos.length})`}
          </button>
        ))}
      </div>

      {/* Contenido */}
      {tab === "personas" && (
        topPersonas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No se encontraron personas con incidentes en el período seleccionado</p>
          </div>
        ) : (
          <div className="space-y-1">
            {topPersonas.map((p, i) => {
              const estadoColor = p.estado === "bloqueado" ? "bg-destructive text-destructive-foreground"
                : p.estado === "en_seguimiento" ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700";
              const estadoLabel = p.estado === "bloqueado" ? "Bloqueado"
                : p.estado === "en_seguimiento" ? "En seguimiento" : "Sin novedad";
              return (
                <button key={p.id} onClick={() => onAbrirPersona(p.id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">
                    {i + 1}
                  </span>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">
                    {p.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.nombre}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.cargo} · {p.terminal} · CC {p.cedula}</div>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${estadoColor}`}>{estadoLabel}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct(p.incidentes, topPersonas[0]?.incidentes ?? 1)}%` }} />
                    </div>
                    <span className="text-xs font-bold text-foreground w-4 text-right">{p.incidentes}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )
      )}

      {tab === "vehiculos" && (
        topVehiculos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Truck className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No se encontraron vehículos con incidentes en el período seleccionado</p>
          </div>
        ) : (
          <div className="space-y-1">
            {topVehiculos.map((v, i) => (
              <button key={v.id} onClick={() => onAbrirVehiculo(v.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group">
                <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0">🚛</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground group-hover:text-primary transition-colors">{v.placa}</div>
                  <div className="text-[10px] text-muted-foreground">{v.tipo}</div>
                </div>
                <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0",
                  v.estado === "bloqueado" ? "bg-destructive/10 text-destructive" : "bg-secondary text-secondary-foreground"
                )}>
                  {v.estado === "bloqueado" ? "Bloqueado" : "Activo"}
                </span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-secondary-foreground/30 rounded-full" style={{ width: `${pct(v.incidentes, topVehiculos[0]?.incidentes ?? 1)}%` }} />
                  </div>
                  <span className="text-xs font-bold text-foreground w-4 text-right">{v.incidentes}</span>
                </div>
              </button>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InicioPage() {
  const { setPaginaActiva, abrirPersona, abrirVehiculo } = useApp();

  const total = registros.length;
  const enInvestigacion = registros.filter((r) => r.estado === "en_investigacion").length;
  const cerrados = registros.filter((r) => r.estado === "cerrado").length;
  const vencidos = registros.filter((r) => r.estado === "vencido").length;
  const pendientes = registros.filter((r) => r.estado === "pendiente").length;
  const bloqueados = registros.filter((r) => r.estado === "bloqueado").length;
  const alertasCriticas = alertasIA.filter((a) => a.severidad === "critica").length;
  const alertasAltas = alertasIA.filter((a) => a.severidad === "alta").length;
  const personasEnSeguimiento = personas.filter((p) => p.estado === "en_seguimiento").length;
  const personasBloqueadas = personas.filter((p) => p.estado === "bloqueado").length;
  const vehiculosBloqueados = vehiculos.filter((v) => v.estado === "bloqueado").length;
  const casosVencidos30d = registros.filter((r) => r.diasAbierto > 30 && r.estado !== "cerrado").length;

  // KPIs operativos del flujo de calidad
  const totalAbiertos = registros.filter((r) => r.estado !== "cerrado").length;
  const registrosCerrados = registros.filter((r) => r.estado === "cerrado");
  const promedioDias = registrosCerrados.length > 0
    ? Math.round(registrosCerrados.reduce((sum, r) => sum + r.diasAbierto, 0) / registrosCerrados.length)
    : 0;
  // "En verificación" = faltantes con stepper en etapa verificacion
  const enVerificacion = registros.filter((r) => {
    if (r.tipo !== "faltante") return false;
    const s = (r as any).stepper;
    return s?.etapaActiva === "verificacion";
  }).length;
  // Casos vencidos sin anotación en 30d (aproximado con diasAbierto)
  const casosVencidosSinGestion = registros.filter((r) => r.estado !== "cerrado" && r.diasAbierto > 30).length;

  const porTipo = [
    { name: "Faltantes",  value: registros.filter((r) => r.tipo === "faltante").length },
    { name: "Eventos",    value: registros.filter((r) => r.tipo === "evento").length },
    { name: "Posventa",   value: registros.filter((r) => r.tipo === "posventa").length },
    { name: "RCE",        value: registros.filter((r) => r.tipo === "rce").length },
    { name: "Evidencias", value: registros.filter((r) => r.tipo === "evidencia").length },
    { name: "Lesivas",    value: registros.filter((r) => r.tipo === "lesiva").length },
    { name: "Contacto",   value: registros.filter((r) => r.tipo === "contacto").length },
  ].sort((a, b) => b.value - a.value);

  const porRegional = Object.entries(REGIONALES_FLAT).map(([reg, terms]) => ({
    name: reg,
    value: registros.filter((r) => terms.includes(r.terminal)).length,
  })).filter((x) => x.value > 0).sort((a, b) => b.value - a.value);

  const estadosSegmentos = [
    { name: "En investigación", value: enInvestigacion, color: "bg-blue-500" },
    { name: "Cerrados",         value: cerrados,        color: "bg-green-500" },
    { name: "Pendientes",       value: pendientes,      color: "bg-amber-400" },
    { name: "Vencidos",         value: vencidos,        color: "bg-red-500" },
    { name: "Bloqueados",       value: bloqueados,      color: "bg-gray-500" },
  ].filter((s) => s.value > 0);

  const terminalesCount: Record<string, number> = {};
  registros.forEach((r) => { terminalesCount[r.terminal] = (terminalesCount[r.terminal] ?? 0) + 1; });
  const topTerminales = Object.entries(terminalesCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard de Calidad</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" · "}Resumen general del sistema
            </p>
          </div>
          <button onClick={() => setPaginaActiva("registros")} className="text-xs text-primary underline hover:no-underline">
            Ver registros →
          </button>
        </div>

        {/* ── KPIs operativos del flujo de calidad (nuevos) ── */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Casos abiertos</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/8 text-primary">
                <FileText className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{totalAbiertos}</div>
              <div className="text-xs text-muted-foreground mt-0.5">de {total} registros totales</div>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-red-500">
              <TrendingUp className="w-3 h-3" />
              +3 vs mes anterior
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Promedio días cierre</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-50 text-green-600">
                <CheckCircle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{promedioDias}d</div>
              <div className="text-xs text-muted-foreground mt-0.5">Promedio en {registrosCerrados.length} casos cerrados</div>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-green-600">
              <TrendingDown className="w-3 h-3" />
              -2d vs mes anterior
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">En verificación</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{enVerificacion}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Esperan agente en campo</div>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-amber-600">
              <Clock className="w-3 h-3" />
              Requieren seguimiento
            </div>
          </div>
          <div className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Casos vencidos</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-50 text-red-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div>
              <div className="text-3xl font-bold text-foreground">{casosVencidosSinGestion}</div>
              <div className="text-xs text-muted-foreground mt-0.5">Más de 30 días sin cierre</div>
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-red-500">
              <TrendingUp className="w-3 h-3" />
              Atención urgente
            </div>
          </div>
        </div>

        {/* KPIs fila 1 */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard label="Total registros" value={total} sub="En toda la plataforma" trend="+8 esta semana" trendUp icon={FileText} color="primary" />
          <KPICard label="En investigación" value={enInvestigacion} sub={`${pct(enInvestigacion, total)}% del total`} icon={Clock} color="amber" />
          <KPICard label="Cerrados" value={cerrados} sub={`Tasa de cierre: ${pct(cerrados, total)}%`} trend="+2 esta semana" trendUp icon={CheckCircle} color="green" />
          <KPICard label="Vencidos (+30d)" value={casosVencidos30d} sub="Sin cierre en más de 30 días" trend="Requieren atención" trendUp={false} icon={AlertTriangle} color="red" />
        </div>

        {/* KPIs fila 2 */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard label="Alertas IA activas" value={alertasIA.length} sub={`${alertasCriticas} críticas · ${alertasAltas} altas`} icon={AlertTriangle} color="red" />
          <KPICard label="Personas en seguimiento" value={personasEnSeguimiento} sub={`${personasBloqueadas} bloqueadas`} icon={Users} color="amber" />
          <KPICard label="Vehículos bloqueados" value={vehiculosBloqueados} sub={`de ${vehiculos.length} en sistema`} icon={Truck} color="purple" />
          <KPICard label="Pendientes de asignar" value={pendientes} sub="Sin responsable asignado" icon={Clock} color="amber" />
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-3 gap-4">
          <BarChart data={porTipo} label="Registros por tipo" colorClass="bg-primary" />
          <BarChart data={porRegional} label="Registros por regional" colorClass="bg-accent-blue" />
          <DonutStat label="Distribución por estado" segments={estadosSegmentos} />
        </div>

        {/* Top terminales + alertas */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-4">Top terminales por actividad</h3>
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-muted-foreground">
                  <th className="text-left pb-2 font-medium">Terminal</th>
                  <th className="text-left pb-2 font-medium">Regional</th>
                  <th className="text-right pb-2 font-medium">Registros</th>
                  <th className="text-right pb-2 font-medium">% del total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {topTerminales.map((t) => (
                  <tr key={t.name} className="hover:bg-muted/50 transition-colors">
                    <td className="py-2 font-medium text-foreground">{t.name}</td>
                    <td className="py-2 text-muted-foreground">{regionalDeTerminal(t.name)}</td>
                    <td className="py-2 text-right font-semibold text-foreground">{t.value}</td>
                    <td className="py-2 text-right text-muted-foreground">{pct(t.value, total)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                Alertas IA recientes
              </h3>
              <button onClick={() => setPaginaActiva("ia")} className="text-xs text-primary hover:underline">Ver todas →</button>
            </div>
            <div className="space-y-2.5">
              {alertasIA.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${a.severidad === "critica" ? "bg-destructive" : a.severidad === "alta" ? "bg-amber-500" : "bg-blue-500"}`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug truncate">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">{a.descripcion.slice(0, 80)}…</p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${a.severidad === "critica" ? "bg-red-100 text-red-700" : a.severidad === "alta" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"}`}>
                    {a.severidad === "critica" ? "Crítica" : a.severidad === "alta" ? "Alta" : "Media"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── RANKING DE INCIDENTES ── */}
        <RankingIncidentes onAbrirPersona={abrirPersona} onAbrirVehiculo={abrirVehiculo} />

      </div>
    </div>
  );
}
