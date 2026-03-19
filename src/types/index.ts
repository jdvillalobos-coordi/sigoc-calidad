// ============================================================
// TIPOS PRINCIPALES — Sigo Calidad
// ============================================================

export type TipoRegistro =
  | "faltante"
  | "evento"
  | "rce"
  | "posventa"
  | "lesiva"
  | "contacto"
  | "evidencia";

export type EstadoRegistro =
  | "en_investigacion"
  | "cerrado"
  | "vencido"
  | "pendiente"
  | "bloqueado";

export type SeveridadIA = "critica" | "alta" | "media" | "baja";

export type EstadoPersona = "sin_novedad" | "en_seguimiento" | "bloqueado";

export type TipoPersona = "empleado" | "aliado" | "cliente";

// ---- Persona ----
export interface Persona {
  id: string;
  cedula: string;
  nombre: string;
  cargo: string;
  terminal: string;
  tipo: TipoPersona;
  estado: EstadoPersona;
  foto?: string;
  nit?: string; // solo clientes
  razonSocial?: string; // solo clientes
}

// ---- Vehículo ----
export interface Vehiculo {
  id: string;
  placa: string;
  tipo: string; // Furgón, Turbo, Tractomula
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
  tipo: "seguimiento" | "hallazgo" | "hallazgo_investigacion" | "hallazgo_campo" | "validacion_evidencia" | "resolucion" | "nota_interna";
}

// ---- Cambio de historial ----
export interface CambioHistorial {
  id: string;
  fecha: string;
  usuarioNombre: string;
  accion: string;
}

// ---- Persona vinculada a registro ----
export interface PersonaVinculada {
  personaId: string;
  rol: "responsable" | "involucrado";
}

// ---- Vehículo vinculado ----
export interface VehiculoVinculado {
  vehiculoId: string;
  ruta?: string;
  conductorEnMomento?: string;
}

// ---- Registro base ----
export interface RegistroBase {
  id: string;
  tipo: TipoRegistro;
  estado: EstadoRegistro;
  terminal: string;
  fecha: string;
  responsableId: string;
  responsableNombre: string;
  observaciones: string;
  anotaciones: Anotacion[];
  historial: CambioHistorial[];
  personasVinculadas?: PersonaVinculada[];
  vehiculosVinculados?: VehiculoVinculado[];
  guia?: string;
  diasAbierto: number;
}

// ---- Stepper de investigación ----
export type EtapaInvestigacion = "identificacion" | "investigacion" | "verificacion" | "resolucion";

export interface CheckpointGuia {
  nombre: string;
  fecha?: string;
  terminal: string;
  responsable?: string;
  esAnomalía?: boolean;
}

export interface EtapaData {
  completada: boolean;
  fechaCompletado?: string;
  responsableNombre?: string;
  causaRaiz?: string;
  detalleInvestigacion?: string;
  estadoVerificacion?: "encontrada" | "no_encontrada" | "dañada" | "pendiente";
  terminalVerificacion?: string;
  fuentesVerificacion?: string[];
  observacionesAgente?: string;
  tipoResolucion?: string;
  codigoLegalizacion?: string;
  observacionesFinales?: string;
}

export interface StepperInvestigacion {
  etapaActiva: EtapaInvestigacion;
  etapas: Record<EtapaInvestigacion, EtapaData>;
  checkpoints?: CheckpointGuia[];
}

// ---- Tipos específicos ----
export interface RegistroFaltante extends RegistroBase {
  tipo: "faltante";
  guia: string;
  codigoNovedad: "100" | "300" | "400" | "403" | "529";
  tipoRiesgo: "contaminacion" | "contrabando" | "hurto" | "perdida";
  workflow: string;
  ciudad: string;
  unidadesRecuperadas: boolean;
  detalleUnidades?: string;
  clienteNoDespacha: boolean;
  stepper?: StepperInvestigacion;
}

export interface RegistroEvento extends RegistroBase {
  tipo: "evento";
  guia?: string;
  tipoEvento: string;
  ubicacion: "sede" | "ruta";
  descripcionDetallada: string;
  fuenteReporte: string;
  ciudad?: string;
}

export interface RegistroRCE extends RegistroBase {
  tipo: "rce";
  guia: string;
  valorRecaudo: number;
  formaPago: string;
  estadoRecaudo: "pagado" | "no_pagado" | "en_proceso";
  cortePago?: string;
  checkpoint?: string;
  desviaciones?: string;
  novedadesProceso?: string;
}

export interface RegistroPosventa extends RegistroBase {
  tipo: "posventa";
  guia: string;
  requerimiento: string;
  descripcion: string;
  imagenUrl?: string;
  equipoEntrega?: string;
  equipoRecogida?: string;
  ciudadOrigen: string;
  tipoOrigen: "directa" | "reexpedicion";
  ciudadDestino: string;
  tipoDestino: "directa" | "reexpedicion";
  equipoTenencia: number;
  nitCliente: string;
  nombreCliente: string;
  rolSolicitante: "remitente" | "destinatario" | "tercero";
}

export interface RegistroLesiva extends RegistroBase {
  tipo: "lesiva";
  tipoEntidad: "empleado" | "aliado" | "vehiculo" | "cliente";
  identificacion: string;
  entidadNombre: string;
  motivoBloqueo: string;
  tipoNovedadAsociada: string;
  casoAsociadoId?: string;
  fechaBloqueo: string;
}

export interface RegistroContacto extends RegistroBase {
  tipo: "contacto";
  cedula: string;
  personaNombre: string;
  tipoVinculacion: string;
  motivoSeguimiento: string;
  casosAsociados: string[];
}

export interface RegistroEvidencia extends RegistroBase {
  tipo: "evidencia";
  guia: string;
  tipoEvidencia: string;
  archivoUrl?: string;
  resultadoIA: "cumple" | "no_cumple";
  motivoNoCumplimiento?: string;
}

export type Registro =
  | RegistroFaltante
  | RegistroEvento
  | RegistroRCE
  | RegistroPosventa
  | RegistroLesiva
  | RegistroContacto
  | RegistroEvidencia;

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
export interface Notificacion {
  id: string;
  tipo: "alerta_ia" | "caso_asignado" | "caso_vencido" | "caso_cerrado" | "posventa";
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

// ---- Navegación ----
export type PaginaActiva = "inicio" | "registros" | "ia" | "configuracion";
export type DrawerTipo = "registro" | "persona360" | "vehiculo360" | "guia360" | null;

export interface DrawerState {
  tipo: DrawerTipo;
  id: string | null;
}
