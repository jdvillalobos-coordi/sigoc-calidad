import React, { useState, useMemo } from "react";
import { eventos, terminales, PAISES_REGIONALES, REGIONALES_FLAT } from "@/data/mockData";
import { CategoriaBadge, EstadoBadge, formatDate, formatCurrency, categoriaConfig, AvatarInicial } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import {
  Plus, ChevronUp, ChevronDown, CalendarIcon, X, Search,
  ExternalLink, Clock, User, MapPin, Hash, FileText,
  ChevronRight, Tag, Users, Building2, Package, AlertCircle
} from "lucide-react";
import type { CategoriaEvento, EstadoEvento, Evento } from "@/types";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, isWithinInterval, parseISO, subDays, formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

// ── Constantes ───────────────────────────────────────────────

const CATEGORIAS: { value: CategoriaEvento | "todos"; label: string }[] = [
  { value: "todos",              label: "Todas" },
  { value: "dineros",            label: "💰 Dineros" },
  { value: "unidades",           label: "📦 Unidades" },
  { value: "listas_vinculantes", label: "📋 Listas Vinculantes" },
  { value: "pqr",                label: "📞 PQR" },
  { value: "disciplinarios",     label: "⚖️ Disciplinarios" },
];

const FUENTE_LABEL: Record<CategoriaEvento, { fuente: string; icon: string; color: string }> = {
  dineros:            { fuente: "SIGO Dineros",              icon: "💰", color: "text-green-700 bg-green-50 border-green-200" },
  unidades:           { fuente: "SIGO NyS",                  icon: "📦", color: "text-blue-700 bg-blue-50 border-blue-200" },
  listas_vinculantes: { fuente: "Truora / ClickCloud",       icon: "🛡️", color: "text-gray-700 bg-gray-50 border-gray-200" },
  pqr:                { fuente: "Reporte CAL / AppSheet",    icon: "📞", color: "text-purple-700 bg-purple-50 border-purple-200" },
  disciplinarios:     { fuente: "SuccessFactors / GH",       icon: "⚖️", color: "text-red-700 bg-red-50 border-red-200" },
};

const PRESETS = [
  { label: "Hoy",            days: 0  },
  { label: "Últimos 7 días", days: 7  },
  { label: "Últimos 30 días",days: 30 },
  { label: "Últimos 90 días",days: 90 },
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
          <CalendarIcon className="w-3 h-3" />{label}
          {range?.from && (
            <span className="ml-0.5 hover:bg-white/20 rounded-full p-0.5 transition-colors"
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
          <Calendar mode="range" selected={range} onSelect={onChange} numberOfMonths={1} className="p-3 pointer-events-auto" />
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Panel de detalle del evento (inline) ─────────────────────

function EventoDetalle({ evento, onClose }: { evento: Evento; onClose: () => void }) {
  const { abrirPersona, abrirGuia, abrirTerminal, abrirRegistro } = useApp();
  const cfg = categoriaConfig[evento.categoria];
  const fuente = FUENTE_LABEL[evento.categoria];

  const allPersonas = [
    ...evento.personasResponsables.map(p => ({ ...p, grupo: "Responsable" })),
    ...evento.personasParticipantes.map(p => ({ ...p, grupo: "Participante" })),
  ];

  return (
    <div className="h-full flex flex-col bg-card border-l border-border overflow-hidden">
      {/* Header del panel */}
      <div className="flex-shrink-0 px-5 py-4 border-b border-border">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <CategoriaBadge categoria={evento.categoria} />
              <EstadoBadge estado={evento.estado} />
              {evento.estado === "abierto" && evento.diasAbierto > 30 && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-destructive">
                  <AlertCircle className="w-3 h-3" /> Vencido
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">{evento.id}</span>
              <button onClick={() => abrirRegistro(evento.id)}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                <ExternalLink className="w-3 h-3" /> Ver detalle completo
              </button>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
            <X className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <h3 className="font-semibold text-sm mt-2 leading-snug">{evento.tipoEvento}</h3>

        {/* Fuente de datos */}
        <div className={`inline-flex items-center gap-1.5 mt-2 px-2.5 py-1 rounded-lg border text-xs font-medium ${fuente.color}`}>
          <span>{fuente.icon}</span>
          <span>Fuente: {fuente.fuente}</span>
        </div>
      </div>

      {/* Cuerpo scrolleable */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">

        {/* Metadatos clave */}
        <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          <InfoRow icon={<MapPin className="w-3.5 h-3.5" />} label="Terminal">
            <button onClick={() => abrirTerminal(evento.terminal)}
              className="text-xs text-primary hover:underline font-medium">{evento.terminal}</button>
          </InfoRow>
          <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Fecha">
            <span className="text-xs">{formatDate(evento.fecha)}</span>
          </InfoRow>
          <InfoRow icon={<Building2 className="w-3.5 h-3.5" />} label="Entidad">
            <span className="text-xs capitalize">{evento.tipoEntidad.replace(/_/g, " ")}</span>
          </InfoRow>
          <InfoRow icon={<Clock className="w-3.5 h-3.5" />} label="Días abierto">
            <span className={cn("text-xs font-semibold",
              evento.estado !== "cerrado" && evento.diasAbierto > 30 ? "text-destructive" :
              evento.estado !== "cerrado" && evento.diasAbierto > 3  ? "text-amber-600"   : "text-muted-foreground"
            )}>{evento.diasAbierto}d</span>
          </InfoRow>
          {evento.valorAfectacion && (
            <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="Valor afectación">
              <span className="text-xs font-semibold text-destructive">{formatCurrency(evento.valorAfectacion)}</span>
            </InfoRow>
          )}
          {evento.codigoNovedad && (
            <InfoRow icon={<Tag className="w-3.5 h-3.5" />} label="Código novedad">
              <span className="text-xs font-mono font-semibold">{evento.codigoNovedad}</span>
            </InfoRow>
          )}
        </div>

        {/* Guías */}
        {evento.guias && evento.guias.length > 0 && (
          <Section title="Guías asociadas" icon="📦">
            <div className="flex flex-wrap gap-2">
              {evento.guias.map((g) => (
                <button key={g} onClick={() => abrirGuia(g)}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs font-mono text-blue-700 hover:bg-blue-100 transition-colors">
                  {g} <ExternalLink className="w-3 h-3" />
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Personas involucradas */}
        {allPersonas.length > 0 && (
          <Section title="Personas involucradas" icon="👤">
            <div className="space-y-2">
              {allPersonas.map((p) => (
                <button key={`${p.personaId}-${p.grupo}`}
                  onClick={() => abrirPersona(p.personaId)}
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-muted/60 transition-colors text-left group">
                  <AvatarInicial nombre={p.nombre} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">{p.cedula}</div>
                  </div>
                  <span className={cn("text-xs px-1.5 py-0.5 rounded font-medium flex-shrink-0",
                    p.grupo === "Responsable" ? "bg-red-100 text-red-700" : "bg-blue-100 text-blue-700"
                  )}>{p.grupo}</span>
                  <ChevronRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </Section>
        )}

        {/* Descripción */}
        <Section title="Descripción de los hechos" icon="📝">
          <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">
            {evento.descripcionHechos}
          </p>
        </Section>

        {/* Campos específicos por categoría */}
        {evento.categoria === "pqr" && (evento.nombreCliente || evento.nitCliente) && (
          <Section title="Datos PQR" icon="📞">
            <div className="space-y-1.5">
              {evento.nombreCliente && <InfoRow icon={<User className="w-3.5 h-3.5" />} label="Cliente"><span className="text-xs">{evento.nombreCliente}</span></InfoRow>}
              {evento.nitCliente && <InfoRow icon={<Hash className="w-3.5 h-3.5" />} label="NIT"><span className="text-xs font-mono">{evento.nitCliente}</span></InfoRow>}
              {evento.rolSolicitante && <InfoRow icon={<Tag className="w-3.5 h-3.5" />} label="Rol"><span className="text-xs capitalize">{evento.rolSolicitante}</span></InfoRow>}
            </div>
          </Section>
        )}

        {evento.categoria === "disciplinarios" && (evento.gravedadFalta || evento.decisionGH) && (
          <Section title="Disciplinario" icon="⚖️">
            <div className="space-y-1.5">
              {evento.gravedadFalta && (
                <InfoRow icon={<AlertCircle className="w-3.5 h-3.5" />} label="Gravedad">
                  <span className={cn("text-xs font-semibold capitalize px-1.5 py-0.5 rounded",
                    evento.gravedadFalta === "gravisima" ? "bg-red-100 text-red-700" :
                    evento.gravedadFalta === "grave"     ? "bg-amber-100 text-amber-700" :
                                                          "bg-yellow-100 text-yellow-700"
                  )}>{evento.gravedadFalta}</span>
                </InfoRow>
              )}
              {evento.decisionGH && <InfoRow icon={<FileText className="w-3.5 h-3.5" />} label="Decisión GH"><span className="text-xs">{evento.decisionGH}</span></InfoRow>}
            </div>
          </Section>
        )}

        {/* Resultado IA (evidencias generadas automáticamente) */}
        {evento.resultadoIA && (
          <Section title="Resultado IA" icon="🤖">
            <div className="flex items-center gap-2">
              <span className={cn("px-2.5 py-1 rounded-lg text-xs font-semibold border",
                evento.resultadoIA === "cumple"
                  ? "bg-green-50 text-green-700 border-green-200"
                  : "bg-red-50 text-red-700 border-red-200"
              )}>
                {evento.resultadoIA === "cumple" ? "✅ Cumple" : "❌ No cumple"}
              </span>
              {evento.veredictoOperador && (
                <span className="text-xs text-muted-foreground">
                  Operador: <span className="font-medium capitalize">{evento.veredictoOperador.replace(/_/g, " ")}</span>
                </span>
              )}
            </div>
          </Section>
        )}

        {/* Eventos asociados */}
        {evento.eventosAsociados && evento.eventosAsociados.length > 0 && (
          <Section title="Eventos relacionados" icon="🔗">
            <div className="flex flex-wrap gap-2">
              {evento.eventosAsociados.map((eid) => {
                const ev = eventos.find(e => e.id === eid);
                return (
                  <button key={eid} onClick={() => abrirRegistro(eid)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-muted border border-border rounded-lg text-xs hover:bg-muted/80 transition-colors">
                    {ev ? <><CategoriaBadge categoria={ev.categoria} className="mr-1" />{eid}</> : eid}
                    <ExternalLink className="w-3 h-3 ml-0.5 text-muted-foreground" />
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {/* Últimas anotaciones */}
        {evento.anotaciones.length > 0 && (
          <Section title="Seguimiento" icon="💬">
            <div className="space-y-2">
              {evento.anotaciones.slice(-2).map((a) => (
                <div key={a.id} className="bg-muted/40 rounded-lg p-2.5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold">{a.autorNombre}</span>
                    <span className="text-[10px] text-muted-foreground">{formatDate(a.fecha)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{a.texto}</p>
                </div>
              ))}
              {evento.anotaciones.length > 2 && (
                <button onClick={() => abrirRegistro(evento.id)}
                  className="text-xs text-primary hover:underline">
                  Ver todas las anotaciones ({evento.anotaciones.length}) →
                </button>
              )}
            </div>
          </Section>
        )}

        {/* Registrado por */}
        <div className="pt-2 border-t border-border">
          <div className="text-xs text-muted-foreground space-y-0.5">
            <div>Registrado por <span className="font-medium text-foreground">{evento.usuarioRegistro}</span> · {evento.perfilUsuario}</div>
            <div>{evento.terminalUsuario} · {formatDate(evento.fechaRegistro)}</div>
          </div>
        </div>
      </div>

      {/* Footer con acción principal */}
      <div className="flex-shrink-0 px-5 py-3 border-t border-border">
        <button onClick={() => abrirRegistro(evento.id)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors">
          <ExternalLink className="w-4 h-4" /> Abrir detalle completo
        </button>
      </div>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-sm">{icon}</span>
        <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</h4>
      </div>
      {children}
    </div>
  );
}

function InfoRow({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1.5">
      <span className="text-muted-foreground mt-0.5 flex-shrink-0">{icon}</span>
      <div>
        <div className="text-[10px] text-muted-foreground uppercase tracking-wide font-medium leading-none mb-0.5">{label}</div>
        {children}
      </div>
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────

export default function RegistrosPage() {
  const { abrirRegistro, abrirTerminal, setNuevaRegistroAbierto, busquedaQuery } = useApp();
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro]       = useState<string>("todos");
  const [paisFiltro, setPaisFiltro]           = useState("todos");
  const [regionalFiltro, setRegionalFiltro]   = useState("todos");
  const [terminalFiltro, setTerminalFiltro]   = useState("todos");
  const [dateRange, setDateRange]             = useState<DateRange | undefined>(undefined);
  const [sortField, setSortField]             = useState<"fecha" | "diasAbierto" | "id">("fecha");
  const [sortDir, setSortDir]                 = useState<"asc" | "desc">("desc");
  const [page, setPage]                       = useState(1);
  const [eventoSeleccionado, setEventoSeleccionado] = useState<Evento | null>(null);
  const PER_PAGE = 20;

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

  const q = busquedaQuery.toLowerCase().trim();

  const filtered = useMemo(() => eventos
    .filter((e) => categoriaFiltro === "todos" || e.categoria === categoriaFiltro)
    .filter((e) => estadoFiltro === "todos" || e.estado === estadoFiltro)
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
      const allPersonaNames = [...e.personasResponsables, ...e.personasParticipantes]
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
  , [categoriaFiltro, estadoFiltro, paisFiltro, regionalFiltro, terminalFiltro, dateRange, q, sortField, sortDir]);

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

  const hayFiltrosActivos = paisFiltro !== "todos" || regionalFiltro !== "todos" || terminalFiltro !== "todos" || !!dateRange?.from || !!q;

  function limpiarFiltros() {
    setPaisFiltro("todos"); setRegionalFiltro("todos"); setTerminalFiltro("todos"); setDateRange(undefined); setPage(1);
  }

  function seleccionar(evento: Evento) {
    setEventoSeleccionado(prev => prev?.id === evento.id ? null : evento);
  }

  const panelAbierto = !!eventoSeleccionado;

  return (
    <div className="h-full flex flex-col overflow-hidden">

      {/* ── Barra de filtros ── */}
      <div className="border-b border-border bg-card px-5 py-3 flex-shrink-0 space-y-2.5">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Categoría — chips horizontales */}
          <div className="flex items-center gap-1 flex-wrap">
            {CATEGORIAS.map((c) => (
              <button key={c.value}
                onClick={() => { setCategoriaFiltro(c.value); setPage(1); }}
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
          <span className="text-xs text-muted-foreground font-medium">{filtered.length} evento{filtered.length !== 1 ? "s" : ""}</span>
          <button onClick={() => setNuevaRegistroAbierto(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Nuevo evento
          </button>
        </div>

        {hayFiltrosActivos && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filtrando por:</span>
            {q && <FilterPill label={`Búsqueda: "${busquedaQuery}"`} onRemove={() => {}} />}
            {paisFiltro !== "todos" && <FilterPill label={`País: ${paisFiltro}`} onRemove={() => handlePaisChange("todos")} />}
            {regionalFiltro !== "todos" && <FilterPill label={`Regional: ${regionalFiltro}`} onRemove={() => handleRegionalChange("todos")} />}
            {terminalFiltro !== "todos" && <FilterPill label={`Terminal: ${terminalFiltro}`} onRemove={() => { setTerminalFiltro("todos"); setPage(1); }} />}
            {dateRange?.from && (
              <FilterPill
                label={`Fechas: ${format(dateRange.from, "dd MMM", { locale: es })}${dateRange.to ? ` – ${format(dateRange.to, "dd MMM", { locale: es })}` : ""}`}
                onRemove={() => { setDateRange(undefined); setPage(1); }}
              />
            )}
            <button onClick={limpiarFiltros} className="text-xs text-muted-foreground hover:text-foreground underline transition-colors">Limpiar filtros</button>
          </div>
        )}
      </div>

      {/* ── Cuerpo: tabla + panel ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Tabla */}
        <div className={cn("flex flex-col overflow-hidden transition-all duration-300", panelAbierto ? "flex-1" : "w-full")}>
          <div className="flex-1 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                <tr className="border-b border-border">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32">Categoría</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-28"
                    onClick={() => toggleSort("id")}>
                    <span className="flex items-center gap-1">ID <SortIcon field="id" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Tipo / Personas</th>
                  {!panelAbierto && (
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32 hidden lg:table-cell">Entidad</th>
                  )}
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-28">Terminal</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-24">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-24"
                    onClick={() => toggleSort("fecha")}>
                    <span className="flex items-center gap-1">Fecha <SortIcon field="fecha" /></span>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-16"
                    onClick={() => toggleSort("diasAbierto")}>
                    <span className="flex items-center gap-1">Días <SortIcon field="diasAbierto" /></span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paged.map((e) => {
                  const isSelected = eventoSeleccionado?.id === e.id;
                  const responsable = e.personasResponsables[0];
                  return (
                    <tr key={e.id}
                      onClick={() => seleccionar(e)}
                      className={cn(
                        "cursor-pointer transition-colors",
                        isSelected
                          ? "bg-primary/5 border-l-2 border-l-primary"
                          : "bg-card hover:bg-muted/40"
                      )}>
                      <td className="px-4 py-3">
                        <CategoriaBadge categoria={e.categoria} />
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.id}</td>
                      <td className="px-4 py-3 max-w-0">
                        <span className="truncate block text-xs font-medium text-foreground">{e.tipoEvento}</span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {responsable && (
                            <span className="text-[10px] text-muted-foreground truncate max-w-[140px]">
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
                      {!panelAbierto && (
                        <td className="px-4 py-3 text-xs text-muted-foreground capitalize hidden lg:table-cell">
                          {e.tipoEntidad.replace(/_/g, " ")}
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <button onClick={(ev) => { ev.stopPropagation(); abrirTerminal(e.terminal); }}
                          className="text-xs text-primary hover:underline font-medium">
                          {e.terminal}
                        </button>
                      </td>
                      <td className="px-4 py-3"><EstadoBadge estado={e.estado} /></td>
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {format(parseISO(e.fecha), "dd MMM yy", { locale: es })}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {e.estado !== "cerrado" && e.diasAbierto > 30
                          ? <span className="text-destructive font-semibold">🔴 {e.diasAbierto}d</span>
                          : e.estado !== "cerrado" && e.diasAbierto > 3
                          ? <span className="text-amber-600 font-medium">⏰ {e.diasAbierto}d</span>
                          : <span className="text-muted-foreground">{e.diasAbierto}d</span>
                        }
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
          {pages > 1 && (
            <div className="border-t border-border bg-card px-5 py-3 flex items-center justify-between flex-shrink-0">
              <span className="text-xs text-muted-foreground">
                {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}
              </span>
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
            </div>
          )}
        </div>

        {/* Panel de detalle lateral */}
        {panelAbierto && eventoSeleccionado && (
          <div className="w-[360px] flex-shrink-0 overflow-hidden border-l border-border">
            <EventoDetalle evento={eventoSeleccionado} onClose={() => setEventoSeleccionado(null)} />
          </div>
        )}
      </div>
    </div>
  );
}
