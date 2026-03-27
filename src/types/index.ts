// ============================================================
// TIPOS PRINCIPALES — Sigo Calidad (modelo unificado de Evento)
// ============================================================

export type CategoriaEvento =
  | "dineros"
  | "unidades"
  | "listas_vinculantes"
  | "pqr"
  | "disciplinarios"
  | "evidencias";

export type EstadoEvento = "abierto" | "cerrado";

export type EstadoFlujo = "abierto" | "escalado" | "cerrado";

export type ResolucionFinal =
  | "sin_hallazgos"
  | "llamado_atencion_verbal"
  | "llamado_atencion_escrito"
  | "suspension_temporal"
  | "proceso_disciplinario"
  | "desvinculacion"
  | "escalamiento_seguridad"
  | "caso_insuficiente";

export type SeveridadIA = "critica" | "alta" | "media" | "baja";

export type TipoEscalamiento = "persona" | "cctv";

export type TipoPersona = "empleado" | "aliado" | "cliente";

// ---- PersonaVinculada ----
export interface PersonaVinculada {
  personaId: string;
  cedula: string;
  nombre: string;
  rol: "responsable" | "participante";
}

// ---- Persona ----
export interface Persona {
  id: string;
  cedula: string;
  nombre: string;
  cargo: string;
  terminal: string;
  tipo: TipoPersona;
  foto?: string;
  nit?: string;
  razonSocial?: string;
}

// ---- Vehículo ----
export interface Vehiculo {
  id: string;
  placa: string;
  tipo: string;
  conductorId?: string;
  estado: "activo" | "bloqueado";
}

// ---- Guía ----
export interface Guia {
  numero: string;
  terminalOrigen: string;
  ciudadOrigen: string;
  terminalDestino: string;
  ciudadDestino: string;
  nitCliente: string;
  nombreCliente: string;
  valorDeclarado: number;
  fechaCreacion: string;
  estadoGeneral: "con_novedad" | "sin_novedad" | "cerrada";
}

// ---- Anotación de seguimiento ----
export interface Anotacion {
  id: string;
  autorId: string;
  autorNombre: string;
  autorRol: string;
  fecha: string;
  texto: string;
  tipo: "seguimiento" | "hallazgo" | "resolucion" | "nota_interna";
}

// ---- Cambio de historial ----
export interface CambioHistorial {
  id: string;
  fecha: string;
  usuarioNombre: string;
  accion: string;
}

// ---- Vínculo vehículo (para perfiles 360) ----
export interface VehiculoVinculado {
  vehiculoId: string;
  ruta?: string;
  conductorEnMomento?: string;
}

// ============================================================
// EVENTO — interface único para todos los registros
// ============================================================
export interface Evento {
  // === CAMPOS COMUNES ===
  id: string;
  estado: EstadoEvento;
  eventosAsociados?: string[];
  categoria: CategoriaEvento;
  tipoEvento: string;
  modulo?: string;
  fuenteExterna?: string;

  // === ENTIDAD INVOLUCRADA ===
  tipoEntidad: "empleado" | "aliado_goo" | "aliado_droop" | "contratista" | "tercero" | "vehiculo";

  // === CONTEXTO ===
  fecha: string;
  hora?: string;
  terminal: string;
  ciudad: string;
  regional?: string;
  pais?: string;

  // === GUÍAS ===
  guias?: string[];

  // === PERSONAS ===
  personasResponsables: PersonaVinculada[];
  personasParticipantes: PersonaVinculada[];

  // === VEHÍCULOS (para compatibilidad con perfiles 360) ===
  vehiculosVinculados?: VehiculoVinculado[];

  // === CONTENIDO ===
  descripcionHechos: string;
  valorAfectacion?: number;
  imagenesUrls?: string[];
  direccion?: string;

  // === SOLUCIÓN ===
  solucion?: string;
  tipoSolucion?: "operativa" | "seguridad";

  // === AUDITORÍA ===
  usuarioRegistro: string;
  perfilUsuario: string;
  terminalUsuario: string;
  fechaRegistro: string;

  // === CAMPOS ESPECÍFICOS POR CATEGORÍA ===
  // Dineros:
  valorDinero?: number;
  // Unidades:
  codigoNovedad?: string;
  // Proceso Evidencias:
  resultadoIA?: "cumple" | "no_cumple";
  veredictoOperador?: "confirma" | "falso_negativo" | "falso_positivo";
  justificacionOperador?: string;
  // PQR (Posventa):
  rolSolicitante?: "remitente" | "destinatario" | "tercero";
  nitCliente?: string;
  nombreCliente?: string;
  terminalDestino?: string;
  ciudadDestino?: string;
  tipoPoblacionOrigen?: "directa_domestica" | "reexpedicion";
  tipoPoblacionDestino?: "directa_domestica" | "reexpedicion";
  equipoRecogida?: string;
  equipoEntrega?: string;
  equipoTenencia?: number;
  // Gestión de Seguridad (RCE / Faltantes):
  intervencionSeguridad?: string;
  desviacionesIdentificadas?: string;
  estadoGestionSG?: string;
  causaRaiz?: string;
  grupoCierre?: string;
  subgrupoCierre?: string;
  // Disciplinarios:
  gravedadFalta?: "leve" | "grave" | "gravisima";
  decisionGH?: string;

  // === FLUJO DE TRABAJO ===
  estadoFlujo: EstadoFlujo;
  asignadoA?: { id: string; nombre: string; cargo: string };
  tipoEscalamiento?: TipoEscalamiento;
  escaladoA?: { id: string; nombre: string; cargo: string };
  escaladoPor?: { id: string; nombre: string };
  fechaEscalamiento?: string;
  motivoEscalamiento?: string;

  // === RESOLUCIÓN ===
  resolucionFinal?: ResolucionFinal;
  observacionResolucion?: string;
  fechaResolucion?: string;
  resueltoPor?: { id: string; nombre: string };

  // === SEGUIMIENTO ===
  anotaciones: Anotacion[];
  historial: CambioHistorial[];
  diasAbierto: number;
}

// ---- Actividad Lesiva (bloqueo de persona o vehículo con evidencia) ----
export type TipoImplicado =
  | "empleado"
  | "aliado_goo"
  | "aliado_droop"
  | "reexpedidor"
  | "vehiculo"
  | "remitente"
  | "destinatario"
  | "delincuencia"
  | "candidato_descartado";

export type CategoriaLesiva =
  | "antecedentes"
  | "suplantacion"
  | "hurto"
  | "hurto_dinero"
  | "hurto_vehiculos"
  | "entrega"
  | "infraccion_transito"
  | "siplaft"
  | "fuga_informacion"
  | "delincuencia_comun";

export interface ActividadLesiva {
  id: string;
  tipoImplicado: TipoImplicado;
  identificacion: string;
  nombre: string;
  placa?: string;
  categoria: CategoriaLesiva;
  subcategoria: string;
  observaciones: string;
  terminalReporta: string;
  archivoAdjunto?: string;
  fechaRegistro: string;
  registradoPor: { id: string; nombre: string };
  personaId?: string;
  vehiculoId?: string;
}

// ---- Resolución acumulativa (decisión sobre persona con múltiples eventos) ----
export interface ResolucionAcumulativa {
  id: string;
  personaId: string;
  eventosVinculados: string[];
  resolucion: ResolucionFinal;
  observaciones: string;
  fecha: string;
  creadoPor: { id: string; nombre: string };
}

// ---- Solicitud CCTV ----
export interface SolicitudCCTV {
  id: string;
  eventoId: string;
  terminalSolicitante: string;
  terminalInvestigar: string;
  tipoNovedad: string;
  guia?: string;
  descripcionSolicitud: string;
  fechaSolicitud: string;
  solicitadoPor: { id: string; nombre: string };
  asignadoA: { id: string; nombre: string; cargo: string };
  estado: "pendiente" | "en_revision" | "completada";
  conclusionCCTV?: string;
  hallazgosCCTV?: string;
  evidenciasUrls?: string[];
  personaIdentificada?: { cedula: string; nombre: string };
  fechaCierre?: string;
  investigadoPor?: { id: string; nombre: string };
}

// ---- Estudio de Seguridad ----
export interface EstudioSeguridad {
  id: string;
  personaId: string;
  proveedor: "Truora" | "ClickCloud";
  fecha: string;
  resultado: "sin_hallazgos" | "hallazgos_encontrados";
  observaciones: string;
}

// ---- Alerta IA ----
export interface AlertaIA {
  id: string;
  severidad: SeveridadIA;
  titulo: string;
  descripcion: string;
  fechaDeteccion: string;
  tipo: "reincidencia_persona" | "terminal_anomala" | "cliente_sospechoso" | "vehiculo_riesgo" | "caso_vencido";
  entidadesInvolucradas: Array<{ tipo: "persona" | "vehiculo" | "terminal" | "cliente"; id: string; nombre: string }>;
  fuentesCruzadas: string[];
  estado: "nueva" | "revisada" | "descartada";
}

// ---- Notificación ----
export type TipoNotificacion =
  | "alerta_ia"
  | "caso_asignado"
  | "caso_escalado"
  | "caso_devuelto"
  | "caso_vencido"
  | "caso_cerrado"
  | "resolucion_aplicada"
  | "posventa";

export interface Notificacion {
  id: string;
  tipo: TipoNotificacion;
  texto: string;
  tiempo: string;
  leida: boolean;
  linkRegistroId?: string;
  linkTipo?: string;
}

// ---- Usuario logueado ----
export interface UsuarioApp {
  id: string;
  nombre: string;
  cargo: string;
  terminal: string;
  correo: string;
  avatarInicial: string;
}

// ---- Evidencia (módulo de validación IA) ----
export interface Evidencia {
  id: string;
  guia: string;
  terminal: string;
  tipoEvidencia: "entrega" | "intento_entrega";
  resultadoIA: "cumple" | "no_cumple";
  fecha: string;
  // Links a las fotografías almacenadas (no imágenes embebidas)
  fotosUrls?: string[];
  // Operador que tomó la fotografía en campo
  operadorCedula?: string;
  operadorNombre?: string;
  operadorCargo?: string;
  veredictoOperador?: "confirma" | "falso_negativo" | "falso_positivo";
  justificacionOperador?: string;
  fechaRevision?: string;
  revisadoPor?: string;
}

// ---- Insumos Bandeja ----
export interface InsumoRCE {
  id: string;
  guia: string;
  valorRecaudo: number;
  estadoRevision: "pendiente" | "revisada_sin_novedad" | "con_novedad";
  fechaAsignacion: string;
  revisadoPor?: string;
  fechaRevision?: string;
  eventoGenerado?: string;
}

export interface InsumoFaltante {
  id: string;
  guia: string;
  codigoNovedad: "100" | "101" | "300" | "400" | "403" | "529";
  estadoRevision: "pendiente" | "en_investigacion" | "revisada_sin_novedad" | "con_novedad";
  fechaNovedad: string;
  terminal: string;
  ciudad: string;
  revisadoPor?: string;
  fechaRevision?: string;
  eventoGenerado?: string;
}

export interface FormPrefill {
  categoria?: CategoriaEvento;
  guia?: string;
  terminal?: string;
  codigoNovedad?: string;
}

// ---- Navegación ----
export type PaginaActiva = "inicio" | "registros" | "ia" | "configuracion" | "bandeja" | "cuadro_contacto";
export type DrawerTipo = "registro" | "persona360" | "vehiculo360" | "guia360" | "terminal360" | "resolucion_acumulativa" | null;

export interface DrawerState {
  tipo: DrawerTipo;
  id: string | null;
}
