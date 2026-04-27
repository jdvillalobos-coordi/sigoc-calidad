import type { AnalyticsEventFact } from "@/lib/analytics/analyticsEventFact";

export interface SlaKpis {
  mttaHoras: number | null;
  mttrHoras: number | null;
  breachesAsignacion24h: number;
  breachesPct: number;
}

export interface TrendPoint {
  date: string;
  abiertos: number;
  cerrados: number;
  creados: number;
  backlog: number;
}

export interface FunnelStage {
  id: "abierto" | "asignado" | "escalado" | "cerrado";
  label: string;
  value: number;
  pctFromOpen: number;
}

export interface WorkloadRow {
  id: string;
  nombre: string;
  activos: number;
  vencidos: number;
}

export interface HeatmapCell {
  terminal: string;
  categoria: string;
  abiertos: number;
  vencidos: number;
  sinAsignar24h: number;
  score: number;
}

export interface PriorityEvent {
  id: string;
  terminal: string;
  categoria: string;
  tipoEvento: string;
  score: number;
  razones: string[];
}

export interface ForecastResult {
  backlogActual: number;
  backlogProyectado7d: number;
  backlogProyectado14d: number;
  variacionDiariaPromedio: number;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((acc, n) => acc + n, 0) / values.length;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function calculateSlaKpis(facts: AnalyticsEventFact[]): SlaKpis {
  const mttaHoras = avg(facts.map((f) => f.horasAAsignacion).filter((v): v is number => v !== null));
  const mttrHoras = avg(facts.map((f) => f.horasACierre).filter((v): v is number => v !== null));
  const abiertos = facts.filter((f) => f.estadoFlujo !== "cerrado");
  const breachesAsignacion24h = abiertos.filter((f) => f.sinAsignar24h).length;
  const breachesPct = abiertos.length > 0 ? (breachesAsignacion24h / abiertos.length) * 100 : 0;
  return { mttaHoras, mttrHoras, breachesAsignacion24h, breachesPct };
}

export function buildBacklogTrend(facts: AnalyticsEventFact[], days = 30): TrendPoint[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = new Date(today);
  from.setDate(today.getDate() - (days - 1));

  const daysList: Date[] = Array.from({ length: days }, (_, i) => {
    const d = new Date(from);
    d.setDate(from.getDate() + i);
    return d;
  });

  return daysList.map((d) => {
    const key = dayKey(d);
    const abiertos = facts.filter((f) => {
      if (!f.fechaRegistro) return false;
      const created = dayKey(f.fechaRegistro) <= key;
      const closedAfterDay = !f.fechaResolucion || dayKey(f.fechaResolucion) > key;
      return created && closedAfterDay;
    }).length;
    const cerrados = facts.filter((f) => f.fechaResolucion && dayKey(f.fechaResolucion) === key).length;
    const creados = facts.filter((f) => f.fechaRegistro && dayKey(f.fechaRegistro) === key).length;
    return { date: key, abiertos, cerrados, creados, backlog: abiertos };
  });
}

export function buildClosureByConclusion(facts: AnalyticsEventFact[]): Array<{ conclusion: string; count: number; mttrHoras: number | null }> {
  const closed = facts.filter((f) => f.estadoFlujo === "cerrado");
  const map = new Map<string, { count: number; mttr: number[] }>();
  closed.forEach((f) => {
    const key = f.codigoConclusion ?? f.resolucionFinal ?? f.grupoCierre ?? "Sin conclusión";
    const row = map.get(key) ?? { count: 0, mttr: [] };
    row.count += 1;
    if (f.horasACierre !== null) row.mttr.push(f.horasACierre);
    map.set(key, row);
  });
  return Array.from(map.entries())
    .map(([conclusion, row]) => ({ conclusion, count: row.count, mttrHoras: avg(row.mttr) }))
    .sort((a, b) => b.count - a.count);
}

export function buildFlowFunnel(facts: AnalyticsEventFact[]): FunnelStage[] {
  const abiertos = facts.filter((f) => f.estadoFlujo !== "cerrado");
  const base = Math.max(1, abiertos.length);
  const opened = abiertos.length;
  const assigned = abiertos.filter((f) => !!f.asignadoAId).length;
  const escalated = facts.filter((f) => f.estadoFlujo === "escalado").length;
  const closed = facts.filter((f) => f.estadoFlujo === "cerrado").length;
  return [
    { id: "abierto", label: "Abiertos", value: opened, pctFromOpen: 100 },
    { id: "asignado", label: "Asignados", value: assigned, pctFromOpen: (assigned / base) * 100 },
    { id: "escalado", label: "Escalados", value: escalated, pctFromOpen: (escalated / base) * 100 },
    { id: "cerrado", label: "Cerrados", value: closed, pctFromOpen: (closed / base) * 100 },
  ];
}

export function buildWorkloadByAnalyst(facts: AnalyticsEventFact[]): WorkloadRow[] {
  const map = new Map<string, WorkloadRow>();
  facts.forEach((f) => {
    if (f.estadoFlujo === "cerrado" || !f.asignadoAId || !f.asignadoANombre) return;
    const row = map.get(f.asignadoAId) ?? { id: f.asignadoAId, nombre: f.asignadoANombre, activos: 0, vencidos: 0 };
    row.activos += 1;
    if (f.vencido30d) row.vencidos += 1;
    map.set(f.asignadoAId, row);
  });
  return Array.from(map.values()).sort((a, b) => b.activos - a.activos || b.vencidos - a.vencidos);
}

export function buildRiskHeatmap(facts: AnalyticsEventFact[]): HeatmapCell[] {
  const map = new Map<string, HeatmapCell>();
  facts.forEach((f) => {
    if (f.estadoFlujo === "cerrado") return;
    const key = `${f.terminal}||${f.categoria}`;
    const row = map.get(key) ?? {
      terminal: f.terminal,
      categoria: f.categoria,
      abiertos: 0,
      vencidos: 0,
      sinAsignar24h: 0,
      score: 0,
    };
    row.abiertos += 1;
    if (f.vencido30d) row.vencidos += 1;
    if (f.sinAsignar24h) row.sinAsignar24h += 1;
    row.score = row.abiertos + row.vencidos * 2 + row.sinAsignar24h * 1.5;
    map.set(key, row);
  });
  return Array.from(map.values()).sort((a, b) => b.score - a.score);
}

export function scorePriorityEvent(fact: AnalyticsEventFact): PriorityEvent {
  let score = 0;
  const razones: string[] = [];
  if (fact.estadoFlujo === "cerrado") return {
    id: fact.id,
    terminal: fact.terminal,
    categoria: fact.categoria,
    tipoEvento: fact.tipoEvento,
    score: 0,
    razones: ["Caso cerrado"],
  };
  const ageDays = (fact.edadHorasActual ?? 0) / 24;
  const ageScore = clamp(ageDays, 0, 30) * 1.2;
  score += ageScore;
  if (ageDays >= 30) razones.push("Vencido >30d");
  if (fact.sinAsignar24h) {
    score += 18;
    razones.push("Sin asignar >24h");
  }
  const value = fact.valorAfectacion ?? fact.valorDeclarado ?? 0;
  if (value > 0) {
    const valueScore = clamp(value / 500_000, 0, 25);
    score += valueScore;
    if (value >= 2_000_000) razones.push("Alto valor afectación");
  }
  if (fact.estadoFlujo === "escalado") {
    score += 10;
    razones.push("Escalado");
  }
  if (fact.subflujo === "investigacion_faltantes") {
    score += 6;
    razones.push("Subflujo investigación");
  }
  return {
    id: fact.id,
    terminal: fact.terminal,
    categoria: fact.categoria,
    tipoEvento: fact.tipoEvento,
    score: Math.round(score * 10) / 10,
    razones,
  };
}

export function topPriorityEvents(facts: AnalyticsEventFact[], limit = 7): PriorityEvent[] {
  return facts
    .map(scorePriorityEvent)
    .filter((p) => p.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function forecastBacklog(facts: AnalyticsEventFact[]): ForecastResult {
  const trend = buildBacklogTrend(facts, 14);
  const current = trend[trend.length - 1]?.backlog ?? 0;
  const deltas: number[] = [];
  for (let i = 1; i < trend.length; i += 1) {
    deltas.push(trend[i].backlog - trend[i - 1].backlog);
  }
  const avgDelta = deltas.length > 0 ? deltas.reduce((a, b) => a + b, 0) / deltas.length : 0;
  const backlogProyectado7d = Math.max(0, Math.round(current + avgDelta * 7));
  const backlogProyectado14d = Math.max(0, Math.round(current + avgDelta * 14));
  return {
    backlogActual: current,
    backlogProyectado7d,
    backlogProyectado14d,
    variacionDiariaPromedio: Math.round(avgDelta * 100) / 100,
  };
}

