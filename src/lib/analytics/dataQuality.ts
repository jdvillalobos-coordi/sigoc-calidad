import type { Evento } from "@/types";

export interface DataQualityRuleResult {
  eventoId: string;
  ruleId: string;
  ok: boolean;
  message: string;
}

export interface DataQualitySummary {
  totalEventos: number;
  totalReglasEvaluadas: number;
  totalIncumplimientos: number;
  cumplimientoPct: number;
  porRegla: Array<{ ruleId: string; ok: number; fail: number }>;
}

type QualityRule = {
  id: string;
  applies: (e: Evento) => boolean;
  check: (e: Evento) => boolean;
  message: string;
};

const QUALITY_RULES: QualityRule[] = [
  {
    id: "closed_requires_resolution_date",
    applies: (e) => e.estadoFlujo === "cerrado",
    check: (e) => !!e.fechaResolucion,
    message: "Evento cerrado sin fecha de resolución",
  },
  {
    id: "closed_requires_resolver",
    applies: (e) => e.estadoFlujo === "cerrado",
    check: (e) => !!e.resueltoPor?.nombre,
    message: "Evento cerrado sin responsable de resolución",
  },
  {
    id: "assigned_requires_assignment_date",
    applies: (e) => !!e.asignadoA,
    check: (e) => !!e.fechaAsignacion,
    message: "Evento asignado sin fecha de asignación",
  },
  {
    id: "escalated_requires_reason",
    applies: (e) => e.estadoFlujo === "escalado",
    check: (e) => !!e.motivoEscalamiento?.trim(),
    message: "Evento escalado sin motivo de escalamiento",
  },
  {
    id: "investigacion_faltantes_closure_minimum",
    applies: (e) => e.subflujo === "investigacion_faltantes" && e.estadoFlujo === "cerrado",
    check: (e) =>
      !!e.hallazgosOrigen?.trim()
      && !!e.hallazgosDestino?.trim()
      && !!e.codigoConclusion
      && !!e.terminalResponsable
      && !!e.equipoResponsable?.trim()
      && !!e.codigoEmpleadoResponsable?.trim()
      && !!e.nombreEmpleadoResponsable?.trim(),
    message: "Cierre de investigación faltantes incompleto",
  },
];

export function evaluateDataQuality(eventos: Evento[]): DataQualityRuleResult[] {
  const out: DataQualityRuleResult[] = [];
  eventos.forEach((evento) => {
    QUALITY_RULES.forEach((rule) => {
      if (!rule.applies(evento)) return;
      const ok = rule.check(evento);
      out.push({
        eventoId: evento.id,
        ruleId: rule.id,
        ok,
        message: rule.message,
      });
    });
  });
  return out;
}

export function summarizeDataQuality(results: DataQualityRuleResult[], totalEventos: number): DataQualitySummary {
  const map = new Map<string, { ok: number; fail: number }>();
  results.forEach((r) => {
    const row = map.get(r.ruleId) ?? { ok: 0, fail: 0 };
    if (r.ok) row.ok += 1;
    else row.fail += 1;
    map.set(r.ruleId, row);
  });

  const totalIncumplimientos = results.filter((r) => !r.ok).length;
  const totalReglasEvaluadas = results.length;
  const cumplimientoPct = totalReglasEvaluadas > 0
    ? ((totalReglasEvaluadas - totalIncumplimientos) / totalReglasEvaluadas) * 100
    : 100;

  return {
    totalEventos,
    totalReglasEvaluadas,
    totalIncumplimientos,
    cumplimientoPct,
    porRegla: Array.from(map.entries())
      .map(([ruleId, value]) => ({ ruleId, ...value }))
      .sort((a, b) => b.fail - a.fail),
  };
}

