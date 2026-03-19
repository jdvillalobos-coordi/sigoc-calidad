import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "@/hooks/use-toast";

// ── Types ─────────────────────────────────────────────────────────────────────

export type EtapaId = "identificacion" | "investigacion" | "verificacion" | "resolucion";

export interface CheckpointGuia {
  nombre: string;
  fecha?: string;       // undefined = no completado
  terminal: string;
  responsable?: string;
  esAnomalía?: boolean;
}

export interface EtapaData {
  completada: boolean;
  fechaCompletado?: string;
  responsableNombre?: string;
  // investigacion
  causaRaiz?: string;
  detalleInvestigacion?: string;
  // verificacion
  estadoVerificacion?: "encontrada" | "no_encontrada" | "dañada" | "pendiente";
  terminalVerificacion?: string;
  fuentesVerificacion?: string[];
  observacionesAgente?: string;
  // resolucion
  tipoResolucion?: string;
  codigoLegalizacion?: string;
  observacionesFinales?: string;
}

export interface StepperState {
  etapaActiva: EtapaId;
  etapas: Record<EtapaId, EtapaData>;
  checkpoints?: CheckpointGuia[];
}

// ── Datos por etapa ───────────────────────────────────────────────────────────

const ETAPAS: Array<{
  id: EtapaId;
  icono: string;
  nombre: string;
  actor: string;
}> = [
  { id: "identificacion", icono: "🔔", nombre: "Identificación",       actor: "Interventor de Faltantes" },
  { id: "investigacion",  icono: "🔍", nombre: "Investigación",         actor: "Interventor de Faltantes" },
  { id: "verificacion",   icono: "👁️",  nombre: "Verificación en campo", actor: "Agente de Soporte Logístico" },
  { id: "resolucion",     icono: "✅", nombre: "Resolución",            actor: "Gestor de Calidad" },
];

const CAUSAS_RAIZ = [
  "Error de carga",
  "Etiqueta dañada",
  "Robo / Hurto",
  "Error de escaneo",
  "Otro",
];

const TIPOS_RESOLUCION = [
  "Unidad recuperada y entregada",
  "Unidad recuperada con daño — posventa iniciada",
  "Faltante total — posventa iniciada",
  "Cierre especial (código 529)",
  "Error operativo corregido",
  "Sobrante devuelto a flujo",
];

const TERMINALES = ["Bogotá", "Medellín", "Cali", "Barranquilla", "Bucaramanga", "Cartagena", "Pereira", "CDMX", "Monterrey"];

const FUENTES_VERIFICACION = [
  "Revisión física en bodega",
  "Revisión CCTV",
  "Contacto con operario",
  "Otro",
];

// ── Helper ────────────────────────────────────────────────────────────────────

function formatFecha(iso?: string) {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd MMM yyyy HH:mm", { locale: es });
  } catch {
    return iso;
  }
}

function formatFechaCorta(iso?: string) {
  if (!iso) return "";
  try {
    return format(new Date(iso), "dd MMM yyyy", { locale: es });
  } catch {
    return iso;
  }
}

// ── Timeline de checkpoints ───────────────────────────────────────────────────

function GuiaTimeline({ checkpoints }: { checkpoints: CheckpointGuia[] }) {
  return (
    <div className="mt-3 overflow-x-auto pb-2">
      <div className="flex items-start gap-0 min-w-max">
        {checkpoints.map((cp, i) => {
          const completado = !!cp.fecha;
          const esAnomalia = cp.esAnomalía;
          const esUltimo = i === checkpoints.length - 1;

          return (
            <div key={i} className="flex items-start">
              {/* Nodo */}
              <div className="flex flex-col items-center gap-1.5 w-[120px]">
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all",
                  esAnomalia
                    ? "bg-red-100 border-red-400 text-red-600"
                    : completado
                      ? "bg-green-100 border-green-400 text-green-700"
                      : "bg-muted border-border text-muted-foreground/40"
                )}>
                  {esAnomalia ? "⚠️" : completado ? "✓" : i + 1}
                </div>
                <div className="text-center">
                  <p className={cn(
                    "text-[10px] font-semibold leading-tight",
                    esAnomalia ? "text-red-600" : completado ? "text-foreground" : "text-muted-foreground/50"
                  )}>
                    {cp.nombre}
                  </p>
                  {cp.fecha ? (
                    <p className="text-[9px] text-muted-foreground mt-0.5">{cp.fecha}</p>
                  ) : (
                    <p className="text-[9px] text-red-400 mt-0.5 font-medium">SIN REGISTRO</p>
                  )}
                  <p className={cn("text-[9px] mt-0.5", completado ? "text-muted-foreground" : "text-muted-foreground/30")}>
                    {cp.terminal}
                  </p>
                  {cp.responsable && (
                    <p className={cn("text-[9px]", completado ? "text-muted-foreground" : "text-muted-foreground/30")}>
                      {cp.responsable}
                    </p>
                  )}
                </div>
              </div>
              {/* Línea conectora */}
              {!esUltimo && (
                <div className={cn(
                  "h-[2px] w-8 mt-4 flex-shrink-0",
                  checkpoints[i + 1]?.fecha && !esAnomalia ? "bg-green-300" : "bg-border"
                )} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Sub-panel Investigación ───────────────────────────────────────────────────

function PanelInvestigacion({
  data, checkpoints, onChange,
}: {
  data: EtapaData;
  checkpoints?: CheckpointGuia[];
  onChange: (d: EtapaData) => void;
}) {
  const [showTimeline, setShowTimeline] = useState(true);

  return (
    <div className="mt-4 space-y-4">
      {/* Trayectoria colapsable */}
      {checkpoints && checkpoints.length > 0 && (
        <div className="border border-border rounded-xl overflow-hidden">
          <button
            onClick={() => setShowTimeline((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors text-sm font-semibold"
          >
            <span>📦 Trayectoria de la guía</span>
            {showTimeline ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>
          {showTimeline && (
            <div className="p-4">
              <GuiaTimeline checkpoints={checkpoints} />
            </div>
          )}
        </div>
      )}

      {/* Formulario de investigación */}
      <div className="space-y-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Causa raíz identificada
          </label>
          <select
            value={data.causaRaiz ?? ""}
            onChange={(e) => onChange({ ...data, causaRaiz: e.target.value })}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Seleccionar causa raíz...</option>
            {CAUSAS_RAIZ.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground block mb-1.5">
            Detalle de la investigación
          </label>
          <textarea
            value={data.detalleInvestigacion ?? ""}
            onChange={(e) => onChange({ ...data, detalleInvestigacion: e.target.value })}
            className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            rows={3}
            placeholder="Describe los hallazgos de la investigación, recorrido de la guía, responsables identificados..."
          />
        </div>
      </div>
    </div>
  );
}

const CCTV_TIPOS = [
  "Faltantes",
  "Averías / Deterioros",
  "Activos Fijos CM",
  "Accidentes",
  "Objetos Personales",
];

// ── Sub-panel Verificación ────────────────────────────────────────────────────

function PanelVerificacion({
  data, onChange,
}: {
  data: EtapaData;
  onChange: (d: EtapaData) => void;
}) {
  const [showPanel, setShowPanel] = useState(true);
  const [showCCTV, setShowCCTV] = useState(true);


  const estadoOpts: Array<{ value: string; label: string; color: string }> = [
    { value: "encontrada",     label: "Unidad encontrada",        color: "border-green-400 bg-green-50 text-green-700" },
    { value: "no_encontrada",  label: "Unidad no encontrada",     color: "border-red-400 bg-red-50 text-red-700" },
    { value: "dañada",         label: "Unidad dañada",            color: "border-amber-400 bg-amber-50 text-amber-700" },
    { value: "pendiente",      label: "Pendiente de verificar",   color: "border-gray-300 bg-gray-50 text-gray-600" },
  ];

  function toggleFuente(f: string) {
    const current = data.fuentesVerificacion ?? [];
    const updated = current.includes(f) ? current.filter((x) => x !== f) : [...current, f];
    onChange({ ...data, fuentesVerificacion: updated });
  }

  return (
    <div className="mt-4">
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPanel((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors text-sm font-semibold"
        >
          <span>📋 Verificación física</span>
          {showPanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showPanel && (
          <div className="p-4 space-y-4">
            {/* Estado */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Estado de verificación</label>
              <div className="grid grid-cols-2 gap-2">
                {estadoOpts.map((opt) => (
                  <label
                    key={opt.value}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg border-2 cursor-pointer text-xs font-medium transition-all",
                      data.estadoVerificacion === opt.value ? opt.color : "border-border bg-background text-foreground hover:bg-muted"
                    )}
                  >
                    <input
                      type="radio"
                      name="estadoVerificacion"
                      value={opt.value}
                      checked={data.estadoVerificacion === opt.value}
                      onChange={() => onChange({ ...data, estadoVerificacion: opt.value as any })}
                      className="sr-only"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
            </div>

            {/* Terminal */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Terminal donde se verificó</label>
              <select
                value={data.terminalVerificacion ?? ""}
                onChange={(e) => onChange({ ...data, terminalVerificacion: e.target.value })}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar terminal...</option>
                {TERMINALES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* Evidencia fotográfica */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Evidencia fotográfica</label>
              <div className="border-2 border-dashed border-border rounded-xl p-6 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group">
                <div className="text-3xl mb-2">📸</div>
                <p className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                  Arrastra fotos aquí o haz click para cargar
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">PNG, JPG hasta 10 MB</p>
              </div>
            </div>

            {/* Fuentes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-2">Fuente de verificación</label>
              <div className="space-y-2">
                {FUENTES_VERIFICACION.map((f) => (
                  <label key={f} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={(data.fuentesVerificacion ?? []).includes(f)}
                      onChange={() => toggleFuente(f)}
                      className="rounded border-border"
                    />
                    <span className="text-sm text-foreground">{f}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Observaciones del agente</label>
              <textarea
                value={data.observacionesAgente ?? ""}
                onChange={(e) => onChange({ ...data, observacionesAgente: e.target.value })}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
                placeholder="Describe lo encontrado en la terminal, cámaras revisadas, conversaciones con operarios..."
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Sub-panel Resolución ──────────────────────────────────────────────────────

function PanelResolucion({
  data, onChange, onCerrarCaso, onCrearPosventa,
}: {
  data: EtapaData;
  onChange: (d: EtapaData) => void;
  onCerrarCaso: () => void;
  onCrearPosventa: () => void;
}) {
  const [showPanel, setShowPanel] = useState(true);

  const involucraPosventa = data.tipoResolucion?.includes("posventa") || data.tipoResolucion?.includes("Faltante total");

  return (
    <div className="mt-4">
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setShowPanel((s) => !s)}
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors text-sm font-semibold"
        >
          <span>🏁 Resolución del caso</span>
          {showPanel ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showPanel && (
          <div className="p-4 space-y-4">
            {/* Tipo de resolución */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Tipo de resolución *</label>
              <select
                value={data.tipoResolucion ?? ""}
                onChange={(e) => onChange({ ...data, tipoResolucion: e.target.value })}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar tipo de resolución...</option>
                {TIPOS_RESOLUCION.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>

            {/* CTA posventa */}
            {involucraPosventa && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-amber-800">Esta resolución requiere una solicitud de posventa</p>
                  <p className="text-xs text-amber-700 mt-0.5">Se pre-llenará con los datos de esta guía</p>
                </div>
                <button
                  onClick={onCrearPosventa}
                  className="flex-shrink-0 text-xs font-medium px-3 py-1.5 bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
                >
                  Crear solicitud posventa →
                </button>
              </div>
            )}

            {/* Código legalización */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Código de legalización SIGO</label>
              <input
                type="text"
                value={data.codigoLegalizacion ?? ""}
                onChange={(e) => onChange({ ...data, codigoLegalizacion: e.target.value })}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                placeholder="Ej: 529"
              />
            </div>

            {/* Evidencia cierre */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Evidencia de cierre</label>
              <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer">
                <p className="text-xs text-muted-foreground">📎 Adjuntar documentos o fotos del cierre</p>
              </div>
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Observaciones finales</label>
              <textarea
                value={data.observacionesFinales ?? ""}
                onChange={(e) => onChange({ ...data, observacionesFinales: e.target.value })}
                className="w-full text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
                placeholder="Notas finales sobre la resolución, referencias a documentos externos, código de denuncia..."
              />
            </div>

            {/* Botón cerrar */}
            <button
              onClick={onCerrarCaso}
              className="w-full py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              <Check className="w-4 h-4" />
              Cerrar caso
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Stepper Principal ─────────────────────────────────────────────────────────

export function InvestigacionStepper({
  stepperState,
  onStepperChange,
  onCerrarCaso,
  onCrearPosventa,
}: {
  stepperState: StepperState;
  onStepperChange: (s: StepperState) => void;
  onCerrarCaso: () => void;
  onCrearPosventa: () => void;
}) {
  const { etapaActiva, etapas, checkpoints } = stepperState;

  const etapaIndex = ETAPAS.findIndex((e) => e.id === etapaActiva);

  function activarEtapa(id: EtapaId) {
    onStepperChange({ ...stepperState, etapaActiva: id });
  }

  function updateEtapaData(id: EtapaId, data: EtapaData) {
    onStepperChange({
      ...stepperState,
      etapas: { ...etapas, [id]: data },
    });
  }

  function avanzarEtapa(id: EtapaId) {
    const idx = ETAPAS.findIndex((e) => e.id === id);
    const nextId = ETAPAS[idx + 1]?.id;
    const now = new Date().toISOString();
    onStepperChange({
      ...stepperState,
      etapaActiva: nextId ?? id,
      etapas: {
        ...etapas,
        [id]: {
          ...etapas[id],
          completada: true,
          fechaCompletado: etapas[id].fechaCompletado ?? now,
        },
      },
    });
    toast({ title: `✅ Etapa "${ETAPAS[idx].nombre}" completada` });
  }

  return (
    <div className="space-y-1">
      {/* Stepper header */}
      <div className="relative flex items-start gap-0">
        {ETAPAS.map((etapa, i) => {
          const data = etapas[etapa.id];
          const isActiva = etapa.id === etapaActiva;
          const isCompletada = data.completada;
          const isPendiente = !isActiva && !isCompletada;
          const isUltimo = i === ETAPAS.length - 1;

          return (
            <React.Fragment key={etapa.id}>
              <button
                onClick={() => activarEtapa(etapa.id)}
                className="flex flex-col items-center gap-1.5 flex-1 group"
              >
                {/* Círculo */}
                <div className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-base border-2 transition-all",
                  isCompletada
                    ? "bg-green-100 border-green-500 text-green-700"
                    : isActiva
                      ? "bg-primary/10 border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.12)] animate-pulse-soft"
                      : "bg-muted border-border text-muted-foreground/50"
                )}>
                  {isCompletada ? <Check className="w-5 h-5 text-green-600" /> : etapa.icono}
                </div>
                {/* Texto */}
                <div className="text-center">
                  <p className={cn(
                    "text-[11px] font-semibold leading-tight",
                    isActiva ? "text-primary" : isCompletada ? "text-green-700" : "text-muted-foreground/50"
                  )}>
                    {etapa.nombre}
                  </p>
                  <p className={cn(
                    "text-[9px] mt-0.5 leading-tight",
                    isActiva ? "text-muted-foreground" : isCompletada ? "text-muted-foreground" : "text-muted-foreground/30"
                  )}>
                    {etapa.actor.split(" ").slice(0, 2).join(" ")}
                  </p>
                  {isCompletada && data.fechaCompletado && (
                    <p className="text-[9px] text-green-600 mt-0.5">{formatFechaCorta(data.fechaCompletado)}</p>
                  )}
                </div>
              </button>
              {/* Línea */}
              {!isUltimo && (
                <div className={cn(
                  "h-[2px] flex-1 mt-5",
                  ETAPAS[i + 1] && (etapas[ETAPAS[i + 1].id].completada || etapa.id === etapaActiva)
                    ? "bg-primary/30"
                    : "bg-border"
                )} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Panel activo */}
      <div className="mt-4 border border-border rounded-xl p-4 bg-muted/10">
        {/* Cabecera del panel */}
        {(() => {
          const etapa = ETAPAS.find((e) => e.id === etapaActiva)!;
          const data = etapas[etapaActiva];
          return (
            <>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-base">{etapa.icono}</span>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{etapa.nombre}</p>
                    <p className="text-xs text-muted-foreground">{etapa.actor}</p>
                  </div>
                </div>
                {/* Botón avanzar (solo si no es resolución y no está completada) */}
                {etapaActiva !== "resolucion" && !data.completada && (
                  <button
                    onClick={() => avanzarEtapa(etapaActiva)}
                    className="text-xs px-3 py-1.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors font-medium"
                  >
                    Marcar completado →
                  </button>
                )}
                {data.completada && (
                  <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                    <Check className="w-3 h-3" />
                    Completado {data.fechaCompletado ? formatFechaCorta(data.fechaCompletado) : ""}
                  </span>
                )}
              </div>
              {data.responsableNombre && (
                <p className="text-xs text-muted-foreground">Por: {data.responsableNombre}</p>
              )}

              {/* Sub-paneles por etapa */}
              {etapaActiva === "investigacion" && (
                <PanelInvestigacion
                  data={data}
                  checkpoints={checkpoints}
                  onChange={(d) => updateEtapaData("investigacion", d)}
                />
              )}
              {etapaActiva === "verificacion" && (
                <PanelVerificacion
                  data={data}
                  onChange={(d) => updateEtapaData("verificacion", d)}
                />
              )}
              {etapaActiva === "resolucion" && (
                <PanelResolucion
                  data={data}
                  onChange={(d) => updateEtapaData("resolucion", d)}
                  onCerrarCaso={onCerrarCaso}
                  onCrearPosventa={onCrearPosventa}
                />
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
