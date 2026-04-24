import type { Evento, Guia, InsumoRCE, UsuarioApp } from "@/types";

export const RCE_AUTO_EVENT_MIN_VALUE_COP = 500_000;
export const RCE_AUTO_EVENT_RULE_ID = "rce_por_recaudar_gte_500k";

const POR_RECAUDAR_NORMALIZADO = new Set([
  "por_recaudar",
  "por recaudar",
  "por-recaudar",
  "pendiente",
  "pendiente_recaudo",
  "pendiente recaudo",
  "pendiente_de_recaudo",
  "pendiente de recaudo",
]);

function normalizarTexto(valor?: string): string {
  return (valor ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

function estadoRecaudoNormalizado(insumo: InsumoRCE): string {
  if (insumo.estadoRecaudo) return normalizarTexto(insumo.estadoRecaudo);
  return insumo.estadoRevision === "pendiente" ? "por_recaudar" : "";
}

export function insumoRCECalificaParaEventoAutomatico(insumo: InsumoRCE): boolean {
  return POR_RECAUDAR_NORMALIZADO.has(estadoRecaudoNormalizado(insumo))
    && insumo.valorRecaudo >= RCE_AUTO_EVENT_MIN_VALUE_COP;
}

function eventosYaVinculadosAInsumo(eventos: Evento[]): Set<string> {
  return new Set(
    eventos
      .filter((evento) => evento.insumoOrigenTipo === "rce" && evento.insumoOrigenId)
      .map((evento) => evento.insumoOrigenId as string)
  );
}

function buscarGuia(guias: Guia[] | undefined, numero: string): Guia | undefined {
  return guias?.find((guia) => guia.numero === numero);
}

function crearIdEvento(insumo: InsumoRCE): string {
  const suffix = insumo.id.replace(/[^a-z0-9]/gi, "-").toUpperCase();
  return `DIN-${suffix}`;
}

function eventoExistenteParaInsumo(insumo: InsumoRCE, eventos: Evento[], vinculados: Set<string>): boolean {
  if (insumo.eventoGenerado) return true;
  if (vinculados.has(insumo.id)) return true;

  const idEvento = crearIdEvento(insumo);
  return eventos.some((evento) => evento.id === idEvento);
}

export function filtrarInsumosRCEParaEventoAutomatico(
  insumos: InsumoRCE[],
  eventosExistentes: Evento[]
): InsumoRCE[] {
  const vinculados = eventosYaVinculadosAInsumo(eventosExistentes);
  return insumos.filter((insumo) =>
    insumoRCECalificaParaEventoAutomatico(insumo)
    && !eventoExistenteParaInsumo(insumo, eventosExistentes, vinculados)
  );
}

interface GenerarEventosRCEOptions {
  guias?: Guia[];
  usuario?: UsuarioApp;
  fechaActual?: string;
}

export function generarEventosAutomaticosRCE(
  insumos: InsumoRCE[],
  eventosExistentes: Evento[],
  options: GenerarEventosRCEOptions = {}
): Evento[] {
  const fechaRegistro = options.fechaActual ?? new Date().toISOString();
  const fecha = fechaRegistro.split("T")[0];
  const candidatos = filtrarInsumosRCEParaEventoAutomatico(insumos, eventosExistentes);

  return candidatos.map((insumo): Evento => {
    const guia = buscarGuia(options.guias, insumo.guia);
    const terminal = guia?.terminalOrigen ?? "Sin terminal";
    const ciudad = guia?.ciudadOrigen ?? terminal;
    const usuario = options.usuario;

    return {
      id: crearIdEvento(insumo),
      estado: "abierto",
      categoria: "dineros",
      tipoEvento: "Seguimiento RCE",
      origenEvento: "automatico",
      insumoOrigenId: insumo.id,
      insumoOrigenTipo: "rce",
      reglaOrigen: RCE_AUTO_EVENT_RULE_ID,
      fuenteExterna: "Regla automática RCE",
      tipoEntidad: "empleado",
      fecha: insumo.fechaAsignacion || fecha,
      terminal,
      ciudad,
      regional: undefined,
      pais: undefined,
      guias: [insumo.guia],
      personasResponsables: [],
      personasParticipantes: [],
      vehiculosVinculados: [],
      descripcionHechos: `Evento generado automáticamente por regla RCE: recaudo contra entrega por recaudar igual o superior a $500.000. Guía ${insumo.guia}, valor recaudo ${insumo.valorRecaudo}.`,
      valorAfectacion: insumo.valorRecaudo,
      valorDinero: insumo.valorRecaudo,
      usuarioRegistro: usuario?.id ?? "sistema-rce",
      perfilUsuario: usuario?.cargo ?? "Regla automática",
      terminalUsuario: usuario?.terminal ?? terminal,
      fechaRegistro,
      estadoFlujo: "abierto",
      asignadoA: undefined,
      anotaciones: [],
      historial: [{
        id: `H-${insumo.id}`,
        fecha: fechaRegistro,
        usuarioNombre: usuario?.nombre ?? "Regla automática RCE",
        accion: "Evento creado automáticamente por regla RCE >= $500.000",
      }],
      diasAbierto: 0,
    };
  });
}
