import React, { useState } from "react";
import { registros, alertasIA, personas, vehiculos, PAISES_REGIONALES, TODAS_TERMINALES, REGIONALES_FLAT } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { TipoBadge, EstadoBadge, descripcionCorta } from "@/lib/utils-app";
import { FolderOpen, Clock, Search, Bot, ChevronRight, Users, Truck } from "lucide-react";
import { format, parseISO, isWithinInterval, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { AlertaIA } from "@/types";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, ChevronDown } from "lucide-react";

// ── KPI card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, color = "default", icon: Icon, onClick,
}: {
  label: string; value: number | string; sub?: string;
  color?: "default" | "red" | "amber" | "blue";
  icon: React.ElementType; onClick?: () => void;
}) {
  const iconColor = {
    default: "bg-primary/10 text-primary",
    red:     "bg-destructive/10 text-destructive",
    amber:   "bg-amber-100 text-amber-600",
    blue:    "bg-blue-100 text-blue-600",
  }[color];

  const valueColor = {
    default: "text-foreground",
    red:     "text-destructive",
    amber:   "text-amber-600",
    blue:    "text-blue-600",
  }[color];

  return (
    <button
      onClick={onClick}
      className={`bg-card border border-border rounded-xl p-5 flex flex-col gap-3 text-left transition-all ${onClick ? "hover:shadow-md hover:border-primary/30 cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </button>
  );
}

// ── Alerta card (reutilizable) ────────────────────────────────────────────────

function AlertaCard({
  alerta, onPersona, onTerminal, onMarcar,
}: {
  alerta: AlertaIA;
  onPersona: (id: string) => void;
  onTerminal: (nombre: string) => void;
  onMarcar: (id: string) => void;
}) {
  const dotColor = {
    critica: "bg-destructive",
    alta:    "bg-orange-500",
    media:   "bg-amber-400",
    baja:    "bg-green-500",
  }[alerta.severidad];

  const bgColor = {
    critica: "border-destructive/20 bg-destructive/5",
    alta:    "border-orange-200 bg-orange-50",
    media:   "border-amber-200 bg-amber-50",
    baja:    "border-green-200 bg-green-50",
  }[alerta.severidad];

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{alerta.titulo}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{alerta.descripcion}</p>
          {alerta.entidadesInvolucradas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {alerta.entidadesInvolucradas.map((e) => (
                <button
                  key={e.id}
                  onClick={() => e.tipo === "persona" ? onPersona(e.id) : onTerminal(e.nombre)}
                  className="text-[11px] font-medium text-primary underline hover:no-underline"
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
        {alerta.estado === "nueva" && (
          <button
            onClick={() => onMarcar(alerta.id)}
            className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            Marcar revisada
          </button>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InicioPage() {
  const { setPaginaActiva, abrirRegistro, abrirPersona, abrirVehiculo, abrirTerminal } = useApp();
  const [alertas, setAlertas] = React.useState<AlertaIA[]>(alertasIA);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const abiertos   = registros.filter((r) => r.estado !== "cerrado");
  const vencidos   = registros.filter((r) => r.diasAbierto > 30 && r.estado !== "cerrado");
  const enVerif    = registros.filter((r) => r.tipo === "faltante" && r.stepper?.etapaActiva === "verificacion");
  const alertasNew = alertas.filter((a) => a.estado === "nueva");
  const criticas   = alertasNew.filter((a) => a.severidad === "critica");

  // ── Top 5 alertas sorted by severity ─────────────────────────────────────
  const sevOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
  const topAlertas = [...alertas]
    .filter((a) => a.estado !== "descartada")
    .sort((a, b) => sevOrder[a.severidad] - sevOrder[b.severidad])
    .slice(0, 5);

  // ── Latest 10 records ─────────────────────────────────────────────────────
  const ultimos10 = [...registros]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 10);

  function marcarRevisada(id: string) {
    setAlertas((prev) => prev.map((a) => a.id === id ? { ...a, estado: "revisada" } : a));
  }

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard de Calidad</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{fechaHoy}</p>
        </div>

        {/* Sección 1 — 4 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Casos abiertos"
            value={abiertos.length}
            sub={`de ${registros.length} totales`}
            icon={FolderOpen}
            onClick={() => setPaginaActiva("registros")}
          />
          <KPICard
            label="Vencidos >30d"
            value={vencidos.length}
            sub={vencidos.length > 0 ? "requieren cierre urgente" : "sin vencidos"}
            color={vencidos.length > 0 ? "red" : "default"}
            icon={Clock}
            onClick={() => setPaginaActiva("registros")}
          />
          <KPICard
            label="Esperando verificación"
            value={enVerif.length}
            sub="faltantes en campo"
            color="amber"
            icon={Search}
            onClick={() => setPaginaActiva("registros")}
          />
          <KPICard
            label="Alertas IA activas"
            value={alertasNew.length}
            sub={criticas.length > 0 ? `${criticas.length} críticas` : "sin críticas"}
            color={criticas.length > 0 ? "red" : "blue"}
            icon={Bot}
            onClick={() => setPaginaActiva("ia")}
          />
        </div>

        {/* Sección 2 — Alertas IA */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Alertas IA
            </h2>
            <button
              onClick={() => setPaginaActiva("ia")}
              className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {topAlertas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-xl">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin alertas activas</p>
              </div>
            ) : topAlertas.map((a) => (
              <AlertaCard
                key={a.id}
                alerta={a}
                onPersona={abrirPersona}
                onTerminal={abrirTerminal}
                onMarcar={marcarRevisada}
              />
            ))}
          </div>
        </div>

        {/* Sección 3 — Ranking de incidentes */}
        <RankingIncidentes onAbrirPersona={abrirPersona} onAbrirVehiculo={abrirVehiculo} />

      </div>
    </div>
  );
}

// ── Helpers para ranking ──────────────────────────────────────────────────────

const PRESETS = [
  { label: "Últimos 7 días",  days: 7 },
  { label: "Últimos 30 días", days: 30 },
  { label: "Últimos 90 días", days: 90 },
  { label: "Este año",        days: 365 },
];

function DateRangeButton({ range, onChange }: { range: DateRange | undefined; onChange: (r: DateRange | undefined) => void }) {
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
          range?.from ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <CalendarIcon className="w-3 h-3" />{label}
          {range?.from && (
            <span className="ml-0.5 hover:bg-white/20 rounded-full p-0.5" onClick={(e) => { e.stopPropagation(); onChange(undefined); }}>
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r border-border p-3 flex flex-col gap-1 min-w-[140px]">
            {PRESETS.map((p) => (
              <button key={p.label} onClick={() => { onChange({ from: subDays(new Date(), p.days), to: new Date() }); setOpen(false); }}
                className="text-left text-xs px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors">{p.label}</button>
            ))}
            <button onClick={() => { onChange(undefined); setOpen(false); }}
              className="text-left text-xs px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors mt-1 border-t border-border pt-2">Sin filtro</button>
          </div>
          <Calendar mode="range" selected={range} onSelect={onChange} numberOfMonths={2} className={cn("p-3 pointer-events-auto")} />
        </div>
      </PopoverContent>
    </Popover>
  );
}

function SimpleDropdown({ label, options, value, onChange, placeholder }: { label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder: string }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)}
        className={cn("inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
          value !== "" ? "bg-primary text-primary-foreground border-primary" : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
        <span>{label}</span>
        {value !== "" && <><span className="opacity-70">·</span><span>{value}</span></>}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full mt-1 left-0 bg-card border border-border rounded-xl shadow-lg z-40 min-w-[160px] overflow-hidden">
          <button onClick={() => { onChange(""); setOpen(false); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${value === "" ? "font-semibold text-primary" : "text-muted-foreground"}`}>{placeholder}</button>
          <div className="border-t border-border" />
          {options.map((opt) => (
            <button key={opt} onClick={() => { onChange(opt); setOpen(false); }} className={`w-full text-left px-3 py-2 text-xs hover:bg-muted transition-colors ${value === opt ? "font-semibold text-primary bg-primary/5" : "text-foreground"}`}>{opt}</button>
          ))}
        </div>
      )}
    </div>
  );
}

function pct(a: number, b: number) { return b === 0 ? 0 : Math.round((a / b) * 100); }

function RankingIncidentes({ onAbrirPersona, onAbrirVehiculo }: { onAbrirPersona: (id: string) => void; onAbrirVehiculo: (id: string) => void }) {
  const [regional, setRegional] = useState("");
  const [terminal, setTerminal] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [tab, setTab] = useState<"personas" | "vehiculos">("personas");

  function handleRegional(v: string) { setRegional(v); setTerminal(""); }
  const terminalesDisponibles = regional ? REGIONALES_FLAT[regional] ?? [] : TODAS_TERMINALES;

  const regFiltrados = registros.filter((r) => {
    const enZona = terminal ? r.terminal === terminal : regional ? (REGIONALES_FLAT[regional] ?? []).includes(r.terminal) : true;
    if (!enZona) return false;
    if (dateRange?.from) {
      const fecha = parseISO(r.fecha);
      return isWithinInterval(fecha, { start: dateRange.from, end: dateRange.to ?? new Date() });
    }
    return true;
  });

  const personaCount: Record<string, number> = {};
  regFiltrados.forEach((r) => (r.personasVinculadas ?? []).forEach(({ personaId }) => { personaCount[personaId] = (personaCount[personaId] ?? 0) + 1; }));
  const topPersonas = personas.map((p) => ({ ...p, incidentes: personaCount[p.id] ?? 0 })).filter((p) => p.incidentes > 0).sort((a, b) => b.incidentes - a.incidentes).slice(0, 8);

  const vehiculoCount: Record<string, number> = {};
  regFiltrados.forEach((r) => (r.vehiculosVinculados ?? []).forEach(({ vehiculoId }) => { vehiculoCount[vehiculoId] = (vehiculoCount[vehiculoId] ?? 0) + 1; }));
  const topVehiculos = vehiculos.map((v) => ({ ...v, incidentes: vehiculoCount[v.id] ?? 0 })).filter((v) => v.incidentes > 0).sort((a, b) => b.incidentes - a.incidentes).slice(0, 8);

  const hayFiltros = regional || terminal || dateRange?.from;

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">🏆 Ranking de incidentes por entidad</h3>
          <p className="text-xs text-muted-foreground mt-0.5">Personas y vehículos con más registros asociados</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <DateRangeButton range={dateRange} onChange={setDateRange} />
          <SimpleDropdown label="Regional" options={Object.keys(REGIONALES_FLAT)} value={regional} onChange={handleRegional} placeholder="Todas las regionales" />
          <SimpleDropdown label="Terminal" options={terminalesDisponibles} value={terminal} onChange={setTerminal} placeholder="Todas las terminales" />
          {hayFiltros && (
            <button onClick={() => { setRegional(""); setTerminal(""); setDateRange(undefined); }} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">Limpiar</button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 mb-4 border-b border-border">
        {(["personas", "vehiculos"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={cn("px-3 pb-2 text-xs font-medium border-b-2 transition-colors -mb-px",
            tab === t ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
          )}>
            {t === "personas" ? `👤 Personas (${topPersonas.length})` : `🚛 Vehículos (${topVehiculos.length})`}
          </button>
        ))}
      </div>

      {tab === "personas" && (
        topPersonas.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground"><Users className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin incidentes en el período</p></div>
        ) : (
          <div className="space-y-1">
            {topPersonas.map((p, i) => {
              const estadoColor = p.estado === "bloqueado" ? "bg-destructive/10 text-destructive" : p.estado === "en_seguimiento" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700";
              const estadoLabel = p.estado === "bloqueado" ? "Bloqueado" : p.estado === "en_seguimiento" ? "En seguimiento" : "Sin novedad";
              return (
                <button key={p.id} onClick={() => onAbrirPersona(p.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group">
                  <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                  <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 text-xs font-bold text-primary">{p.nombre.split(" ").map((n) => n[0]).slice(0, 2).join("")}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{p.nombre}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{p.cargo} · {p.terminal} · CC {p.cedula}</div>
                  </div>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${estadoColor}`}>{estadoLabel}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct(p.incidentes, topPersonas[0]?.incidentes ?? 1)}%` }} /></div>
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
          <div className="text-center py-8 text-muted-foreground"><Truck className="w-8 h-8 mx-auto mb-2 opacity-30" /><p className="text-sm">Sin incidentes en el período</p></div>
        ) : (
          <div className="space-y-1">
            {topVehiculos.map((v, i) => (
              <button key={v.id} onClick={() => onAbrirVehiculo(v.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted transition-colors text-left group">
                <span className="text-xs font-bold text-muted-foreground w-5 text-right flex-shrink-0">{i + 1}</span>
                <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-sm flex-shrink-0">🚛</div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-foreground truncate group-hover:text-primary transition-colors">{v.placa}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{v.tipo}</div>
                </div>
                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0 ${v.estado === "bloqueado" ? "bg-destructive/10 text-destructive" : "bg-green-100 text-green-700"}`}>{v.estado === "bloqueado" ? "Bloqueado" : "Activo"}</span>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden"><div className="h-full bg-primary rounded-full" style={{ width: `${pct(v.incidentes, topVehiculos[0]?.incidentes ?? 1)}%` }} /></div>
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
