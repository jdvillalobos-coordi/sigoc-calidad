import React, { useState } from "react";
import { registros, alertasIA, personas, vehiculos } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { TrendingUp, TrendingDown, FileText, AlertTriangle, Clock, CheckCircle, Users, Truck } from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────

function pct(a: number, b: number) {
  if (b === 0) return 0;
  return Math.round((a / b) * 100);
}

const REGIONALES: Record<string, string[]> = {
  "Centro":    ["Bogotá"],
  "Sur":       ["Cali", "Pereira"],
  "Oriente":   ["Bucaramanga", "Cartagena"],
  "Occidente": ["Medellín"],
  "México":    ["México"],
};

function regionalDeTerminal(terminal: string): string {
  return Object.entries(REGIONALES).find(([, ts]) => ts.includes(terminal))?.[0] ?? "Otras";
}

// ── sub-componentes ───────────────────────────────────────────────────────────

function KPICard({
  label,
  value,
  sub,
  trend,
  trendUp,
  color = "primary",
  icon: Icon,
}: {
  label: string;
  value: number | string;
  sub?: string;
  trend?: string;
  trendUp?: boolean;
  color?: "primary" | "red" | "amber" | "green" | "purple";
  icon: React.ElementType;
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

function BarChart({
  data,
  label,
  colorClass = "bg-primary",
}: {
  data: { name: string; value: number }[];
  label: string;
  colorClass?: string;
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
              <div
                className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                style={{ width: `${pct(d.value, max)}%` }}
              />
            </div>
            <span className="text-xs font-semibold text-foreground w-6 text-right">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DonutStat({
  label,
  segments,
}: {
  label: string;
  segments: { name: string; value: number; color: string }[];
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
                <div
                  className={`h-full rounded-full ${seg.color}`}
                  style={{ width: `${pct(seg.value, total)}%` }}
                />
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

// ── Página principal ──────────────────────────────────────────────────────────

export default function InicioPage() {
  const { setPaginaActiva } = useApp();

  // ── métricas derivadas de mockData ─────────────────────────────────────────
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

  // Por tipo
  const porTipo = [
    { name: "Faltantes",  value: registros.filter((r) => r.tipo === "faltante").length },
    { name: "Eventos",    value: registros.filter((r) => r.tipo === "evento").length },
    { name: "Posventa",   value: registros.filter((r) => r.tipo === "posventa").length },
    { name: "RCE",        value: registros.filter((r) => r.tipo === "rce").length },
    { name: "Evidencias", value: registros.filter((r) => r.tipo === "evidencia").length },
    { name: "Lesivas",    value: registros.filter((r) => r.tipo === "lesiva").length },
    { name: "Contacto",   value: registros.filter((r) => r.tipo === "contacto").length },
  ].sort((a, b) => b.value - a.value);

  // Por regional
  const porRegional = Object.keys(REGIONALES).map((reg) => ({
    name: reg,
    value: registros.filter((r) => REGIONALES[reg].includes(r.terminal)).length,
  })).sort((a, b) => b.value - a.value);

  // Por estado (para donut)
  const estadosSegmentos = [
    { name: "En investigación", value: enInvestigacion, color: "bg-blue-500" },
    { name: "Cerrados",         value: cerrados,        color: "bg-green-500" },
    { name: "Pendientes",       value: pendientes,      color: "bg-amber-400" },
    { name: "Vencidos",         value: vencidos,        color: "bg-red-500" },
    { name: "Bloqueados",       value: bloqueados,      color: "bg-gray-500" },
  ].filter((s) => s.value > 0);

  // Top 5 terminales con más registros
  const terminalesCount: Record<string, number> = {};
  registros.forEach((r) => { terminalesCount[r.terminal] = (terminalesCount[r.terminal] ?? 0) + 1; });
  const topTerminales = Object.entries(terminalesCount)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Dashboard de Calidad</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              {" · "}Resumen general del sistema
            </p>
          </div>
          <button
            onClick={() => setPaginaActiva("bandeja")}
            className="text-xs text-primary underline hover:no-underline"
          >
            Ir a mi bandeja →
          </button>
        </div>

        {/* KPIs fila 1 */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label="Total registros"
            value={total}
            sub="En toda la plataforma"
            trend="+8 esta semana"
            trendUp
            icon={FileText}
            color="primary"
          />
          <KPICard
            label="En investigación"
            value={enInvestigacion}
            sub={`${pct(enInvestigacion, total)}% del total`}
            icon={Clock}
            color="amber"
          />
          <KPICard
            label="Cerrados"
            value={cerrados}
            sub={`Tasa de cierre: ${pct(cerrados, total)}%`}
            trend="+2 esta semana"
            trendUp
            icon={CheckCircle}
            color="green"
          />
          <KPICard
            label="Vencidos (+30d)"
            value={casosVencidos30d}
            sub="Sin cierre en más de 30 días"
            trend="Requieren atención"
            trendUp={false}
            icon={AlertTriangle}
            color="red"
          />
        </div>

        {/* KPIs fila 2 */}
        <div className="grid grid-cols-4 gap-4">
          <KPICard
            label="Alertas IA activas"
            value={alertasIA.length}
            sub={`${alertasCriticas} críticas · ${alertasAltas} altas`}
            icon={AlertTriangle}
            color="red"
          />
          <KPICard
            label="Personas en seguimiento"
            value={personasEnSeguimiento}
            sub={`${personasBloqueadas} bloqueadas`}
            icon={Users}
            color="amber"
          />
          <KPICard
            label="Vehículos bloqueados"
            value={vehiculosBloqueados}
            sub={`de ${vehiculos.length} en sistema`}
            icon={Truck}
            color="purple"
          />
          <KPICard
            label="Pendientes de asignar"
            value={pendientes}
            sub="Sin responsable asignado"
            icon={Clock}
            color="amber"
          />
        </div>

        {/* Gráficas */}
        <div className="grid grid-cols-3 gap-4">
          <BarChart
            data={porTipo}
            label="Registros por tipo"
            colorClass="bg-primary"
          />
          <BarChart
            data={porRegional}
            label="Registros por regional"
            colorClass="bg-accent-blue"
          />
          <DonutStat
            label="Distribución por estado"
            segments={estadosSegmentos}
          />
        </div>

        {/* Tabla top terminales + alertas recientes */}
        <div className="grid grid-cols-2 gap-4">
          {/* Top terminales */}
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

          {/* Alertas recientes IA */}
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                Alertas IA recientes
              </h3>
              <button
                onClick={() => setPaginaActiva("ia")}
                className="text-xs text-primary hover:underline"
              >
                Ver todas →
              </button>
            </div>
            <div className="space-y-2.5">
              {alertasIA.slice(0, 4).map((a) => (
                <div key={a.id} className="flex items-start gap-2.5">
                  <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${
                    a.severidad === "critica" ? "bg-red-500" :
                    a.severidad === "alta" ? "bg-amber-500" : "bg-blue-500"
                  }`} />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-foreground leading-snug truncate">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 leading-snug line-clamp-1">{a.descripcion.slice(0, 80)}…</p>
                  </div>
                  <span className={`flex-shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    a.severidad === "critica" ? "bg-red-100 text-red-700" :
                    a.severidad === "alta" ? "bg-amber-100 text-amber-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {a.severidad === "critica" ? "Crítica" : a.severidad === "alta" ? "Alta" : "Media"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
