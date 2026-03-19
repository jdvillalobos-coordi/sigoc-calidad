import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { registros, alertasIA, personas, vehiculos } from "@/data/mockData";
import { TipoBadge, EstadoBadge, SeveridadBadge, AvatarInicial, formatDateTime, descripcionCorta } from "@/lib/utils-app";
import { Plus, ChevronDown, X, CalendarIcon } from "lucide-react";
import { format, isWithinInterval, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

const TIPOS = ["todos", "faltante", "evento", "rce", "posventa", "lesiva", "contacto", "evidencia"] as const;

const REGIONALES: Record<string, string[]> = {
  "Centro":     ["Bogotá"],
  "Sur":        ["Cali", "Pereira"],
  "Oriente":    ["Bucaramanga", "Cartagena"],
  "Occidente":  ["Medellín"],
  "México":     ["México"],
};

const TODAS_TERMINALES = Object.values(REGIONALES).flat().sort();

// ── FilterPill ────────────────────────────────────────────────────────────────

function FilterPill({ label, active, onRemove }: { label: string; active: boolean; onRemove: () => void }) {
  if (!active) return null;
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ── DropdownSelect ────────────────────────────────────────────────────────────

function DropdownSelect({ label, options, value, onChange, placeholder }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void; placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const isActive = value !== "";
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors ${
          isActive ? "bg-primary text-primary-foreground border-primary"
            : "bg-card border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        }`}
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

// ── Date range presets ────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Hoy",             days: 0 },
  { label: "Últimos 7 días",  days: 7 },
  { label: "Últimos 30 días", days: 30 },
  { label: "Últimos 90 días", days: 90 },
];

function DateRangeFilter({ range, onChange }: { range: DateRange | undefined; onChange: (r: DateRange | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const label = range?.from
    ? range.to
      ? `${format(range.from, "dd MMM", { locale: es })} – ${format(range.to, "dd MMM", { locale: es })}`
      : format(range.from, "dd MMM yyyy", { locale: es })
    : "Fechas";

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
            <span className="ml-0.5 hover:bg-white/20 rounded-full p-0.5"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}>
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex">
          <div className="border-r border-border p-3 flex flex-col gap-1 min-w-[140px]">
            {PRESETS.map((p) => (
              <button key={p.label}
                onClick={() => { onChange({ from: p.days === 0 ? new Date() : subDays(new Date(), p.days), to: new Date() }); setOpen(false); }}
                className="text-left text-xs px-3 py-2 rounded-lg hover:bg-muted text-foreground transition-colors">
                {p.label}
              </button>
            ))}
            <button onClick={() => { onChange(undefined); setOpen(false); }}
              className="text-left text-xs px-3 py-2 rounded-lg hover:bg-muted text-muted-foreground transition-colors mt-1 border-t border-border pt-2">
              Sin filtro
            </button>
          </div>
          <Calendar
            mode="range"
            selected={range}
            onSelect={onChange}
            numberOfMonths={1}
            className={cn("p-3 pointer-events-auto")}
          />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── BandejaPage ───────────────────────────────────────────────────────────────

export default function BandejaPage() {
  const { abrirRegistro, abrirPersona, abrirVehiculo, setPaginaActiva, setNuevaRegistroAbierto } = useApp();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");
  const [filtroRegional, setFiltroRegional] = useState<string>("");
  const [filtroTerminal, setFiltroTerminal] = useState<string>("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  function handleRegionalChange(regional: string) {
    setFiltroRegional(regional);
    if (regional && filtroTerminal) {
      const terminalesDeRegional = REGIONALES[regional] ?? [];
      if (!terminalesDeRegional.includes(filtroTerminal)) setFiltroTerminal("");
    }
  }

  const terminalesDisponibles = filtroRegional ? REGIONALES[filtroRegional] ?? [] : TODAS_TERMINALES;

  const feed = [...registros]
    .filter((r) => filtroTipo === "todos" || r.tipo === filtroTipo)
    .filter((r) => {
      if (filtroTerminal) return r.terminal === filtroTerminal;
      if (filtroRegional) return (REGIONALES[filtroRegional] ?? []).includes(r.terminal);
      return true;
    })
    .filter((r) => {
      if (!dateRange?.from) return true;
      const fecha = parseISO(r.fecha);
      const to = dateRange.to ?? new Date();
      return isWithinInterval(fecha, { start: dateRange.from, end: to });
    })
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 30);

  const hayFiltrosActivos = filtroRegional !== "" || filtroTerminal !== "" || !!dateRange?.from;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-bold text-foreground">Buenos días, Sandra 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setNuevaRegistroAbierto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo registro
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Feed actividad */}
          <div className="col-span-2">
            {/* Filtros tipo */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              {TIPOS.map((t) => (
                <button key={t} onClick={() => setFiltroTipo(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    filtroTipo === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}>
                  {t === "todos" ? "Todos" : t === "faltante" ? "Faltantes" : t === "evento" ? "Eventos" : t === "rce" ? "RCE" : t === "posventa" ? "Posventa" : t === "lesiva" ? "Lesivas" : t === "contacto" ? "Contacto" : "Evidencias"}
                </button>
              ))}
            </div>

            {/* Filtros zona + fecha */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              <DropdownSelect label="Regional" options={Object.keys(REGIONALES)} value={filtroRegional} onChange={handleRegionalChange} placeholder="Todas las regionales" />
              <DropdownSelect label="Terminal" options={terminalesDisponibles} value={filtroTerminal} onChange={setFiltroTerminal} placeholder="Todas las terminales" />
              <DateRangeFilter range={dateRange} onChange={setDateRange} />
              {hayFiltrosActivos && (
                <button onClick={() => { setFiltroRegional(""); setFiltroTerminal(""); setDateRange(undefined); }}
                  className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                  Limpiar filtros
                </button>
              )}
            </div>

            {/* Pills activas + contador */}
            {hayFiltrosActivos && (
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <span className="text-xs text-muted-foreground">Filtrando por:</span>
                <FilterPill label={`Regional: ${filtroRegional}`} active={filtroRegional !== ""} onRemove={() => handleRegionalChange("")} />
                <FilterPill label={`Terminal: ${filtroTerminal}`} active={filtroTerminal !== ""} onRemove={() => setFiltroTerminal("")} />
                {dateRange?.from && (
                  <FilterPill
                    label={`Fechas: ${format(dateRange.from, "dd MMM", { locale: es })}${dateRange.to ? ` – ${format(dateRange.to, "dd MMM", { locale: es })}` : ""}`}
                    active
                    onRemove={() => setDateRange(undefined)}
                  />
                )}
                <span className="text-xs text-muted-foreground">· {feed.length} resultado{feed.length !== 1 ? "s" : ""}</span>
              </div>
            )}

            {/* Feed */}
            <div className="space-y-2">
              {feed.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center text-muted-foreground">
                  <span className="text-4xl mb-3">🔍</span>
                  <p className="text-sm font-medium">No se encontraron registros</p>
                  <p className="text-xs mt-1">Intenta ajustar los filtros de búsqueda.</p>
                </div>
              ) : (
                feed.map((r) => (
                  <button key={r.id} onClick={() => abrirRegistro(r.id)}
                    className="w-full bg-card border border-border rounded-xl p-4 text-left hover:shadow-card-hover hover:border-ring/30 transition-all group">
                    <div className="flex items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <TipoBadge tipo={r.tipo} />
                          <span className="text-xs font-mono text-muted-foreground">{r.id}</span>
                          <EstadoBadge estado={r.estado} />
                        </div>
                        <p className="text-sm font-medium text-foreground truncate">{descripcionCorta(r)}</p>
                        <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                          <span>📍 {r.terminal}</span>
                          <span>🗓 {r.fecha}</span>
                          <span>👤 {r.responsableNombre}</span>
                          {r.diasAbierto > 0 && (
                            <span className={r.diasAbierto > 30 ? "text-destructive font-medium" : ""}>
                              {r.diasAbierto}d abierto
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="text-muted-foreground group-hover:text-foreground transition-colors text-xs">→</div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Panel IA */}
          <div>
            <div className="sticky top-0">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                Alertas IA activas
              </h2>
              <div className="space-y-3">
                {alertasIA.map((a) => (
                  <div key={a.id}
                    className={`border rounded-xl p-3 ${
                      a.severidad === "critica" ? "bg-red-50 border-red-200" :
                      a.severidad === "alta" ? "bg-amber-50 border-amber-200" :
                      "bg-blue-50 border-blue-200"
                    }`}>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <SeveridadBadge severidad={a.severidad} />
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-snug mb-1">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground leading-snug mb-2">{a.descripcion.slice(0, 100)}...</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {a.entidadesInvolucradas.map((e) => (
                        <button key={e.id}
                          className="text-xs text-coordinadora-blue underline hover:no-underline"
                          onClick={(ev) => { ev.stopPropagation(); if (e.tipo === "persona") abrirPersona(e.id); else if (e.tipo === "vehiculo") abrirVehiculo(e.id); }}>
                          {e.nombre}
                        </button>
                      ))}
                    </div>
                    <button onClick={() => setPaginaActiva("ia")} className="text-xs font-medium text-coordinadora-blue hover:underline">
                      Ver detalle →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
