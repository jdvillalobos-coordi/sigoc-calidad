import type { Evento } from "@/types";

/** Horas sin analista/responsable antes de marcar SLA (todos los eventos operativos). */
export const HORAS_SLA_SIN_ASIGNAR = 24;

export function parseInstanteRegistro(raw: string | undefined): Date | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  if (t.includes("T")) {
    const d = new Date(t);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) {
    const d = new Date(`${t}T00:00:00`);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Caso cerrado o con analista (asignadoA) o con responsable de escalamiento activo. */
export function eventoTieneResponsableOperativo(e: Evento): boolean {
  if (e.estadoFlujo === "cerrado") return true;
  if (e.asignadoA) return true;
  if (e.estadoFlujo === "escalado" && e.escaladoA) return true;
  return false;
}

/** Horas desde registro del evento sin responsable operativo; null si ya tiene responsable o sin fecha. */
export function horasSinResponsableOperativo(e: Evento): number | null {
  if (eventoTieneResponsableOperativo(e)) return null;
  const start = parseInstanteRegistro(e.fechaRegistro) ?? parseInstanteRegistro(e.fecha);
  if (!start) return null;
  return (Date.now() - start.getTime()) / 3_600_000;
}

/** Evento activo sin asignar ni escalado a nadie, y ≥24 h desde fecha de registro. */
export function eventoSinAsignarSlaCritico(e: Evento): boolean {
  const h = horasSinResponsableOperativo(e);
  if (h === null) return false;
  return h >= HORAS_SLA_SIN_ASIGNAR;
}
