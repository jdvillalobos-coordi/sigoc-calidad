import { useState, useMemo, useEffect } from "react";
import { eventos, terminales, PAISES_REGIONALES, REGIONALES_FLAT, usuarioLogueado } from "@/data/mockData";
import { CategoriaBadge, EstadoBadge } from "@/lib/utils-app";
import { eventoSinAsignarSlaCritico } from "@/lib/evento-sla";
import { useApp } from "@/context/AppContext";
import { Plus, ChevronUp, ChevronDown, CalendarDays, X } from "lucide-react";
import type { CategoriaEvento } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import {
  contarCargaAsignacion,
  crearOperadoresAsignacion,
  cumpleFiltroAsignacion,
  labelFiltroAsignacion,
  type FiltroAsignacionTrabajo,
  type OperadorAsignacion,
} from "@/lib/asignacion-trabajo";
import { format, isWithinInterval, parseISO } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

// ── Constantes ───────────────────────────────────────────────

const CATEGORIAS: { value: CategoriaEvento | "todos"; label: string }[] = [
  { value: "todos",              label: "Todas" },
  { value: "dineros",            label: "💰 Dineros" },
  { value: "unidades",           label: "📦 Unidades" },
  { value: "listas_vinculantes", label: "📋 Listas Vinculantes" },
  { value: "pqr",                label: "📞 Solicitudes Postventa" },
  { value: "disciplinarios",     label: "⚖️ Disciplinarios" },
  { value: "eventos_criticos", label: "🛡️ Eventos críticos" },
  { value: "evidencias",         label: "📸 Evidencias" },
];

type PageSizeOpt = 50 | 100 | "all";
const PAGE_SIZES: { value: PageSizeOpt; label: string }[] = [
  { value: 50,    label: "50" },
  { value: 100,   label: "100" },
  { value: "all", label: "Todo" },
];

// ── Componentes pequeños ─────────────────────────────────────

function FilterPill({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20">
      {label}
      <button onClick={onRemove} className="hover:bg-primary/20 rounded-full p-0.5 transition-colors ml-0.5">
        <X className="w-3 h-3" />
      </button>
    </span>
  );
}

function DateRangeFilter({ range, onChange }: { range: DateRange | undefined; onChange: (r: DateRange | undefined) => void }) {
  const [open, setOpen] = useState(false);
  const label = range?.from
    ? range.to
      ? `${format(range.from, "d MMM", { locale: es })} – ${format(range.to, "d MMM", { locale: es })}`
      : format(range.from, "d MMM yyyy", { locale: es })
    : "Rango de fechas";
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className={cn(
          "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
          range?.from
            ? "border-primary bg-primary/5 text-primary"
            : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
        )}>
          <CalendarDays className="w-3.5 h-3.5" />{label}
          {range?.from && (
            <span className="ml-0.5 hover:bg-primary/20 rounded-full p-0.5 transition-colors"
              onClick={(e) => { e.stopPropagation(); onChange(undefined); }}>
              <X className="w-3 h-3" />
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar mode="range" selected={range} onSelect={onChange} locale={es} numberOfMonths={2} className="p-3 pointer-events-auto" initialFocus />
        {range?.from && (
          <div className="flex justify-end px-3 pb-3">
            <button onClick={() => { onChange(undefined); setOpen(false); }}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
              <X className="w-3 h-3" /> Limpiar rango
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Página principal ─────────────────────────────────────────

export default function RegistrosPage() {
  const { abrirRegistro, setNuevaRegistroAbierto, setFormPrefill, busquedaQuery, setBusquedaQuery, registrosNavFiltro, setRegistrosNavFiltro, dataVersion, bumpData } = useApp();
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro]       = useState<string>("todos");
  const [estadoFlujoFiltro, setEstadoFlujoFiltro] = useState<string>("todos");
  const [soloMios, setSoloMios]               = useState(false);
  const [soloCerrados, setSoloCerrados]       = useState(false);
  const [soloEscaladosAMi, setSoloEscaladosAMi] = useState(false);
  const [soloVencidos, setSoloVencidos]       = useState(false);
  const [soloSinAsignar24h, setSoloSinAsignar24h] = useState(false);
  const [navEtiqueta, setNavEtiqueta]         = useState<string | null>(null);
  const [paisFiltro, setPaisFiltro]           = useState("todos");
  const [regionalFiltro, setRegionalFiltro]   = useState("todos");
  const [terminalFiltro, setTerminalFiltro]   = useState("todos");
  const [asignadoFiltro, setAsignadoFiltro]   = useState<FiltroAsignacionTrabajo>("todos");
  const [dateRange, setDateRange]             = useState<DateRange | undefined>(undefined);
  const [sortField, setSortField]             = useState<"fecha" | "diasAbierto" | "id">("fecha");
  const [sortDir, setSortDir]                 = useState<"asc" | "desc">("desc");
  const [page, setPage]                       = useState(1);
  const [perPage, setPerPage]                 = useState<PageSizeOpt>(50);
  const [seleccionados, setSeleccionados]     = useState<Set<string>>(new Set());
  const [operadorDestinoId, setOperadorDestinoId] = useState("");

  // Aplica el filtro de navegación al montar (viene del Panel de Control)
  useEffect(() => {
    if (!registrosNavFiltro) return;
    const f = registrosNavFiltro;
    if (f.soloAbiertos)       setEstadoFiltro("abierto");
    if (f.soloCerrados)       setEstadoFiltro("cerrado");
    if (f.estadoFlujo)        setEstadoFlujoFiltro(f.estadoFlujo);
    if (f.soloMios)           setSoloMios(true);
    if (f.soloCerrados)       setSoloCerrados(true);
    if (f.soloEscaladosAMi)   setSoloEscaladosAMi(true);
    if (f.soloVencidos)       setSoloVencidos(true);
    if (f.soloSinAsignar24h)  setSoloSinAsignar24h(true);
    if (f.etiqueta)           setNavEtiqueta(f.etiqueta);
    setPage(1);
    setRegistrosNavFiltro(null); // consume el filtro
  }, [registrosNavFiltro]);

  function handlePaisChange(val: string) { setPaisFiltro(val); setRegionalFiltro("todos"); setTerminalFiltro("todos"); setPage(1); }
  function handleRegionalChange(val: string) { setRegionalFiltro(val); setTerminalFiltro("todos"); setPage(1); }

  const regionalesDisponibles: string[] = useMemo(() =>
    paisFiltro !== "todos"
      ? Object.keys(PAISES_REGIONALES[paisFiltro] ?? {})
      : Object.values(PAISES_REGIONALES).flatMap((r) => Object.keys(r))
  , [paisFiltro]);

  const terminalesDisponibles: string[] = useMemo(() =>
    regionalFiltro !== "todos"
      ? REGIONALES_FLAT[regionalFiltro] ?? []
      : paisFiltro !== "todos"
        ? Object.values(PAISES_REGIONALES[paisFiltro] ?? {}).flat()
        : terminales
  , [regionalFiltro, paisFiltro]);

  const operadoresAsignacion = useMemo(() => crearOperadoresAsignacion(eventos, usuarioLogueado), [dataVersion]);

  const q = busquedaQuery.toLowerCase().trim();

  const filtered = useMemo(() => eventos
    .filter((e) => categoriaFiltro === "todos" || e.categoria === categoriaFiltro)
    .filter((e) => estadoFiltro === "todos" || e.estado === estadoFiltro)
    .filter((e) => estadoFlujoFiltro === "todos" || e.estadoFlujo === estadoFlujoFiltro)
    .filter((e) => !soloMios || e.asignadoA?.id === usuarioLogueado.id)
    .filter((e) => cumpleFiltroAsignacion(e, asignadoFiltro, usuarioLogueado.id))
    .filter((e) => !soloCerrados || e.estadoFlujo === "cerrado")
    .filter((e) => !soloEscaladosAMi || (e.escaladoA?.id === usuarioLogueado.id && e.estadoFlujo === "escalado"))
    .filter((e) => !soloVencidos || (e.diasAbierto > 30 && e.estado === "abierto"))
    .filter((e) => !soloSinAsignar24h || eventoSinAsignarSlaCritico(e))
    .filter((e) => {
      if (terminalFiltro  !== "todos") return e.terminal === terminalFiltro;
      if (regionalFiltro  !== "todos") return (REGIONALES_FLAT[regionalFiltro] ?? []).includes(e.terminal);
      if (paisFiltro      !== "todos") return Object.values(PAISES_REGIONALES[paisFiltro] ?? {}).flat().includes(e.terminal);
      return true;
    })
    .filter((e) => {
      if (!dateRange?.from) return true;
      const fecha = parseISO(e.fecha);
      const to = dateRange.to ?? new Date();
      return isWithinInterval(fecha, { start: dateRange.from, end: to });
    })
    .filter((e) => {
      if (!q) return true;
      const allPersonaNames = [...(e.personasResponsables ?? []), ...(e.personasParticipantes ?? [])]
        .map(p => `${p.nombre} ${p.cedula}`.toLowerCase());
      return (
        e.id.toLowerCase().includes(q) ||
        e.terminal.toLowerCase().includes(q) ||
        e.tipoEvento.toLowerCase().includes(q) ||
        e.descripcionHechos.toLowerCase().includes(q) ||
        (e.guias && e.guias.some((g) => g.toLowerCase().includes(q))) ||
        allPersonaNames.some(n => n.includes(q)) ||
        (e.nitCliente && e.nitCliente.toLowerCase().includes(q)) ||
        (e.nombreCliente && e.nombreCliente.toLowerCase().includes(q))
      );
    })
    .sort((a, b) => {
      let cmp = 0;
      if      (sortField === "fecha")       cmp = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      else if (sortField === "diasAbierto") cmp = a.diasAbierto - b.diasAbierto;
      else                                  cmp = a.id.localeCompare(b.id);
      return sortDir === "asc" ? cmp : -cmp;
    })
  , [categoriaFiltro, estadoFiltro, estadoFlujoFiltro, soloMios, soloCerrados, soloEscaladosAMi, soloVencidos, soloSinAsignar24h, asignadoFiltro, paisFiltro, regionalFiltro, terminalFiltro, dateRange, q, sortField, sortDir, dataVersion]);

  const effectivePerPage = perPage === "all" ? filtered.length : perPage;
  const pages = effectivePerPage > 0 ? Math.ceil(filtered.length / effectivePerPage) : 1;
  const paged = perPage === "all" ? filtered : filtered.slice((page - 1) * effectivePerPage, page * effectivePerPage);
  const cargaAsignacion = contarCargaAsignacion(
    filtered,
    operadoresAsignacion,
    (evento) => evento.estadoFlujo !== "cerrado"
  );
  const sinAsignarPendientes = filtered.filter((evento) => evento.estadoFlujo !== "cerrado" && !evento.asignadoA).length;
  const eventosSeleccionablesPagina = paged.filter((e) => e.estadoFlujo !== "cerrado").map((e) => e.id);
  const todosPaginaSeleccionados = eventosSeleccionablesPagina.length > 0 && eventosSeleccionablesPagina.every((id) => seleccionados.has(id));
  const operadorDestino = operadoresAsignacion.find((op) => op.id === operadorDestinoId);

  function toggleSeleccion(id: string) {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSeleccionPagina() {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      if (todosPaginaSeleccionados) eventosSeleccionablesPagina.forEach((id) => next.delete(id));
      else eventosSeleccionablesPagina.forEach((id) => next.add(id));
      return next;
    });
  }

  function asignarEventosSeleccionados(operador: OperadorAsignacion | null) {
    const ahora = new Date().toISOString();
    let actualizados = 0;
    eventos.forEach((evento) => {
      if (!seleccionados.has(evento.id) || evento.estadoFlujo === "cerrado") return;
      if (operador) {
        evento.asignadoA = operador;
        evento.fechaAsignacion = ahora;
        evento.asignadoPor = { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre };
        evento.historial.push({
          id: `h-${Date.now()}-${evento.id}`,
          fecha: ahora,
          usuarioNombre: usuarioLogueado.nombre,
          accion: `Asignó el evento a ${operador.nombre}`,
        });
      } else {
        const anterior = evento.asignadoA?.nombre ?? "sin asignación";
        delete evento.asignadoA;
        delete evento.fechaAsignacion;
        evento.asignadoPor = { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre };
        evento.historial.push({
          id: `h-${Date.now()}-${evento.id}`,
          fecha: ahora,
          usuarioNombre: usuarioLogueado.nombre,
          accion: `Liberó el evento (antes asignado a ${anterior})`,
        });
      }
      actualizados += 1;
    });

    if (actualizados === 0) {
      toast({ variant: "destructive", title: "No hay eventos abiertos seleccionados" });
      return;
    }

    setSeleccionados(new Set());
    setOperadorDestinoId("");
    bumpData();
    toast({ title: operador ? `${actualizados} evento(s) asignado(s)` : `${actualizados} evento(s) liberado(s)` });
  }

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
    setPage(1);
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <span className="text-muted-foreground/40">↕</span>;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  const hayFiltrosNav = !!navEtiqueta || estadoFlujoFiltro !== "todos" || soloMios || soloCerrados || soloEscaladosAMi || soloVencidos || soloSinAsignar24h || estadoFiltro !== "todos";
  const hayFiltrosActivos = hayFiltrosNav || categoriaFiltro !== "todos" || paisFiltro !== "todos" || regionalFiltro !== "todos" || terminalFiltro !== "todos" || asignadoFiltro !== "todos" || !!dateRange?.from || !!q;
  const totalVisible = filtered.length;

  function limpiarFiltros() {
    setCategoriaFiltro("todos");
    setPaisFiltro("todos"); setRegionalFiltro("todos"); setTerminalFiltro("todos"); setAsignadoFiltro("todos");
    setDateRange(undefined); setBusquedaQuery(""); setEstadoFiltro("todos");
    setEstadoFlujoFiltro("todos"); setSoloMios(false); setSoloCerrados(false); setSoloEscaladosAMi(false);
    setSoloVencidos(false); setSoloSinAsignar24h(false); setNavEtiqueta(null); setPage(1);
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Barra de filtros ── */}
      <div className="border-b border-border bg-card px-5 py-3 flex-shrink-0 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Categoría — chips horizontales */}
          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORIAS.map((c) => (
              <button key={c.value}
                onClick={() => {
                  setCategoriaFiltro(c.value);
                  // Al cambiar categoría limpiamos los filtros de navegación para evitar
                  // combinaciones confusas (ej: "Escalados activos" + PQR)
                  setEstadoFlujoFiltro("todos");
                  setSoloMios(false);
                  setSoloCerrados(false);
                  setSoloEscaladosAMi(false);
                  setSoloVencidos(false);
                  setSoloSinAsignar24h(false);
                  setNavEtiqueta(null);
                  if (c.value !== "todos") setEstadoFiltro("todos");
                  setPage(1);
                }}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-xs font-medium transition-colors",
                  categoriaFiltro === c.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-background border-border text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                {c.label}
              </button>
            ))}
          </div>

          <div className="w-px h-5 bg-border mx-1" />

          {/* Estado */}
          <select
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            value={estadoFiltro}
            onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1); }}>
            <option value="todos">Todos los estados</option>
            <option value="abierto">Abierto</option>
            <option value="cerrado">Cerrado</option>
          </select>

          {/* Asignado a */}
          <select
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring text-foreground"
            value={asignadoFiltro}
            onChange={(e) => { setAsignadoFiltro(e.target.value as FiltroAsignacionTrabajo); setPage(1); }}>
            <option value="todos">Todos los asignados</option>
            <option value="sin_asignar">Sin asignar</option>
            <option value="mis_asignados">Mis asignados</option>
            {operadoresAsignacion.map((op) => <option key={op.id} value={`usuario:${op.id}`}>{op.nombre}</option>)}
          </select>

          {/* País → Regional → Terminal (cascada) */}
          <select
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={paisFiltro} onChange={(e) => handlePaisChange(e.target.value)}>
            <option value="todos">Todos los países</option>
            {Object.keys(PAISES_REGIONALES).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={regionalFiltro} onChange={(e) => handleRegionalChange(e.target.value)}>
            <option value="todos">Todas las regionales</option>
            {regionalesDisponibles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          <select
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            value={terminalFiltro} onChange={(e) => { setTerminalFiltro(e.target.value); setPage(1); }}>
            <option value="todos">Todas las terminales</option>
            {terminalesDisponibles.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          <DateRangeFilter range={dateRange} onChange={(r) => { setDateRange(r); setPage(1); }} />

          <div className="flex-1" />
          <span className="text-xs text-muted-foreground font-medium">{totalVisible} evento{totalVisible !== 1 ? "s" : ""}</span>
          <button onClick={() => { setFormPrefill(null); setNuevaRegistroAbierto(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuevo evento
          </button>
        </div>

        {hayFiltrosActivos && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtrando por:</span>
            {navEtiqueta && (
              <FilterPill label={navEtiqueta} onRemove={() => {
                setNavEtiqueta(null); setEstadoFlujoFiltro("todos"); setSoloMios(false); setSoloCerrados(false);
                setSoloEscaladosAMi(false); setSoloVencidos(false); setSoloSinAsignar24h(false); setEstadoFiltro("todos"); setPage(1);
              }} />
            )}
            {categoriaFiltro !== "todos" && (
              <FilterPill
                label={CATEGORIAS.find(c => c.value === categoriaFiltro)?.label ?? categoriaFiltro}
                onRemove={() => { setCategoriaFiltro("todos"); setPage(1); }}
              />
            )}
            {q && <FilterPill label={`Búsqueda: "${busquedaQuery}"`} onRemove={() => { setBusquedaQuery(""); setPage(1); }} />}
            {paisFiltro !== "todos" && <FilterPill label={`País: ${paisFiltro}`} onRemove={() => handlePaisChange("todos")} />}
            {regionalFiltro !== "todos" && <FilterPill label={`Regional: ${regionalFiltro}`} onRemove={() => handleRegionalChange("todos")} />}
            {terminalFiltro !== "todos" && <FilterPill label={`Terminal: ${terminalFiltro}`} onRemove={() => { setTerminalFiltro("todos"); setPage(1); }} />}
            {asignadoFiltro !== "todos" && <FilterPill label={`Asignado: ${labelFiltroAsignacion(asignadoFiltro, operadoresAsignacion)}`} onRemove={() => { setAsignadoFiltro("todos"); setPage(1); }} />}
            {soloSinAsignar24h && !navEtiqueta && (
              <FilterPill label="Sin asignar >24 h" onRemove={() => { setSoloSinAsignar24h(false); setPage(1); }} />
            )}
            {dateRange?.from && (
              <FilterPill
                label={`Fechas: ${format(dateRange.from, "dd MMM", { locale: es })}${dateRange.to ? ` – ${format(dateRange.to, "dd MMM", { locale: es })}` : ""}`}
                onRemove={() => { setDateRange(undefined); setPage(1); }}
              />
            )}
            <button onClick={limpiarFiltros} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">Limpiar filtros</button>
          </div>
        )}
        {(sinAsignarPendientes > 0 || cargaAsignacion.length > 0) && (
          <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground">
            <span className="font-medium text-foreground">Carga:</span>
            {sinAsignarPendientes > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Sin asignar {sinAsignarPendientes}</span>}
            {cargaAsignacion.slice(0, 5).map((row) => (
              <span key={row.id} className="px-2 py-0.5 rounded-full bg-muted/60 border border-border">{row.nombre.split(" ").slice(0, 2).join(" ")} {row.count}</span>
            ))}
          </div>
        )}
        {seleccionados.size > 0 && (
          <div className="flex items-center gap-2 flex-wrap rounded-xl border border-primary/20 bg-primary/5 px-3 py-2">
            <span className="text-xs font-semibold text-primary">{seleccionados.size} seleccionado(s)</span>
            <button
              onClick={() => asignarEventosSeleccionados({ id: usuarioLogueado.id, nombre: usuarioLogueado.nombre, cargo: usuarioLogueado.cargo })}
              className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
            >
              Tomar seleccionados
            </button>
            <select
              value={operadorDestinoId}
              onChange={(e) => setOperadorDestinoId(e.target.value)}
              className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Asignar a...</option>
              {operadoresAsignacion.map((op) => (
                <option key={op.id} value={op.id}>{op.nombre} — {op.cargo}</option>
              ))}
            </select>
            <button
              onClick={() => operadorDestino && asignarEventosSeleccionados(operadorDestino)}
              disabled={!operadorDestino}
              className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
            >
              Asignar
            </button>
            <button
              onClick={() => asignarEventosSeleccionados(null)}
              className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
            >
              Liberar
            </button>
            <button
              onClick={() => { setSeleccionados(new Set()); setOperadorDestinoId(""); }}
              className="text-xs text-muted-foreground hover:text-foreground underline"
            >
              Cancelar selección
            </button>
          </div>
        )}
      </div>

      {/* ── Cuerpo: tabla + panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Tabla */}
        <div className="flex flex-col overflow-hidden w-full">
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr className="border-b border-border">
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={todosPaginaSeleccionados}
                      onChange={toggleSeleccionPagina}
                      disabled={eventosSeleccionablesPagina.length === 0}
                      className="accent-primary"
                      aria-label="Seleccionar eventos de la página"
                    />
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-28"
                    onClick={() => toggleSort("id")}>
                    <span className="flex items-center gap-1">ID <SortIcon field="id" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Tipo / Personas</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32 hidden xl:table-cell">Entidad</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-28">Terminal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-36">Asignado a</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-24">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-24"
                    onClick={() => toggleSort("fecha")}>
                    <span className="flex items-center gap-1">Fecha <SortIcon field="fecha" /></span>
                  </th>
                  <th
                    className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-20"
                    title="Días en estado abierto; se marca si lleva más de 24 h sin persona asignada"
                    onClick={() => toggleSort("diasAbierto")}
                  >
                    <span className="flex items-center gap-1">Días <SortIcon field="diasAbierto" /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">

                {paged.map((e) => {
                  const responsable = (e.personasResponsables ?? [])[0];
                  const slaSinAsignar = eventoSinAsignarSlaCritico(e);
                  return (
                    <tr key={e.id}
                      onClick={() => abrirRegistro(e.id)}
                      className={`cursor-pointer transition-colors hover:bg-muted/40 ${slaSinAsignar ? "bg-red-50/90" : "bg-card"}`}>
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={seleccionados.has(e.id)}
                          disabled={e.estadoFlujo === "cerrado"}
                          onClick={(ev) => ev.stopPropagation()}
                          onChange={() => toggleSeleccion(e.id)}
                          className="accent-primary disabled:opacity-30"
                          aria-label={`Seleccionar evento ${e.id}`}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <CategoriaBadge categoria={e.categoria} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.id}</td>
                      <td className="px-4 py-3 min-w-[200px]">
                        <span className="block text-xs font-medium text-foreground">{e.tipoEvento}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          {responsable && (
                            <span className="text-[10px] text-muted-foreground">
                              {responsable.nombre}
                            </span>
                          )}
                          {e.guias && e.guias.length > 0 && (
                            <span className="text-[10px] text-muted-foreground font-mono">
                              · Guía {e.guias[0]}{e.guias.length > 1 ? ` +${e.guias.length - 1}` : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden xl:table-cell">
                        {e.tipoEntidad.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-3 text-xs text-foreground font-medium">
                        {e.terminal}
                      </td>
                      <td className="px-4 py-3">
                        {e.asignadoA
                          ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                                {e.asignadoA.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
                              </div>
                              <span className="text-xs text-foreground truncate max-w-[110px]">{e.asignadoA.nombre.split(" ").slice(0, 2).join(" ")}</span>
                            </div>
                          )
                          : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border text-amber-800 bg-amber-50 border-amber-200">
                              Sin asignar
                            </span>
                          )
                        }
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={e.estado} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(e.fecha), "dd MMM yy", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {slaSinAsignar ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="text-muted-foreground tabular-nums">{e.diasAbierto}d</span>
                            <span className="text-[10px] font-medium text-destructive leading-tight">+24 h sin asignar</span>
                          </div>
                        ) : e.estado !== "cerrado" && e.diasAbierto > 30 ? (
                          <span className="text-destructive font-semibold">🔴 {e.diasAbierto}d</span>
                        ) : e.estado !== "cerrado" && e.diasAbierto > 3 ? (
                          <span className="text-amber-600 font-medium">⏰ {e.diasAbierto}d</span>
                        ) : (
                          <span className="text-muted-foreground">{e.diasAbierto}d</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <span className="text-4xl mb-3">📋</span>
                <p className="font-medium">No se encontraron eventos</p>
                <p className="text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
              </div>
            )}
          </div>

          {/* Paginación */}
          <div className="border-t border-border bg-card px-5 py-3 flex items-center justify-between flex-shrink-0">
            <span className="text-xs text-muted-foreground">
              {filtered.length === 0 ? "0 eventos" : `${(page - 1) * effectivePerPage + 1}–${Math.min(page * effectivePerPage, filtered.length)} de ${filtered.length}`}
            </span>
            {pages > 1 && (
              <div className="flex items-center gap-1">
                <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                  className="px-2.5 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                  ←
                </button>
                {Array.from({ length: Math.min(pages, 7) }, (_, i) => {
                  const p = pages <= 7 ? i + 1 : page <= 4 ? i + 1 : page >= pages - 3 ? pages - 6 + i : page - 3 + i;
                  return (
                    <button key={p} onClick={() => setPage(p)}
                      className={cn("px-2.5 py-1.5 text-xs rounded-lg transition-colors",
                        p === page ? "bg-primary text-primary-foreground" : "border border-border hover:bg-muted"
                      )}>{p}</button>
                  );
                })}
                <button onClick={() => setPage((p) => Math.min(pages, p + 1))} disabled={page === pages}
                  className="px-2.5 py-1.5 text-xs border border-border rounded-lg disabled:opacity-40 hover:bg-muted transition-colors">
                  →
                </button>
              </div>
            )}
            <div className="flex rounded-lg border border-border overflow-hidden text-[11px] bg-background">
              {PAGE_SIZES.map((s) => (
                <button key={String(s.value)} onClick={() => { setPerPage(s.value); setPage(1); }}
                  className={`px-2.5 py-1 transition-colors ${perPage === s.value ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:text-foreground"}`}>
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
