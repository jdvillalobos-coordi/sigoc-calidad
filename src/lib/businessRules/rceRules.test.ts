import { describe, expect, it } from "vitest";
import type { Evento, InsumoRCE } from "@/types";
import {
  filtrarInsumosRCEParaEventoAutomatico,
  generarEventosAutomaticosRCE,
  insumoRCECalificaParaEventoAutomatico,
} from "./rceRules";

function baseInsumo(overrides: Partial<InsumoRCE> = {}): InsumoRCE {
  return {
    id: "RCE-TEST",
    guia: "20000000001",
    valorRecaudo: 500_000,
    estadoRecaudo: "por_recaudar",
    estadoRevision: "pendiente",
    fechaAsignacion: "2026-04-24",
    ...overrides,
  };
}

function baseEvento(overrides: Partial<Evento> = {}): Evento {
  return {
    id: "DIN-EXISTENTE",
    estado: "abierto",
    categoria: "dineros",
    tipoEvento: "Seguimiento RCE",
    tipoEntidad: "empleado",
    fecha: "2026-04-24",
    terminal: "Bogotá",
    ciudad: "Bogotá",
    guias: ["20000000001"],
    personasResponsables: [],
    personasParticipantes: [],
    descripcionHechos: "Evento existente",
    usuarioRegistro: "u-test",
    perfilUsuario: "Test",
    terminalUsuario: "Bogotá",
    fechaRegistro: "2026-04-24T00:00:00.000Z",
    estadoFlujo: "abierto",
    anotaciones: [],
    historial: [],
    diasAbierto: 0,
    ...overrides,
  };
}

describe("reglas RCE automaticas", () => {
  it("genera evento para RCE por recaudar con valor igual a 500000", () => {
    const eventos = generarEventosAutomaticosRCE([baseInsumo()], [], {
      fechaActual: "2026-04-24T12:00:00.000Z",
      guias: [{
        numero: "20000000001",
        terminalOrigen: "Bogotá",
        ciudadOrigen: "Bogotá",
        terminalDestino: "Medellín",
        ciudadDestino: "Medellín",
        nitCliente: "900123456",
        nombreCliente: "Cliente Test",
        valorDeclarado: 500_000,
        fechaCreacion: "2026-04-24",
        estadoGeneral: "con_novedad",
      }],
    });

    expect(eventos).toHaveLength(1);
    expect(eventos[0]).toMatchObject({
      categoria: "dineros",
      tipoEvento: "Seguimiento RCE",
      estado: "abierto",
      estadoFlujo: "abierto",
      valorAfectacion: 500_000,
      valorDinero: 500_000,
      origenEvento: "automatico",
      insumoOrigenId: "RCE-TEST",
      insumoOrigenTipo: "rce",
      terminal: "Bogotá",
      ciudad: "Bogotá",
    });
  });

  it("no califica si el valor del recaudo es menor a 500000", () => {
    expect(insumoRCECalificaParaEventoAutomatico(baseInsumo({ valorRecaudo: 499_999 }))).toBe(false);
  });

  it("no califica si el estado de recaudo no es por_recaudar", () => {
    expect(insumoRCECalificaParaEventoAutomatico(baseInsumo({ estadoRecaudo: "recaudado" }))).toBe(false);
  });

  it("evita duplicados cuando ya existe un evento vinculado al insumo", () => {
    const insumo = baseInsumo();
    const existente = baseEvento({
      insumoOrigenId: insumo.id,
      insumoOrigenTipo: "rce",
    });

    expect(filtrarInsumosRCEParaEventoAutomatico([insumo], [existente])).toEqual([]);
  });

  it("evita duplicados cuando el insumo ya tiene eventoGenerado", () => {
    const insumo = baseInsumo({ eventoGenerado: "DIN-001" });

    expect(filtrarInsumosRCEParaEventoAutomatico([insumo], [])).toEqual([]);
  });
});
