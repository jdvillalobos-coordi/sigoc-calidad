export type MetricLayer = "sla_eficiencia" | "calidad_investigacion" | "riesgo_tendencia" | "ia_evidencias";
export type MetricOwner = "operaciones" | "seguridad" | "analitica" | "ia";

export interface MetricDefinition {
  id: string;
  nombre: string;
  capa: MetricLayer;
  descripcion: string;
  formula: string;
  cortes: string[];
  frecuencia: "diaria" | "semanal" | "mensual";
  owner: MetricOwner;
}

export const METRIC_DICTIONARY: MetricDefinition[] = [
  {
    id: "mtta_horas",
    nombre: "MTTA (horas)",
    capa: "sla_eficiencia",
    descripcion: "Tiempo promedio desde registro hasta asignación inicial.",
    formula: "avg(fechaAsignacion - fechaRegistro)",
    cortes: ["terminal", "categoria", "subflujo", "asignadoA"],
    frecuencia: "diaria",
    owner: "operaciones",
  },
  {
    id: "mttr_horas",
    nombre: "MTTR (horas)",
    capa: "sla_eficiencia",
    descripcion: "Tiempo promedio desde registro hasta cierre del caso.",
    formula: "avg(fechaResolucion - fechaRegistro)",
    cortes: ["terminal", "categoria", "subflujo", "resueltoPor"],
    frecuencia: "diaria",
    owner: "operaciones",
  },
  {
    id: "brecha_sla_asignacion",
    nombre: "Brecha SLA asignación 24h",
    capa: "sla_eficiencia",
    descripcion: "Porcentaje de eventos abiertos sin asignar por más de 24h.",
    formula: "eventosAbiertosSinAsignar24h / eventosAbiertos",
    cortes: ["terminal", "categoria", "pais", "regional"],
    frecuencia: "diaria",
    owner: "operaciones",
  },
  {
    id: "cierre_investigacion_completo",
    nombre: "Cierre investigación completo",
    capa: "calidad_investigacion",
    descripcion: "Porcentaje de cierres con campos obligatorios diligenciados según subflujo.",
    formula: "cierresCompletos / cierresTotales",
    cortes: ["subflujo", "terminal", "categoria", "codigoConclusion"],
    frecuencia: "semanal",
    owner: "seguridad",
  },
  {
    id: "tiempo_por_conclusion",
    nombre: "Tiempo de cierre por conclusión",
    capa: "calidad_investigacion",
    descripcion: "Horas promedio de cierre agrupadas por código de conclusión.",
    formula: "avg(fechaResolucion - fechaRegistro) by codigoConclusion",
    cortes: ["codigoConclusion", "terminal", "equipoResponsable"],
    frecuencia: "semanal",
    owner: "seguridad",
  },
  {
    id: "trend_backlog_30d",
    nombre: "Tendencia backlog 30 días",
    capa: "riesgo_tendencia",
    descripcion: "Evolución diaria de eventos abiertos para detectar crecimiento o alivio del backlog.",
    formula: "count(eventosAbiertos) by dia",
    cortes: ["terminal", "categoria", "subflujo"],
    frecuencia: "diaria",
    owner: "analitica",
  },
  {
    id: "riesgo_terminal_categoria",
    nombre: "Score riesgo terminal-categoría",
    capa: "riesgo_tendencia",
    descripcion: "Score compuesto por volumen abierto, aging y brecha SLA por cruce terminal-categoría.",
    formula: "abiertos + (vencidos*2) + sinAsignar24h",
    cortes: ["terminal", "categoria", "regional", "pais"],
    frecuencia: "diaria",
    owner: "operaciones",
  },
  {
    id: "efectividad_alerta_ia",
    nombre: "Efectividad alerta IA",
    capa: "ia_evidencias",
    descripcion: "Relación entre alertas IA y casos confirmados por auditor.",
    formula: "alertasConfirmadas / alertasTotales",
    cortes: ["terminal", "tipoEvidencia", "operador"],
    frecuencia: "semanal",
    owner: "ia",
  },
  {
    id: "precision_operador_ia",
    nombre: "Precisión operativa IA",
    capa: "ia_evidencias",
    descripcion: "Distribución de confirma/falso_positivo/falso_negativo para monitorear desempeño del modelo.",
    formula: "count(veredictoOperador) by tipo",
    cortes: ["terminal", "tipoEvidencia", "operador"],
    frecuencia: "diaria",
    owner: "ia",
  },
];

