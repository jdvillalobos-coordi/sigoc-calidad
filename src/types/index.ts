// ============================================================
// TIPOS PRINCIPALES — Sigo Calidad (modelo unificado de Evento)
// ============================================================

export type CategoriaEvento =
  | "dineros"
  | "unidades"
  | "listas_vinculantes"
  | "pqr"
  | "disciplinarios";

export type EstadoEvento = "abierto" | "cerrado";

export type SeveridadIA = "critica" | "alta" | "media" | "baja";

export type EstadoPersona = "sin_novedad" | "en_seguimiento" | "bloqueado";

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
  estado: EstadoPersona;
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
  // PQR:
  rolSolicitante?: "remitente" | "destinatario" | "tercero";
  nitCliente?: string;
  nombreCliente?: string;
  // Disciplinarios:
  gravedadFalta?: "leve" | "grave" | "gravisima";
  decisionGH?: string;

  // === SEGUIMIENTO ===
  anotaciones: Anotacion[];
  historial: CambioHistorial[];
  diasAbierto: number;
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

// ---- Navegación ----
export type PaginaActiva = "inicio" | "registros" | "evidencias" | "ia" | "configuracion";
export type DrawerTipo = "registro" | "persona360" | "vehiculo360" | "guia360" | "terminal360" | null;

export interface DrawerState {
  tipo: DrawerTipo;
  id: string | null;
}
