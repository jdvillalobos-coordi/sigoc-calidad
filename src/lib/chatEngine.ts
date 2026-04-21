import {
  eventos,
  personas,
  vehiculos,
  guias,
  evidencias,
  alertasIA,
  insumosRCE,
  insumosFaltantes,
  getEventosPorPersona,
  getEventosPorGuia,
  getEventosPorVehiculo,
  getPersona,
  getGuia,
  getMonedaPorTerminal,
} from "@/data/mockData";
import type { Evento, Persona } from "@/types";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  entities?: ChatEntity[];
  timestamp: Date;
}

export interface ChatEntity {
  type: "persona" | "evento" | "vehiculo" | "guia" | "terminal";
  id: string;
  label: string;
}

interface QueryResult {
  content: string;
  entities: ChatEntity[];
}

const normalize = (s: string) =>
  s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

function extractNumbers(text: string): string[] {
  return text.match(/\d{5,}/g) || [];
}

function matchesAny(text: string, keywords: string[]): boolean {
  const n = normalize(text);
  return keywords.some((k) => n.includes(k));
}

function formatCurrency(v: number, currency = "COP", locale = "es-CO"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 0 }).format(v);
}

function formatEventoResumen(e: Evento): string {
  const responsables = e.personasResponsables.map((p) => p.nombre).join(", ") || "Sin asignar";
  const m = getMonedaPorTerminal(e.terminal);
  const valor = e.valorAfectacion ? ` | Valor: ${formatCurrency(e.valorAfectacion, m.currency, m.locale)}` : "";
  return `**${e.id}** — ${e.tipoEvento} (${e.categoria}) | ${e.terminal} | ${e.estado}${valor} | Responsable: ${responsables} | ${e.diasAbierto} días abierto`;
}

function formatPersonaResumen(p: Persona): string {
  const eventosP = getEventosPorPersona(p.id);
  const abiertos = eventosP.filter((e) => e.estado === "abierto").length;
  return `**${p.nombre}** (CC ${p.cedula}) | ${p.cargo} | ${p.terminal} | ${eventosP.length} eventos (${abiertos} abiertos)`;
}

// --- Intent detection and response ---

function intentBuscarEvento(text: string): QueryResult | null {
  const n = normalize(text);
  const idMatch = text.match(/\b(DIN|UNI|LIS|EVI|PQR|DIS)-\d{3}\b/i);
  if (idMatch) {
    const id = idMatch[0].toUpperCase();
    const ev = eventos.find((e) => e.id === id);
    if (!ev) return { content: `No encontré ningún evento con ID **${id}**.`, entities: [] };
    const entities: ChatEntity[] = [{ type: "evento", id: ev.id, label: ev.id }];
    ev.personasResponsables.forEach((p) => entities.push({ type: "persona", id: p.personaId, label: p.nombre }));
    const anotaciones = ev.anotaciones.length > 0
      ? "\n\n**Última anotación:** " + ev.anotaciones[ev.anotaciones.length - 1].texto
      : "";
    return {
      content: `Encontré el evento:\n\n${formatEventoResumen(ev)}\n\n**Descripción:** ${ev.descripcionHechos}${anotaciones}`,
      entities,
    };
  }

  if (matchesAny(n, ["evento", "eventos", "registro", "registros", "caso", "casos"])) {
    if (matchesAny(n, ["abierto", "abiertos", "pendiente", "pendientes", "activo", "activos"])) {
      const abiertos = eventos.filter((e) => e.estado === "abierto");
      const entities = abiertos.slice(0, 5).map((e) => ({ type: "evento" as const, id: e.id, label: e.id }));
      return {
        content: `Hay **${abiertos.length} eventos abiertos** en el sistema.\n\nLos más recientes:\n${abiertos.slice(0, 5).map((e) => `- ${formatEventoResumen(e)}`).join("\n")}`,
        entities,
      };
    }

    if (matchesAny(n, ["cerrado", "cerrados", "resuelto", "resueltos"])) {
      const cerrados = eventos.filter((e) => e.estado === "cerrado");
      return {
        content: `Hay **${cerrados.length} eventos cerrados**.\n\n${cerrados.slice(0, 5).map((e) => `- ${formatEventoResumen(e)}`).join("\n")}`,
        entities: cerrados.slice(0, 5).map((e) => ({ type: "evento", id: e.id, label: e.id })),
      };
    }

    if (matchesAny(n, ["vencido", "vencidos", "antiguo", "antiguos", "viejo"])) {
      const vencidos = eventos.filter((e) => e.estado === "abierto" && e.diasAbierto > 30).sort((a, b) => b.diasAbierto - a.diasAbierto);
      if (vencidos.length === 0) return { content: "No hay eventos vencidos (más de 30 días abiertos).", entities: [] };
      return {
        content: `Hay **${vencidos.length} eventos con más de 30 días abiertos**:\n\n${vencidos.map((e) => `- ${formatEventoResumen(e)}`).join("\n")}`,
        entities: vencidos.map((e) => ({ type: "evento", id: e.id, label: e.id })),
      };
    }

    return null;
  }
  return null;
}

function intentBuscarPersona(text: string): QueryResult | null {
  const n = normalize(text);
  if (!matchesAny(n, ["persona", "empleado", "conductor", "auxiliar", "operador", "mensajero", "quien", "responsable", "carlos", "hernan", "luisa", "marta", "felipe", "gloria", "andres", "camilo", "edgar", "natalia", "roberto", "claudia", "javier"])) {
    const nums = extractNumbers(text);
    if (nums.length > 0) {
      const persona = personas.find((p) => nums.some((num) => p.cedula.includes(num)));
      if (persona) {
        const evts = getEventosPorPersona(persona.id);
        return {
          content: `Encontré a **${persona.nombre}**:\n\n${formatPersonaResumen(persona)}\n\n**Eventos vinculados:**\n${evts.length > 0 ? evts.map((e) => `- ${formatEventoResumen(e)}`).join("\n") : "Ninguno"}`,
          entities: [
            { type: "persona", id: persona.id, label: persona.nombre },
            ...evts.slice(0, 3).map((e) => ({ type: "evento" as const, id: e.id, label: e.id })),
          ],
        };
      }
    }
    return null;
  }

  const nombres = personas.filter((p) => {
    const pn = normalize(p.nombre);
    const words = normalize(text).split(/\s+/);
    return words.some((w) => w.length > 3 && pn.includes(w));
  });

  if (nombres.length === 1) {
    const p = nombres[0];
    const evts = getEventosPorPersona(p.id);
    return {
      content: `Encontré a **${p.nombre}**:\n\n${formatPersonaResumen(p)}\n\n**Eventos vinculados:**\n${evts.length > 0 ? evts.map((e) => `- ${formatEventoResumen(e)}`).join("\n") : "Ninguno"}`,
      entities: [
        { type: "persona", id: p.id, label: p.nombre },
        ...evts.slice(0, 3).map((e) => ({ type: "evento" as const, id: e.id, label: e.id })),
      ],
    };
  }

  if (nombres.length > 1) {
    return {
      content: `Encontré **${nombres.length} personas** que coinciden:\n\n${nombres.map((p) => `- ${formatPersonaResumen(p)}`).join("\n")}`,
      entities: nombres.map((p) => ({ type: "persona", id: p.id, label: p.nombre })),
    };
  }


  return null;
}

function intentBuscarTerminal(text: string): QueryResult | null {
  const n = normalize(text);
  const terminales = ["bogota", "medellin", "cali", "barranquilla", "cartagena", "bucaramanga", "pereira", "monterrey", "cdmx"];
  const terminalMap: Record<string, string> = {
    bogota: "Bogotá", medellin: "Medellín", cali: "Cali", barranquilla: "Barranquilla",
    cartagena: "Cartagena", bucaramanga: "Bucaramanga", pereira: "Pereira", monterrey: "Monterrey", cdmx: "CDMX",
  };

  const found = terminales.find((t) => n.includes(t));
  if (!found) return null;

  const terminalNombre = terminalMap[found];
  const evts = eventos.filter((e) => normalize(e.terminal) === found);
  const abiertos = evts.filter((e) => e.estado === "abierto");
  const categorias = evts.reduce((acc, e) => {
    acc[e.categoria] = (acc[e.categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const valorTotal = evts.reduce((acc, e) => acc + (e.valorAfectacion || 0), 0);

  const catResumen = Object.entries(categorias).map(([k, v]) => `${k}: ${v}`).join(", ");

  return {
    content: `**Terminal ${terminalNombre}** tiene **${evts.length} eventos** (${abiertos.length} abiertos).\n\n**Por categoría:** ${catResumen}\n**Valor total de afectación:** ${(() => { const m = getMonedaPorTerminal(terminalNombre); return formatCurrency(valorTotal, m.currency, m.locale); })()}\n\n**Eventos abiertos:**\n${abiertos.slice(0, 5).map((e) => `- ${formatEventoResumen(e)}`).join("\n") || "Ninguno"}`,
    entities: [
      { type: "terminal", id: terminalNombre, label: `Terminal ${terminalNombre}` },
      ...abiertos.slice(0, 3).map((e) => ({ type: "evento" as const, id: e.id, label: e.id })),
    ],
  };
}

function intentBuscarGuia(text: string): QueryResult | null {
  const nums = extractNumbers(text);
  if (nums.length === 0) return null;

  for (const num of nums) {
    const guia = getGuia(num);
    if (guia) {
      const evts = getEventosPorGuia(guia.numero);
      const evid = evidencias.filter((e) => e.guia === guia.numero);
      return {
        content: `**Guía ${guia.numero}**\n\nOrigen: ${guia.terminalOrigen} → Destino: ${guia.terminalDestino}\nCliente: ${guia.nombreCliente} (NIT ${guia.nitCliente})\nValor declarado: ${(() => { const m = getMonedaPorTerminal(guia.terminalOrigen); return formatCurrency(guia.valorDeclarado, m.currency, m.locale); })()}\nEstado: ${guia.estadoGeneral}\n\n**Eventos asociados (${evts.length}):**\n${evts.map((e) => `- ${formatEventoResumen(e)}`).join("\n") || "Ninguno"}\n\n**Evidencias (${evid.length}):**\n${evid.map((e) => `- ${e.id}: ${e.resultadoIA} | ${e.terminal}`).join("\n") || "Ninguna"}`,
        entities: [
          { type: "guia", id: guia.numero, label: `Guía ${guia.numero}` },
          ...evts.map((e) => ({ type: "evento" as const, id: e.id, label: e.id })),
        ],
      };
    }
  }
  return null;
}

function intentBuscarVehiculo(text: string): QueryResult | null {
  const placaMatch = text.match(/\b[A-Z]{3}[-\s]?\d{3}\b/i);
  if (!placaMatch && !matchesAny(normalize(text), ["vehiculo", "placa", "tractomula", "furgon", "turbo"])) return null;

  if (placaMatch) {
    const placa = placaMatch[0].toUpperCase().replace(/\s/g, "-");
    const v = vehiculos.find((veh) => veh.placa === placa);
    if (!v) return { content: `No encontré ningún vehículo con placa **${placa}**.`, entities: [] };
    const evts = getEventosPorVehiculo(v.id);
    const conductor = v.conductorId ? getPersona(v.conductorId) : null;
    return {
      content: `**Vehículo ${v.placa}** (${v.tipo}) | Estado: ${v.estado}${conductor ? `\nConductor asignado: ${conductor.nombre}` : ""}\n\n**Eventos vinculados (${evts.length}):**\n${evts.map((e) => `- ${formatEventoResumen(e)}`).join("\n") || "Ninguno"}`,
      entities: [
        { type: "vehiculo", id: v.id, label: v.placa },
        ...(conductor ? [{ type: "persona" as const, id: conductor.id, label: conductor.nombre }] : []),
        ...evts.slice(0, 3).map((e) => ({ type: "evento" as const, id: e.id, label: e.id })),
      ],
    };
  }

  if (matchesAny(normalize(text), ["bloqueado"])) {
    const bloqueados = vehiculos.filter((v) => v.estado === "bloqueado");
    return {
      content: `Hay **${bloqueados.length} vehículo(s) bloqueados**:\n\n${bloqueados.map((v) => `- **${v.placa}** (${v.tipo})`).join("\n")}`,
      entities: bloqueados.map((v) => ({ type: "vehiculo", id: v.id, label: v.placa })),
    };
  }

  return null;
}

function intentBuscarCategoria(text: string): QueryResult | null {
  const n = normalize(text);
  const categoriaMap: Record<string, string> = {
    dinero: "dineros", dineros: "dineros", plata: "dineros", hurto: "dineros", faltante: "dineros",
    unidad: "unidades", unidades: "unidades", paquete: "unidades", mercancia: "unidades",
    lista: "listas_vinculantes", listas: "listas_vinculantes", vinculante: "listas_vinculantes", antecedente: "listas_vinculantes",
    pqr: "pqr", queja: "pqr", reclamo: "pqr", reclamacion: "pqr", peticion: "pqr",
    disciplinario: "disciplinarios", disciplinarios: "disciplinarios", sancion: "disciplinarios", falta: "disciplinarios",
  };

  let cat: string | null = null;
  for (const [keyword, categoria] of Object.entries(categoriaMap)) {
    if (n.includes(keyword)) { cat = categoria; break; }
  }
  if (!cat) return null;

  if (!matchesAny(n, ["cuantos", "cuantas", "cuanto", "cuanta", "total", "resumen", "listado", "listar", "mostrar", "dame", "dime", "ver"])) return null;

  const filtrados = eventos.filter((e) => e.categoria === cat);
  const abiertos = filtrados.filter((e) => e.estado === "abierto");
  const valorTotal = filtrados.reduce((acc, e) => acc + (e.valorAfectacion || 0), 0);
  const catLabel = { dineros: "Dineros", unidades: "Unidades", listas_vinculantes: "Listas Vinculantes", pqr: "Solicitudes Postventa", disciplinarios: "Disciplinarios" }[cat!] || cat;

  return {
    content: `**Categoría ${catLabel}:** ${filtrados.length} eventos total (${abiertos.length} abiertos)\nValor total de afectación: ${formatCurrency(valorTotal)}\n\n**Eventos abiertos:**\n${abiertos.slice(0, 6).map((e) => `- ${formatEventoResumen(e)}`).join("\n") || "Ninguno"}`,
    entities: abiertos.slice(0, 5).map((e) => ({ type: "evento", id: e.id, label: e.id })),
  };
}

function intentResumen(text: string): QueryResult | null {
  const n = normalize(text);
  if (!matchesAny(n, ["resumen", "panorama", "dashboard", "general", "estado general", "como esta", "como va", "situacion"])) return null;

  const totalEventos = eventos.length;
  const abiertos = eventos.filter((e) => e.estado === "abierto");
  const valorTotal = abiertos.reduce((acc, e) => acc + (e.valorAfectacion || 0), 0);
  const alertasNuevas = alertasIA.filter((a) => a.estado === "nueva");
  const evidenciasPend = evidencias.filter((e) => !e.veredictoOperador);

  const porCategoria = abiertos.reduce((acc, e) => {
    acc[e.categoria] = (acc[e.categoria] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const porTerminal = abiertos.reduce((acc, e) => {
    acc[e.terminal] = (acc[e.terminal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topTerminal = Object.entries(porTerminal).sort((a, b) => b[1] - a[1])[0];

  return {
    content: `**Resumen general del sistema:**\n\n- **${totalEventos}** eventos totales, **${abiertos.length}** abiertos\n- Valor total de afectación abierta: **${formatCurrency(valorTotal)}**\n- **${alertasNuevas.length}** alertas IA nuevas sin revisar\n- **${evidenciasPend.length}** evidencias pendientes de auditoría\n\n**Por categoría (abiertos):**\n${Object.entries(porCategoria).map(([k, v]) => `- ${k}: ${v}`).join("\n")}\n\n**Terminal con más casos abiertos:** ${topTerminal ? `${topTerminal[0]} (${topTerminal[1]})` : "N/A"}`,
    entities: [],
  };
}

function intentEvidencias(text: string): QueryResult | null {
  const n = normalize(text);
  if (!matchesAny(n, ["evidencia", "evidencias", "foto", "fotos", "validacion", "ia cumple", "no cumple", "falso positivo", "falso negativo"])) return null;

  const cumple = evidencias.filter((e) => e.resultadoIA === "cumple");
  const noCumple = evidencias.filter((e) => e.resultadoIA === "no_cumple");
  const pendientes = evidencias.filter((e) => !e.veredictoOperador);
  const falsosPositivos = evidencias.filter((e) => e.veredictoOperador === "falso_positivo");
  const falsosNegativos = evidencias.filter((e) => e.veredictoOperador === "falso_negativo");

  return {
    content: `**Módulo de Evidencias IA:**\n\n- Total evidencias: **${evidencias.length}**\n- IA cumple: **${cumple.length}** | IA no cumple: **${noCumple.length}**\n- Pendientes de revisión operador: **${pendientes.length}**\n- Falsos positivos (IA dijo cumple pero no): **${falsosPositivos.length}**\n- Falsos negativos (IA dijo no cumple pero sí): **${falsosNegativos.length}**\n\n**Pendientes de revisión:**\n${pendientes.map((e) => `- ${e.id}: Guía ${e.guia} | ${e.terminal} | IA: ${e.resultadoIA}`).join("\n") || "Todas revisadas"}`,
    entities: [],
  };
}

function intentAlertas(text: string): QueryResult | null {
  const n = normalize(text);
  if (!matchesAny(n, ["alerta", "alertas", "patron", "patrones", "anomalia", "riesgo"])) return null;

  const nuevas = alertasIA.filter((a) => a.estado === "nueva");
  const criticas = alertasIA.filter((a) => a.severidad === "critica");

  return {
    content: `**Alertas IA activas:**\n\n- Total: **${alertasIA.length}** | Nuevas: **${nuevas.length}** | Críticas: **${criticas.length}**\n\n${alertasIA.map((a) => `- **${a.id}** [${a.severidad.toUpperCase()}] ${a.titulo} — Estado: ${a.estado}`).join("\n")}`,
    entities: alertasIA.flatMap((a) => a.entidadesInvolucradas.map((e) => ({
      type: e.tipo as ChatEntity["type"],
      id: e.id,
      label: e.nombre,
    }))),
  };
}

function intentEventosAuto(text: string): QueryResult | null {
  const n = normalize(text);
  if (!matchesAny(n, ["auto", "automatico", "automaticos", "rce", "recaudo", "novedad 100", "regla", "reglas"])) return null;

  // Eventos auto-generados por reglas de negocio (RCE > $1M → dineros, novedad 100 → unidades).
  // Las reglas finales aún las define negocio; por ahora reportamos el universo candidato del mock.
  const candidatosDinero = insumosRCE.filter((r) => r.valorRecaudo > 1_000_000);
  const candidatosUnidad = insumosFaltantes.filter((f) => f.codigoNovedad === "100");
  const valorCandidatos = candidatosDinero.reduce((acc, r) => acc + r.valorRecaudo, 0);

  return {
    content: `**Eventos auto-generados por reglas de negocio:**\n\nLos eventos de dineros y unidades se crean en automático cuando se cumple la regla, y el operador los toma desde el módulo Eventos (estado abierto, sin asignar). También se pueden crear manualmente.\n\n**Candidatos en el universo actual:**\n- Dineros (RCE > $1M): **${candidatosDinero.length}** guías por valor de ${formatCurrency(valorCandidatos)}\n- Unidades (novedad 100): **${candidatosUnidad.length}** guías\n\n**Top 3 RCE de mayor valor:**\n${candidatosDinero.sort((a, b) => b.valorRecaudo - a.valorRecaudo).slice(0, 3).map((r) => { const g = getGuia(r.guia); const m = getMonedaPorTerminal(g?.terminalOrigen); return `- Guía ${r.guia}: ${formatCurrency(r.valorRecaudo, m.currency, m.locale)}`; }).join("\n")}`,
    entities: [],
  };
}

function defaultResponse(): QueryResult {
  return {
    content: `No entendí bien tu pregunta. Puedo ayudarte con:\n\n- **Buscar eventos:** "Muéstrame el evento DIN-001" o "eventos abiertos"\n- **Buscar personas:** "Busca a Carlos Pérez" o "personas bloqueadas"\n- **Buscar guías:** "Información de la guía 19900293001"\n- **Buscar terminales:** "¿Cómo está Medellín?" o "eventos en Barranquilla"\n- **Buscar vehículos:** "Placa PLT-456"\n- **Resumen general:** "Dame un resumen" o "¿cómo va el panorama?"\n- **Evidencias:** "Estado de evidencias IA"\n- **Alertas:** "¿Qué alertas hay?"\n- **Eventos auto-generados:** "RCE candidatos" o "eventos automáticos"\n- **Categorías:** "¿Cuántos eventos de dineros hay?"`,
    entities: [],
  };
}

export function processQuery(text: string): QueryResult {
  const handlers = [
    intentBuscarEvento,
    intentBuscarGuia,
    intentBuscarVehiculo,
    intentBuscarPersona,
    intentBuscarTerminal,
    intentBuscarCategoria,
    intentResumen,
    intentEvidencias,
    intentAlertas,
    intentEventosAuto,
  ];

  for (const handler of handlers) {
    const result = handler(text);
    if (result) return result;
  }

  return defaultResponse();
}

export function generateInsights(): Array<{ title: string; description: string; severity: "critica" | "alta" | "media"; entities: ChatEntity[] }> {
  const abiertos = eventos.filter((e) => e.estado === "abierto");
  const vencidos = abiertos.filter((e) => e.diasAbierto > 30);
  const valorTotal = abiertos.reduce((acc, e) => acc + (e.valorAfectacion || 0), 0);

  const porTerminal = abiertos.reduce((acc, e) => {
    acc[e.terminal] = (acc[e.terminal] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);
  const topTerminal = Object.entries(porTerminal).sort((a, b) => b[1] - a[1])[0];

  const reincidentes = personas.filter((p) => {
    const evts = getEventosPorPersona(p.id).filter((e) => e.estado === "abierto");
    return evts.length >= 3;
  });

  const insights: Array<{ title: string; description: string; severity: "critica" | "alta" | "media"; entities: ChatEntity[] }> = [];

  if (vencidos.length > 0) {
    insights.push({
      title: `${vencidos.length} eventos vencidos (>30 días)`,
      description: `El más antiguo es ${vencidos.sort((a, b) => b.diasAbierto - a.diasAbierto)[0].id} con ${vencidos[0].diasAbierto} días. Requieren atención urgente.`,
      severity: "critica",
      entities: vencidos.slice(0, 2).map((e) => ({ type: "evento", id: e.id, label: e.id })),
    });
  }

  if (topTerminal && topTerminal[1] >= 3) {
    insights.push({
      title: `${topTerminal[0]} concentra ${topTerminal[1]} casos abiertos`,
      description: `Es la terminal con mayor carga de trabajo activa. Revisar asignación de recursos.`,
      severity: "alta",
      entities: [{ type: "terminal", id: topTerminal[0], label: `Terminal ${topTerminal[0]}` }],
    });
  }

  if (reincidentes.length > 0) {
    insights.push({
      title: `${reincidentes.length} persona(s) con 3+ eventos abiertos`,
      description: reincidentes.map((p) => p.nombre).join(", ") + ". Posible patrón de reincidencia.",
      severity: "critica",
      entities: reincidentes.map((p) => ({ type: "persona", id: p.id, label: p.nombre })),
    });
  }

  const candidatosDinero = insumosRCE.filter((r) => r.valorRecaudo > 1_000_000);
  if (candidatosDinero.length > 5) {
    const valor = candidatosDinero.reduce((acc, r) => acc + r.valorRecaudo, 0);
    insights.push({
      title: `${candidatosDinero.length} candidatos a evento auto-generado de dineros (${formatCurrency(valor)})`,
      description: "Volumen alto de RCE > $1M que dispararían eventos automáticos. Verificar capacidad del equipo para tomarlos.",
      severity: "alta",
      entities: [],
    });
  }

  const evidPendientes = evidencias.filter((e) => !e.veredictoOperador);
  if (evidPendientes.length > 0) {
    insights.push({
      title: `${evidPendientes.length} evidencias IA sin revisar por operador`,
      description: "Evidencias analizadas por IA que aún no han sido validadas por un operador humano.",
      severity: "media",
      entities: [],
    });
  }

  return insights;
}
