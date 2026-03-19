import React, { useState } from "react";
import { registros, terminales } from "@/data/mockData";
import { TipoBadge, EstadoBadge, descripcionCorta, formatDate } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import { Plus, ChevronUp, ChevronDown, CalendarIcon, X } from "lucide-react";
import type { TipoRegistro, EstadoRegistro } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, parseISO, subDays } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

const TIPOS: { value: TipoRegistro | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los tipos" },
  { value: "faltante", label: "🔵 Faltante" },
  { value: "evento", label: "🔴 Evento" },
  { value: "rce", label: "🟢 RCE" },
  { value: "posventa", label: "🟣 Posventa" },
  { value: "lesiva", label: "⚫ Act. Lesiva" },
  { value: "contacto", label: "🟡 Cuadro Contacto" },
  { value: "evidencia", label: "🟠 Evidencia" },
];

const ESTADOS: { value: EstadoRegistro | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "en_investigacion", label: "En investigación" },
  { value: "cerrado", label: "Cerrado" },
  { value: "vencido", label: "Vencido" },
  { value: "pendiente", label: "Pendiente" },
  { value: "bloqueado", label: "Bloqueado" },
];

const REGIONALES: Record<string, string[]> = {
  "Centro":    ["Bogotá"],
  "Sur":       ["Cali", "Pereira"],
  "Oriente":   ["Bucaramanga", "Cartagena"],
  "Occidente": ["Medellín"],
  "México":    ["México"],
};

const PRESETS = [
  { label: "Hoy",             days: 0 },
  { label: "Últimos 7 días",  days: 7 },
  { label: "Últimos 30 días", days: 30 },
  { label: "Últimos 90 días", days: 90 },
];

// ── FilterPill ──────────────────────────────────────────────────────────────
function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

// ── DateRangeFilter ─────────────────────────────────────────────────────────
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
            : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
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

// ── RegistrosPage ───────────────────────────────────────────────────────────
export default function RegistrosPage() {
  const { abrirRegistro, setNuevaRegistroAbierto, busquedaQuery } = useApp();
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [regionalFiltro, setRegionalFiltro] = useState("todos");
  const [terminalFiltro, setTerminalFiltro] = useState("todos");
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [sortField, setSortField] = useState<"fecha" | "diasAbierto" | "id">("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  function handleRegionalChange(val: string) {
    setRegionalFiltro(val);
    setTerminalFiltro("todos");
    setPage(1);
  }

  const terminalesDisponibles =
    regionalFiltro !== "todos"
      ? REGIONALES[regionalFiltro] ?? []
      : terminales;

  const q = busquedaQuery.toLowerCase().trim();

  const filtered = registros
    .filter((r) => tipoFiltro === "todos" || r.tipo === tipoFiltro)
    .filter((r) => estadoFiltro === "todos" || r.estado === estadoFiltro)
    .filter((r) => {
      if (terminalFiltro !== "todos") return r.terminal === terminalFiltro;
      if (regionalFiltro !== "todos") return (REGIONALES[regionalFiltro] ?? []).includes(r.terminal);
      return true;
    })
    .filter((r) => {
      if (!dateRange?.from) return true;
      const fecha = parseISO(r.fecha);
      const to = dateRange.to ?? new Date();
      return isWithinInterval(fecha, { start: dateRange.from, end: to });
    })
    .filter((r) => {
      if (!q) return true;
      return (
        r.id.toLowerCase().includes(q) ||
        r.terminal.toLowerCase().includes(q) ||
        r.responsableNombre.toLowerCase().includes(q) ||
        descripcionCorta(r).toLowerCase().includes(q) ||
        (r.guia && r.guia.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "fecha") cmp = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      else if (sortField === "diasAbierto") cmp = a.diasAbierto - b.diasAbierto;
      else cmp = a.id.localeCompare(b.id);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <span className="text-muted-foreground/40">↕</span>;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  const hayFiltrosActivos = regionalFiltro !== "todos" || terminalFiltro !== "todos" || !!dateRange?.from || !!q;

  function limpiarFiltros() {
    setRegionalFiltro("todos");
    setTerminalFiltro("todos");
    setDateRange(undefined);
    setPage(1);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filtros */}
      <div className="border-b border-border bg-card px-6 py-3 flex-shrink-0 space-y-2.5">
        <div className="flex items-center gap-3 flex-wrap">
          <select
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={tipoFiltro}
            onChange={(e) => { setTipoFiltro(e.target.value); setPage(1); }}
          >
            {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <select
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={estadoFiltro}
            onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1); }}
          >
            {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
          </select>
          <select
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={regionalFiltro}
            onChange={(e) => handleRegionalChange(e.target.value)}
          >
            <option value="todos">Todas las regionales</option>
            {Object.keys(REGIONALES).map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={terminalFiltro}
            onChange={(e) => { setTerminalFiltro(e.target.value); setPage(1); }}
          >
            <option value="todos">Todas las terminales</option>
            {terminalesDisponibles.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <DateRangeFilter range={dateRange} onChange={(r) => { setDateRange(r); setPage(1); }} />
          <div className="flex-1" />
          <span className="text-xs text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
          <button
            onClick={() => setNuevaRegistroAbierto(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            <Plus className="w-4 h-4" /> Nuevo registro
          </button>
        </div>

        {/* FilterPills activas */}
        {hayFiltrosActivos && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtrando por:</span>
            {q && <FilterPill label={`Búsqueda: "${busquedaQuery}"`} onRemove={() => { /* busquedaQuery se limpia sola */ }} />}
            {regionalFiltro !== "todos" && <FilterPill label={`Regional: ${regionalFiltro}`} onRemove={() => handleRegionalChange("todos")} />}
            {terminalFiltro !== "todos" && <FilterPill label={`Terminal: ${terminalFiltro}`} onRemove={() => { setTerminalFiltro("todos"); setPage(1); }} />}
            {dateRange?.from && (
              <FilterPill
                label={`Fechas: ${format(dateRange.from, "dd MMM", { locale: es })}${dateRange.to ? ` – ${format(dateRange.to, "dd MMM", { locale: es })}` : ""}`}
                onRemove={() => { setDateRange(undefined); setPage(1); }}
              />
            )}
            {(regionalFiltro !== "todos" || terminalFiltro !== "todos" || !!dateRange?.from) && (
              <button onClick={limpiarFiltros} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-24" onClick={() => toggleSort("id")}>
                <span className="flex items-center gap-1">ID <SortIcon field="id" /></span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Descripción</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-28">Terminal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-36">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32">Responsable</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-24" onClick={() => toggleSort("fecha")}>
                <span className="flex items-center gap-1">Fecha <SortIcon field="fecha" /></span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-20" onClick={() => toggleSort("diasAbierto")}>
                <span className="flex items-center gap-1">Días <SortIcon field="diasAbierto" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((r) => (
              <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="table-row-hover bg-card">
                <td className="px-4 py-3"><TipoBadge tipo={r.tipo} /></td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                <td className="px-4 py-3 max-w-xs">
                  <span className="truncate block text-foreground">{descripcionCorta(r)}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.terminal}</td>
                <td className="px-4 py-3"><EstadoBadge estado={r.estado} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">{r.responsableNombre}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.fecha}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={r.diasAbierto > 30 ? "text-red-600 font-semibold" : r.diasAbierto > 14 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                    {r.diasAbierto}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-3">📋</span>
            <p className="font-medium">No se encontraron registros</p>
            <p className="text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-40 transition-colors">Anterior</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 text-sm border rounded transition-colors ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{p}</button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-40 transition-colors">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
