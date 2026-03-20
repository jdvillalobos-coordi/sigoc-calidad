import React from "react";
import { eventos, alertasIA, personas, vehiculos, PAISES_REGIONALES, REGIONALES_FLAT } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { CategoriaBadge, EstadoBadge, formatDate, EstadoPersonaBadge, categoriaConfig } from "@/lib/utils-app";
import { FolderOpen, Clock, Bot, ChevronRight, Users, Car, MapPin, Building2, CalendarDays, Filter } from "lucide-react";
import { format, subDays, isAfter } from "date-fns";
import { es } from "date-fns/locale";
import type { AlertaIA, CategoriaEvento } from "@/types";

// ─── Componente KPI ───────────────────────────────────────────
function KPICard({ label, value, sub, color = "default", icon: Icon, onClick }: {
  label: string; value: number | string; sub?: string;
  color?: "default" | "red" | "amber" | "blue";
  icon: React.ElementType; onClick?: () => void;
}) {
  const iconColor = { default: "bg-primary/10 text-primary", red: "bg-destructive/10 text-destructive", amber: "bg-amber-100 text-amber-600", blue: "bg-blue-100 text-blue-600" }[color];
  const valueColor = { default: "text-foreground", red: "text-destructive", amber: "text-amber-600", blue: "text-blue-600" }[color];
  return (
    <button onClick={onClick} className={`bg-card border border-border rounded-xl p-4 flex flex-col gap-2 text-left transition-all w-full ${onClick ? "hover:shadow-md hover:border-primary/30 cursor-pointer" : "cursor-default"}`}>
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide leading-tight">{label}</span>
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${iconColor}`}><Icon className="w-3.5 h-3.5" /></div>
      </div>
      <div>
        <div className={`text-2xl font-bold ${valueColor}`}>{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{sub}</div>}
      </div>
    </button>
  );
}

// ─── Alerta card ──────────────────────────────────────────────
function AlertaCard({ alerta, onPersona, onTerminal, onMarcar }: { alerta: AlertaIA; onPersona: (id: string) => void; onTerminal: (n: string) => void; onMarcar: (id: string) => void }) {
  const dotColor = { critica: "bg-destructive", alta: "bg-orange-500", media: "bg-amber-400", baja: "bg-green-500" }[alerta.severidad];
  const bgColor = { critica: "border-destructive/20 bg-destructive/5", alta: "border-orange-200 bg-orange-50", media: "border-amber-200 bg-amber-50", baja: "border-green-200 bg-green-50" }[alerta.severidad];
  return (
    <div className={`rounded-xl border p-3.5 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-foreground leading-snug">{alerta.titulo}</p>
          <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{alerta.descripcion}</p>
          {alerta.entidadesInvolucradas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {alerta.entidadesInvolucradas.map((e) => (
                <button key={e.id} onClick={() => e.tipo === "persona" ? onPersona(e.id) : onTerminal(e.nombre)}
                  className="text-[11px] font-medium text-primary underline hover:no-underline">{e.nombre}</button>
              ))}
            </div>
          )}
        </div>
        {alerta.estado === "nueva" && (
          <button onClick={() => onMarcar(alerta.id)} className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors whitespace-nowrap">Marcar revisada</button>
        )}
      </div>
    </div>
  );
}

// ─── Barra de proporción ──────────────────────────────────────
function ProporcionBar({ value, max, color = "bg-primary" }: { value: number; max: number; color?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden flex-shrink-0">
      <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Filtros de fecha ─────────────────────────────────────────
const PERIODOS = [
  { label: "7d",  days: 7 },
  { label: "30d", days: 30 },
  { label: "90d", days: 90 },
  { label: "Todo", days: 0 },
] as const;

// ─── InicioPage ───────────────────────────────────────────────
export default function InicioPage() {
  const { setPaginaActiva, abrirPersona, abrirVehiculo, abrirTerminal, abrirRegistro } = useApp();
  const [alertas, setAlertas] = React.useState<AlertaIA[]>(alertasIA);
  const [topTab, setTopTab] = React.useState<"personas" | "vehiculos">("personas");
  const [periodo, setPeriodo] = React.useState<number>(30);
  const [catFiltro, setCatFiltro] = React.useState<CategoriaEvento | "todas">("todas");

  // ─── Filtrado principal ───────────────────────────────────
  const eventosFiltrados = React.useMemo(() => {
    const fechaCorte = periodo > 0 ? subDays(new Date(), periodo) : null;
    return eventos.filter((e) => {
      const pasaFecha = !fechaCorte || isAfter(new Date(e.fecha), fechaCorte);
      const pasaCat   = catFiltro === "todas" || e.categoria === catFiltro;
      return pasaFecha && pasaCat;
    });
  }, [periodo, catFiltro]);

  // ─── KPIs (sobre eventosFiltrados) ───────────────────────
  const abiertos    = eventosFiltrados.filter((e) => e.estado === "abierto");
  const vencidos    = eventosFiltrados.filter((e) => e.diasAbierto > 30 && e.estado === "abierto");
  const alertasNew  = alertas.filter((a) => a.estado === "nueva");
  const criticas    = alertasNew.filter((a) => a.severidad === "critica");
  const personasSeg = personas.filter((p) => p.estado === "en_seguimiento" || p.estado === "bloqueado");

  // ─── Top Regionales ───────────────────────────────────────
  const topRegionales = React.useMemo(() => {
    const conteo: Record<string, number> = {};
    // build terminal→regional map
    const termToRegional: Record<string, string> = {};
    for (const [, regionales] of Object.entries(PAISES_REGIONALES)) {
      for (const [regional, terms] of Object.entries(regionales)) {
        for (const t of terms) termToRegional[t] = regional;
      }
    }
    eventosFiltrados.forEach((e) => {
      const reg = termToRegional[e.terminal] ?? "Otra";
      conteo[reg] = (conteo[reg] ?? 0) + 1;
    });
    return Object.entries(conteo).map(([regional, count]) => ({ regional, count }))
      .sort((a, b) => b.count - a.count);
  }, [eventosFiltrados]);

  // ─── Top Terminales ───────────────────────────────────────
  const topTerminales = React.useMemo(() => {
    const conteo: Record<string, number> = {};
    eventosFiltrados.forEach((e) => {
      conteo[e.terminal] = (conteo[e.terminal] ?? 0) + 1;
    });
    return Object.entries(conteo).map(([terminal, count]) => ({ terminal, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [eventosFiltrados]);

  // ─── Top Personas ─────────────────────────────────────────
  const topPersonas = React.useMemo(() => {
    const conteo: Record<string, { persona: typeof personas[0]; count: number }> = {};
    eventosFiltrados.forEach((ev) => {
      [...ev.personasResponsables, ...ev.personasParticipantes].forEach((p) => {
        if (!conteo[p.personaId]) {
          const persona = personas.find((x) => x.id === p.personaId);
          if (persona) conteo[p.personaId] = { persona, count: 0 };
        }
        if (conteo[p.personaId]) conteo[p.personaId].count++;
      });
    });
    return Object.values(conteo).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [eventosFiltrados]);

  // ─── Top Vehículos ────────────────────────────────────────
  const topVehiculos = React.useMemo(() => {
    const conteo: Record<string, { vehiculo: typeof vehiculos[0]; count: number }> = {};
    eventosFiltrados.forEach((ev) => {
      (ev.vehiculosVinculados ?? []).forEach((v) => {
        if (!conteo[v.vehiculoId]) {
          const vehiculo = vehiculos.find((x) => x.id === v.vehiculoId);
          if (vehiculo) conteo[v.vehiculoId] = { vehiculo, count: 0 };
        }
        if (conteo[v.vehiculoId]) conteo[v.vehiculoId].count++;
      });
    });
    return Object.values(conteo).sort((a, b) => b.count - a.count).slice(0, 6);
  }, [eventosFiltrados]);

  const maxRegional  = topRegionales[0]?.count ?? 1;
  const maxTerminal  = topTerminales[0]?.count ?? 1;
  const maxPersonas  = topPersonas[0]?.count ?? 1;
  const maxVehiculos = topVehiculos[0]?.count ?? 1;

  const topAlertas = [...alertas]
    .filter((a) => a.estado !== "descartada")
    .sort((a, b) => ({ critica: 0, alta: 1, media: 2, baja: 3 }[a.severidad] - { critica: 0, alta: 1, media: 2, baja: 3 }[b.severidad]))
    .slice(0, 5);

  function marcarRevisada(id: string) {
    setAlertas((prev) => prev.map((a) => a.id === id ? { ...a, estado: "revisada" } : a));
  }

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  const CATS: { value: CategoriaEvento | "todas"; label: string }[] = [
    { value: "todas", label: "Todas" },
    { value: "dineros", label: "💰 Dineros" },
    { value: "unidades", label: "📦 Unidades" },
    { value: "listas_vinculantes", label: "📋 Listas" },
    { value: "pqr", label: "📞 PQR" },
    { value: "disciplinarios", label: "⚖️ Disciplinarios" },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        {/* ── Header + filtros ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Panel de Control</h1>
            <p className="text-sm text-muted-foreground capitalize mt-0.5">{fechaHoy}</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            {/* Período */}
            <div className="flex rounded-lg border border-border overflow-hidden text-xs bg-card">
              <span className="flex items-center gap-1 px-2.5 text-muted-foreground border-r border-border">
                <CalendarDays className="w-3 h-3" />
              </span>
              {PERIODOS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPeriodo(p.days)}
                  className={`px-3 py-1.5 transition-colors ${periodo === p.days ? "bg-primary text-primary-foreground font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {/* Categoría */}
            <div className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-1 py-1 flex-wrap">
              <Filter className="w-3 h-3 text-muted-foreground ml-1.5" />
              {CATS.map((c) => (
                <button
                  key={c.value}
                  onClick={() => setCatFiltro(c.value)}
                  className={`text-[11px] px-2.5 py-1 rounded-md transition-colors ${catFiltro === c.value ? "bg-primary/10 text-primary font-semibold" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── 4 KPIs ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPICard label="Eventos abiertos" value={abiertos.length} sub={`de ${eventosFiltrados.length} en el período`} icon={FolderOpen} onClick={() => setPaginaActiva("registros")} />
          <KPICard label="Vencidos >30d" value={vencidos.length} sub={vencidos.length > 0 ? "requieren cierre urgente" : "sin vencidos"} color={vencidos.length > 0 ? "red" : "default"} icon={Clock} onClick={() => setPaginaActiva("registros")} />
          <KPICard label="Alertas IA activas" value={alertasNew.length} sub={criticas.length > 0 ? `${criticas.length} críticas` : "sin críticas"} color={criticas.length > 0 ? "red" : "blue"} icon={Bot} onClick={() => setPaginaActiva("ia")} />
          <KPICard label="Personas en seguimiento" value={personasSeg.length} sub={`${personas.filter(p => p.estado === "bloqueado").length} bloqueadas`} color="amber" icon={Users} />
        </div>

        {/* ── Fila 2: Regionales + Alertas IA ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top Regionales */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <MapPin className="w-4 h-4 text-primary" /> Incidencias por Regional
              </h2>
              <span className="text-[11px] text-muted-foreground">{periodo === 0 ? "Histórico" : `Últimos ${periodo} días`}</span>
            </div>
            <div className="divide-y divide-border">
              {topRegionales.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">Sin eventos en el período</div>
              ) : topRegionales.map(({ regional, count }) => (
                <div key={regional} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs font-medium text-foreground flex-1 truncate">{regional}</span>
                  <ProporcionBar value={count} max={maxRegional} />
                  <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                  <span className="text-[10px] text-muted-foreground w-10 text-right">
                    {eventosFiltrados.length > 0 ? `${Math.round((count / eventosFiltrados.length) * 100)}%` : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Alertas IA */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" /> Alertas IA
              </h2>
              <button onClick={() => setPaginaActiva("ia")} className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline">
                Ver todas <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="space-y-2">
              {topAlertas.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground bg-card border border-border rounded-xl text-xs">
                  <Bot className="w-6 h-6 mx-auto mb-1 opacity-30" />Sin alertas activas
                </div>
              ) : topAlertas.map((a) => (
                <AlertaCard key={a.id} alerta={a} onPersona={abrirPersona} onTerminal={abrirTerminal} onMarcar={marcarRevisada} />
              ))}
            </div>
          </div>

        </div>

        {/* ── Fila 3: Top Terminales + Top Incidencias ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* Top Terminales */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary" /> Top Terminales
              </h2>
              <span className="text-[11px] text-muted-foreground">{periodo === 0 ? "Histórico" : `Últimos ${periodo} días`}</span>
            </div>
            <div className="divide-y divide-border">
              {topTerminales.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-xs">Sin eventos en el período</div>
              ) : topTerminales.map(({ terminal, count }, i) => (
                <div key={terminal} className="flex items-center gap-3 px-4 py-2.5">
                  <span className="text-xs font-bold text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                  <button
                    onClick={() => abrirTerminal(terminal)}
                    className="text-xs font-medium text-foreground hover:text-primary hover:underline flex-1 text-left truncate"
                  >
                    {terminal}
                  </button>
                  <ProporcionBar value={count} max={maxTerminal} />
                  <span className="text-xs font-bold text-foreground w-6 text-right">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Top Incidencias personas / vehículos */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h2 className="text-sm font-semibold text-foreground">Top incidencias</h2>
              <div className="flex rounded-lg border border-border overflow-hidden text-[11px]">
                <button
                  onClick={() => setTopTab("personas")}
                  className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${topTab === "personas" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Users className="w-3 h-3" /> Personas
                </button>
                <button
                  onClick={() => setTopTab("vehiculos")}
                  className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${topTab === "vehiculos" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Car className="w-3 h-3" /> Vehículos
                </button>
              </div>
            </div>

            {topTab === "personas" && (
              <div className="divide-y divide-border">
                {topPersonas.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">Sin datos en el período</div>
                ) : topPersonas.map(({ persona, count }, i) => (
                  <div key={persona.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-primary/10 text-primary text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      {persona.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => abrirPersona(persona.id)} className="text-xs font-semibold text-foreground hover:text-primary hover:underline truncate block max-w-full text-left">
                        {persona.nombre}
                      </button>
                      <div className="text-[10px] text-muted-foreground truncate">{persona.cargo} · {persona.terminal}</div>
                    </div>
                    <ProporcionBar value={count} max={maxPersonas} />
                    <span className="text-xs font-bold text-foreground w-4 text-right flex-shrink-0">{count}</span>
                    <EstadoPersonaBadge estado={persona.estado} />
                  </div>
                ))}
              </div>
            )}

            {topTab === "vehiculos" && (
              <div className="divide-y divide-border">
                {topVehiculos.length === 0 ? (
                  <div className="text-center py-6 text-muted-foreground text-xs">Sin vehículos vinculados en el período</div>
                ) : topVehiculos.map(({ vehiculo, count }, i) => (
                  <div key={vehiculo.id} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-muted-foreground w-4 text-right flex-shrink-0">{i + 1}</span>
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 text-[11px] font-bold flex items-center justify-center flex-shrink-0">
                      <Car className="w-3.5 h-3.5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <button onClick={() => abrirVehiculo(vehiculo.id)} className="text-xs font-semibold text-foreground hover:text-primary hover:underline text-left">
                        {vehiculo.placa}
                      </button>
                      <div className="text-[10px] text-muted-foreground">{vehiculo.tipo}</div>
                    </div>
                    <ProporcionBar value={count} max={maxVehiculos} color="bg-amber-500" />
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
    </div>
  );
}
