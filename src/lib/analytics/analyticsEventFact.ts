import type { CategoriaEvento, Evento, EstadoFlujo } from "@/types";

export interface AnalyticsEventFact {
  id: string;
  categoria: CategoriaEvento;
  tipoEvento: string;
  subflujo?: string;
  origenEvento: "manual" | "automatico" | "desconocido";
  estadoFlujo: EstadoFlujo;
  estado: Evento["estado"];
  terminal: string;
  ciudad: string;
  regional: string;
  pais: string;
  fechaRegistro: Date | null;
  fechaAsignacion: Date | null;
  fechaEscalamiento: Date | null;
  fechaResolucion: Date | null;
  fechaEvento: Date | null;
  horasAAsignacion: number | null;
  horasACierre: number | null;
  horasAEscalamiento: number | null;
  edadHorasActual: number | null;
  sinAsignar24h: boolean;
  vencido30d: boolean;
  codigoConclusion?: string;
  resolucionFinal?: string;
  grupoCierre?: string;
  subgrupoCierre?: string;
  valorAfectacion?: number;
  valorDeclarado?: number;
  asignadoAId?: string;
  asignadoANombre?: string;
  resueltoPorId?: string;
  resueltoPorNombre?: string;
}

const FALLBACK_REGION = "Sin regional";
const FALLBACK_COUNTRY = "Sin país";

function safeParseDate(raw?: string): Date | null {
  if (!raw?.trim()) return null;
  const t = raw.trim();
  const withTime = /^\d{4}-\d{2}-\d{2}$/.test(t) ? `${t}T00:00:00` : t;
  const d = new Date(withTime);
  return Number.isNaN(d.getTime()) ? null : d;
}

function diffHours(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null;
  return Math.max(0, (a.getTime() - b.getTime()) / 3_600_000);
}

function inferGeo(evento: Evento): { pais: string; regional: string } {
  if (evento.pais || evento.regional) {
    return {
      pais: evento.pais ?? FALLBACK_COUNTRY,
      regional: evento.regional ?? FALLBACK_REGION,
    };
  }
  return { pais: FALLBACK_COUNTRY, regional: FALLBACK_REGION };
}

export function buildAnalyticsEventFacts(eventos: Evento[]): AnalyticsEventFact[] {
  const now = new Date();
  return eventos.map((e) => {
    const fechaRegistro = safeParseDate(e.fechaRegistro) ?? safeParseDate(e.fecha);
    const fechaEvento = safeParseDate(e.fecha);
    const fechaAsignacion = safeParseDate(e.fechaAsignacion);
    const fechaEscalamiento = safeParseDate(e.fechaEscalamiento);
    const fechaResolucion = safeParseDate(e.fechaResolucion);
    const geo = inferGeo(e);
    const edadHorasActual = diffHours(now, fechaRegistro);
    const horasAAsignacion = diffHours(fechaAsignacion, fechaRegistro);
    const horasAEscalamiento = diffHours(fechaEscalamiento, fechaRegistro);
    const horasACierre = diffHours(fechaResolucion, fechaRegistro);
    const sinAsignar24h = e.estadoFlujo !== "cerrado" && !e.asignadoA && (edadHorasActual ?? 0) >= 24;
    const vencido30d = e.estadoFlujo !== "cerrado" && (edadHorasActual ?? 0) >= 24 * 30;

    return {
      id: e.id,
      categoria: e.categoria,
      tipoEvento: e.tipoEvento,
      subflujo: e.subflujo,
      origenEvento: e.origenEvento ?? "desconocido",
      estadoFlujo: e.estadoFlujo,
      estado: e.estado,
      terminal: e.terminal,
      ciudad: e.ciudad,
      regional: geo.regional,
      pais: geo.pais,
      fechaRegistro,
      fechaAsignacion,
      fechaEscalamiento,
      fechaResolucion,
      fechaEvento,
      horasAAsignacion,
      horasACierre,
      horasAEscalamiento,
      edadHorasActual,
      sinAsignar24h,
      vencido30d,
      codigoConclusion: e.codigoConclusion,
      resolucionFinal: e.resolucionFinal,
      grupoCierre: e.grupoCierre,
      subgrupoCierre: e.subgrupoCierre,
      valorAfectacion: e.valorAfectacion,
      valorDeclarado: e.valorDeclarado,
      asignadoAId: e.asignadoA?.id,
      asignadoANombre: e.asignadoA?.nombre,
      resueltoPorId: e.resueltoPor?.id,
      resueltoPorNombre: e.resueltoPor?.nombre,
    };
  });
}

