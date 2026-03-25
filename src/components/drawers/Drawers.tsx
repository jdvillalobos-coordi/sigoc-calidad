import React, { useState } from "react";
import { eventos, personas, vehiculos, guias, getPersona, getVehiculo, getEventosPorGuia, getEventosRelacionados, estudiosSeguridad, alertasIA, PAISES_REGIONALES, solicitudesCCTV, CATEGORIAS_LESIVAS, getActividadesLesivasPorPersona, getActividadesLesivasPorVehiculo, usuarioLogueado } from "@/data/mockData";
import { CategoriaBadge, EstadoBadge, SeveridadBadge, AvatarInicial, formatDate, formatDateTime, formatCurrency, descripcionCorta, categoriaConfig, estadoConfig, EstadoPersonaBadge } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import { X, ChevronDown, ChevronRight, AlertTriangle, Check, UserCheck, RotateCcw, Lock, Scale, Video, Upload, Trash2, Image as ImageIcon, FileVideo } from "lucide-react";
import type { Evento, EstadoEvento, EstadoFlujo, ResolucionFinal, AlertaIA, SolicitudCCTV } from "@/types";
import { toast } from "@/hooks/use-toast";

// ---- Flujo de trabajo (simplificado: Abierto → Escalado? → Cerrado) ----
const FLUJO_STEPS: { key: EstadoFlujo; label: string; icon: string }[] = [
  { key: "abierto",  label: "Abierto",  icon: "🔍" },
  { key: "escalado", label: "Escalado", icon: "⬆️" },
  { key: "cerrado",  label: "Cerrado",  icon: "🔒" },
];

const FLUJO_INDEX: Record<EstadoFlujo, number> = { abierto: 0, escalado: 1, cerrado: 2 };

function FlujoStepper({ current, wasEscalated }: { current: EstadoFlujo; wasEscalated: boolean }) {
  const idx = FLUJO_INDEX[current];
  const escaladoSkipped = !wasEscalated && current !== "escalado" && idx > 1;

  return (
    <div className="flex items-center gap-0 w-full h-[36px]">
      {FLUJO_STEPS.map((step, i) => {
        const isEscalado = step.key === "escalado";
        const isSkipped = isEscalado && escaladoSkipped;
        const isActive = i === idx;
        const isPast = i < idx;

        return (
          <React.Fragment key={step.key}>
            {i > 0 && (
              <div className={`flex-shrink-0 w-8 h-0.5 transition-colors ${
                isSkipped ? "bg-border border-t border-dashed border-muted-foreground/30 h-0"
                : (isPast || isActive) ? "bg-primary" : "bg-border"
              }`} />
            )}
            <div className={`flex items-center gap-1 px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all ${
              isSkipped
                ? "bg-muted/30 text-muted-foreground/40 line-through"
                : isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : isPast
                    ? "bg-primary/10 text-primary"
                    : "bg-muted/50 text-muted-foreground"
            }`}>
              <span className="text-xs leading-none">{isSkipped ? "—" : isPast ? "✓" : step.icon}</span>
              <span>{step.label}</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
}

const RESOLUCION_OPTIONS: { value: ResolucionFinal; label: string }[] = [
  { value: "sin_hallazgos",            label: "Sin hallazgos" },
  { value: "llamado_atencion_verbal",  label: "Llamado de atención verbal" },
  { value: "llamado_atencion_escrito", label: "Llamado de atención escrito" },
  { value: "suspension_temporal",      label: "Suspensión temporal" },
  { value: "proceso_disciplinario",    label: "Proceso disciplinario" },
  { value: "desvinculacion",           label: "Desvinculación" },
  { value: "escalamiento_seguridad",   label: "Escalamiento a seguridad" },
  { value: "caso_insuficiente",        label: "Caso insuficiente" },
];

const RESOLUCION_LABELS: Record<string, string> = Object.fromEntries(RESOLUCION_OPTIONS.map(o => [o.value, o.label]));

const PERSONAS_ESCALAMIENTO = [
  { id: "u-jefe-seg", nombre: "Carlos Mendoza", cargo: "Jefe de Seguridad" },
  { id: "u-dir-calidad", nombre: "María Elena Rojas", cargo: "Directora de Calidad" },
  { id: "u-coord-dineros", nombre: "Jorge Castaño", cargo: "Coordinador Nacional Dineros" },
  { id: "u-coord-unidades", nombre: "Sandra Herrera", cargo: "Coordinadora Nacional Calidad" },
  { id: "u-gerente-ops", nombre: "Andrés Gutiérrez", cargo: "Gerente de Operaciones" },
];

// ---- RecordDetail Drawer ----
export function RecordDetailDrawer() {
  const { drawer, cerrarDrawer, abrirPersona, abrirVehiculo, abrirGuia, abrirRegistro, abrirTerminal, setNuevaRegistroAbierto, agregarNotificacion } = useApp();
  const [localEventos, setLocalEventos] = useState(eventos);
  const [nuevaAnotacion, setNuevaAnotacion] = useState("");
  const [tipoAnotacion, setTipoAnotacion] = useState("hallazgo");
  const [complementando, setComplementando] = useState(false);
  const [complementoTexto, setComplementoTexto] = useState("");
  const [resolviendoAbierto, setResolviendoAbierto] = useState(false);
  const [resolucionSeleccionada, setResolucionSeleccionada] = useState<ResolucionFinal | "">("");
  const [observacionResolucion, setObservacionResolucion] = useState("");
  const [escalandoAbierto, setEscalandoAbierto] = useState(false);
  const [escaladoPersonaId, setEscaladoPersonaId] = useState("");
  const [escaladoMotivo, setEscaladoMotivo] = useState("");
  const [localCCTV, setLocalCCTV] = useState<SolicitudCCTV[]>(solicitudesCCTV);
  const [cctvFormAbierto, setCctvFormAbierto] = useState(false);
  const [cctvDescripcion, setCctvDescripcion] = useState("");
  const [cctvArchivos, setCctvArchivos] = useState<File[]>([]);

  if (drawer.tipo !== "registro" || !drawer.id) return null;

  const ev = localEventos.find((e) => e.id === drawer.id);
  if (!ev) return null;

  const relacionados = getEventosRelacionados(ev.id);
  const wasEscalated = !!(ev.escaladoA || ev.fechaEscalamiento);

  function avanzarFlujo(nuevoFlujo: EstadoFlujo, extras: Partial<Evento> = {}) {
    const prevLabel = FLUJO_STEPS.find(s => s.key === ev!.estadoFlujo)?.label ?? ev!.estadoFlujo;
    const newLabel = FLUJO_STEPS.find(s => s.key === nuevoFlujo)?.label ?? nuevoFlujo;
    const nuevoEstado: EstadoEvento = nuevoFlujo === "cerrado" ? "cerrado" : "abierto";
    setLocalEventos((lst) =>
      lst.map((e) => e.id === ev!.id ? {
        ...e,
        ...extras,
        estado: nuevoEstado,
        estadoFlujo: nuevoFlujo,
        historial: [...e.historial, { id: `h${Date.now()}`, fecha: new Date().toISOString(), usuarioNombre: "Sandra Herrera", accion: `Cambió flujo de '${prevLabel}' a '${newLabel}'` }]
      } : e)
    );
    toast({ title: `Estado actualizado a "${newLabel}"` });
  }

  function confirmarResolucion() {
    if (!resolucionSeleccionada) return;
    avanzarFlujo("cerrado", {
      resolucionFinal: resolucionSeleccionada as ResolucionFinal,
      observacionResolucion: observacionResolucion || undefined,
      fechaResolucion: new Date().toISOString(),
      resueltoPor: { id: "u-coord-unidades", nombre: "Sandra Herrera" },
    });
    setResolviendoAbierto(false);
    setResolucionSeleccionada("");
    setObservacionResolucion("");
  }

  function confirmarEscalamiento() {
    const persona = PERSONAS_ESCALAMIENTO.find(p => p.id === escaladoPersonaId);
    if (!persona || !escaladoMotivo.trim()) return;
    avanzarFlujo("escalado", {
      escaladoA: persona,
      escaladoPor: { id: "u-coord-unidades", nombre: "Sandra Herrera", cargo: "Coordinadora Nacional Calidad" },
      fechaEscalamiento: new Date().toISOString(),
      motivoEscalamiento: escaladoMotivo,
    });
    agregarNotificacion(
      "caso_escalado",
      `⬆️ Sandra Herrera te escaló el evento ${ev!.id} — Motivo: ${escaladoMotivo}`,
      ev!.id,
    );
    setEscalandoAbierto(false);
    setEscaladoPersonaId("");
    setEscaladoMotivo("");
  }

  function devolverAlCreador() {
    avanzarFlujo("abierto", {
      escaladoA: undefined,
      escaladoPor: undefined,
      fechaEscalamiento: undefined,
      motivoEscalamiento: undefined,
    });
    toast({ title: "Evento devuelto al investigador original" });
  }

  function reabrirEvento() {
    avanzarFlujo("abierto", {
      resolucionFinal: undefined,
      observacionResolucion: undefined,
      fechaResolucion: undefined,
      resueltoPor: undefined,
    });
  }

  function agregarAnotacion() {
    if (!nuevaAnotacion.trim()) return;
    setLocalEventos((lst) =>
      lst.map((e) => e.id === ev!.id ? {
        ...e,
        anotaciones: [...e.anotaciones, { id: `a${Date.now()}`, autorId: "u-sandra", autorNombre: "Sandra Herrera", autorRol: "Coordinadora Nacional de Calidad", fecha: new Date().toISOString(), texto: nuevaAnotacion, tipo: tipoAnotacion as any }]
      } : e)
    );
    setNuevaAnotacion("");
    toast({ title: "✅ Anotación agregada" });
  }

  const soportesCCTV = localCCTV.filter(s => s.eventoId === ev.id);

  function handleCctvFiles(fileList: FileList | null) {
    if (!fileList) return;
    const nuevos = Array.from(fileList).filter(f => f.type.startsWith("image/") || f.type.startsWith("video/"));
    setCctvArchivos(prev => [...prev, ...nuevos]);
  }

  function registrarSoporteCCTV() {
    if (!cctvDescripcion.trim()) return;
    const archivosNombres = cctvArchivos.map(f => f.name);
    const urls = archivosNombres.length > 0 ? archivosNombres.map(n => `https://storage.coordinadora.com/cctv/${n}`) : undefined;
    const nuevo: SolicitudCCTV = {
      id: `CCTV-${Date.now()}`,
      eventoId: ev!.id,
      terminalSolicitante: ev!.terminal,
      terminalInvestigar: ev!.terminal,
      tipoNovedad: ev!.tipoEvento,
      descripcionSolicitud: cctvDescripcion,
      fechaSolicitud: new Date().toISOString(),
      solicitadoPor: { id: "u-sandra", nombre: "Sandra Herrera" },
      asignadoA: { id: "u-sandra", nombre: "Sandra Herrera", cargo: "Coordinadora Nacional Calidad" },
      estado: "completada",
      conclusionCCTV: cctvDescripcion,
      evidenciasUrls: urls,
      fechaCierre: new Date().toISOString(),
      investigadoPor: { id: "u-sandra", nombre: "Sandra Herrera" },
    };
    setLocalCCTV(prev => [...prev, nuevo]);
    const numArchivos = cctvArchivos.length;
    setLocalEventos(lst =>
      lst.map(e => e.id === ev!.id ? {
        ...e,
        anotaciones: [...e.anotaciones, {
          id: `a${Date.now()}`,
          autorId: "u-sandra",
          autorNombre: "Sandra Herrera",
          autorRol: "Coordinadora Nacional de Calidad",
          fecha: new Date().toISOString(),
          texto: `Soporte CCTV registrado: ${cctvDescripcion}${numArchivos > 0 ? ` — ${numArchivos} archivo(s) adjunto(s)` : ""}`,
          tipo: "hallazgo" as any,
        }],
        historial: [...e.historial, { id: `h${Date.now()}`, fecha: new Date().toISOString(), usuarioNombre: "Sandra Herrera", accion: "Soporte CCTV registrado" }],
      } : e)
    );
    setCctvFormAbierto(false);
    setCctvDescripcion("");
    setCctvArchivos([]);
    toast({ title: "Soporte CCTV registrado en el evento" });
  }

  function guardarComplemento() {
    if (!complementoTexto.trim()) return;
    setLocalEventos((lst) =>
      lst.map((e) => e.id === ev!.id ? {
        ...e,
        anotaciones: [...e.anotaciones, { id: `a${Date.now()}`, autorId: "u-sandra", autorNombre: "Sandra Herrera", autorRol: "Coordinadora Nacional de Calidad", fecha: new Date().toISOString(), texto: complementoTexto, tipo: "hallazgo" as any }]
      } : e)
    );
    setComplementoTexto("");
    setComplementando(false);
    toast({ title: "✅ Hallazgo agregado a la investigación" });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[60%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex-shrink-0 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <CategoriaBadge categoria={ev.categoria} />
                <span className="font-mono text-sm font-bold">{ev.id}</span>
                {ev.estado !== "cerrado" && ev.diasAbierto > 30 && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-destructive bg-destructive/10 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-3 h-3" /> Vencido
                  </span>
                )}
                {ev.estadoFlujo === "cerrado" && ev.resolucionFinal && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-semibold bg-green-100 text-green-800 px-2 py-0.5 rounded-full border border-green-200">
                    <Lock className="w-3 h-3" /> {RESOLUCION_LABELS[ev.resolucionFinal] ?? ev.resolucionFinal}
                  </span>
                )}
              </div>
              <p className="font-semibold text-base">{ev.tipoEvento}</p>
            </div>
            <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors flex-shrink-0">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Stepper del flujo */}
          <FlujoStepper current={ev.estadoFlujo} wasEscalated={wasEscalated} />

          {/* Bloque de asignación */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium">
              <UserCheck className="w-3 h-3" />
              {ev.asignadoA.nombre} · {ev.asignadoA.cargo}
            </span>
            {ev.estadoFlujo === "escalado" && ev.escaladoA && (
              <>
                <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-purple-50 text-purple-800 border border-purple-200 font-medium">
                  <AlertTriangle className="w-3 h-3" />
                  Escalado a: {ev.escaladoA.nombre} · Motivo: {ev.motivoEscalamiento ?? "—"}
                </span>
                <button
                  onClick={devolverAlCreador}
                  className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors font-medium"
                >
                  <RotateCcw className="w-3 h-3" /> Devolver al creador
                </button>
              </>
            )}
          </div>

          {/* Acciones contextuales */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {ev.estadoFlujo === "abierto" && (
              <>
                <button onClick={() => setEscalandoAbierto(!escalandoAbierto)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700 hover:bg-amber-50 text-xs font-medium transition-colors">
                  <AlertTriangle className="w-3.5 h-3.5" /> Escalar
                </button>
                <button onClick={() => setResolviendoAbierto(!resolviendoAbierto)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors shadow-sm">
                  <Check className="w-3.5 h-3.5" /> Resolver y cerrar
                </button>
              </>
            )}
            {ev.estadoFlujo === "escalado" && (
              <button onClick={() => { setComplementando(true); }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-foreground hover:bg-muted text-xs font-medium transition-colors">
                + Agregar hallazgo
              </button>
            )}
            {ev.estadoFlujo === "cerrado" && (
              <button onClick={reabrirEvento}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground text-xs font-medium transition-colors">
                <RotateCcw className="w-3.5 h-3.5" /> Reabrir
              </button>
            )}
          </div>

          {/* Mini-form de escalamiento */}
          {escalandoAbierto && ev.estadoFlujo === "abierto" && (
            <div className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-amber-800">Escalar evento</div>
              <select
                value={escaladoPersonaId}
                onChange={(e) => setEscaladoPersonaId(e.target.value)}
                className="w-full text-xs border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Seleccionar persona...</option>
                {PERSONAS_ESCALAMIENTO.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} — {p.cargo}</option>
                ))}
              </select>
              <textarea
                value={escaladoMotivo}
                onChange={(e) => setEscaladoMotivo(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                placeholder="Motivo del escalamiento..."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={confirmarEscalamiento}
                  disabled={!escaladoPersonaId || !escaladoMotivo.trim()}
                  className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-xs font-medium hover:bg-amber-700 disabled:opacity-40 transition-colors"
                >
                  Escalar evento
                </button>
                <button
                  onClick={() => { setEscalandoAbierto(false); setEscaladoPersonaId(""); setEscaladoMotivo(""); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Panel de resolución */}
          {resolviendoAbierto && ev.estadoFlujo === "abierto" && (
            <div className="border border-green-200 bg-green-50/50 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-green-800">Resolver evento</div>
              <div className="grid grid-cols-2 gap-1.5">
                {RESOLUCION_OPTIONS.map(opt => (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs transition-colors ${
                      resolucionSeleccionada === opt.value
                        ? "border-green-500 bg-green-100 text-green-900 font-medium"
                        : "border-border bg-background text-foreground hover:bg-muted"
                    }`}
                  >
                    <input
                      type="radio"
                      name="resolucion"
                      value={opt.value}
                      checked={resolucionSeleccionada === opt.value}
                      onChange={() => setResolucionSeleccionada(opt.value)}
                      className="accent-green-600 w-3 h-3"
                    />
                    {opt.label}
                  </label>
                ))}
              </div>
              <textarea
                value={observacionResolucion}
                onChange={(e) => setObservacionResolucion(e.target.value)}
                className="w-full text-xs bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                placeholder="Observaciones de la resolución (opcional)..."
              />
              <div className="flex items-center gap-2">
                <button
                  onClick={confirmarResolucion}
                  disabled={!resolucionSeleccionada}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-40 transition-colors"
                >
                  Confirmar resolución
                </button>
                <button
                  onClick={() => { setResolviendoAbierto(false); setResolucionSeleccionada(""); setObservacionResolucion(""); }}
                  className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* Eventos asociados */}
          {ev.eventosAsociados && ev.eventosAsociados.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">🔗 Eventos asociados</h3>
              <div className="flex flex-wrap gap-2">
                {ev.eventosAsociados.map((id) => (
                  <button key={id} onClick={() => abrirRegistro(id)} className="text-xs font-mono px-2.5 py-1 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                    {id}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Escalamiento — visible while active or as history */}
          {ev.escaladoA && (
            <section className={`border rounded-xl p-4 ${
              ev.estadoFlujo === "escalado" ? "bg-amber-50 border-amber-200" : "bg-muted/30 border-border"
            }`}>
              <h3 className={`text-sm font-semibold mb-2 flex items-center gap-1.5 ${
                ev.estadoFlujo === "escalado" ? "text-amber-800" : "text-muted-foreground"
              }`}>
                <AlertTriangle className="w-4 h-4" />
                {ev.estadoFlujo === "escalado" ? "Evento escalado" : "Fue escalado"}
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-muted-foreground mb-0.5">Escalado a</div>
                  <div className="font-medium">{ev.escaladoA.nombre} · {ev.escaladoA.cargo}</div>
                </div>
                {ev.escaladoPor && (
                  <div>
                    <div className="text-muted-foreground mb-0.5">Escalado por</div>
                    <div className="font-medium">{ev.escaladoPor.nombre}</div>
                  </div>
                )}
                {ev.fechaEscalamiento && (
                  <div>
                    <div className="text-muted-foreground mb-0.5">Fecha</div>
                    <div className="font-medium">{formatDate(ev.fechaEscalamiento)}</div>
                  </div>
                )}
                {ev.motivoEscalamiento && (
                  <div className="col-span-2">
                    <div className="text-muted-foreground mb-0.5">Motivo</div>
                    <div className="font-medium">{ev.motivoEscalamiento}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Resolución */}
          {ev.estadoFlujo === "cerrado" && ev.resolucionFinal && (
            <section className="bg-green-50 border border-green-200 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-green-800 mb-2 flex items-center gap-1.5">
                <Check className="w-4 h-4" /> Resolución del evento
              </h3>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="text-green-700/70 mb-0.5">Resolución</div>
                  <div className="font-medium text-green-900">{RESOLUCION_LABELS[ev.resolucionFinal] ?? ev.resolucionFinal}</div>
                </div>
                {ev.resueltoPor && (
                  <div>
                    <div className="text-green-700/70 mb-0.5">Resuelto por</div>
                    <div className="font-medium text-green-900">{ev.resueltoPor.nombre}</div>
                  </div>
                )}
                {ev.fechaResolucion && (
                  <div>
                    <div className="text-green-700/70 mb-0.5">Fecha resolución</div>
                    <div className="font-medium text-green-900">{formatDate(ev.fechaResolucion)}</div>
                  </div>
                )}
                {ev.observacionResolucion && (
                  <div className="col-span-2">
                    <div className="text-green-700/70 mb-0.5">Observaciones</div>
                    <div className="font-medium text-green-900">{ev.observacionResolucion}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Info principal */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Información del evento</h3>
            <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-xl p-4">
              {[
                ["Categoría", categoriaConfig[ev.categoria].label],
                ["Tipo de evento", ev.tipoEvento],
                ["Tipo entidad", ev.tipoEntidad],
                ["Terminal", ev.terminal],
                ["Ciudad", ev.ciudad],
                ...(ev.regional ? [["Regional", ev.regional]] : []),
                ["Fecha", formatDate(ev.fecha)],
                ...(ev.hora ? [["Hora", ev.hora]] : []),
                ["Días abierto", `${ev.diasAbierto} días`],
                ...(ev.fuenteExterna ? [["Fuente", ev.fuenteExterna]] : []),
                ...(ev.valorAfectacion ? [["Valor afectación", formatCurrency(ev.valorAfectacion)]] : []),
                ...(ev.codigoNovedad ? [["Código novedad", ev.codigoNovedad]] : []),
                ...(ev.gravedadFalta ? [["Gravedad falta", ev.gravedadFalta]] : []),
                ...(ev.decisionGH ? [["Decisión GH", ev.decisionGH]] : []),
                ...(ev.rolSolicitante ? [["Rol solicitante", ev.rolSolicitante]] : []),
                ...(ev.nitCliente ? [["NIT cliente", ev.nitCliente]] : []),
                ...(ev.nombreCliente ? [["Nombre cliente", ev.nombreCliente]] : []),
                ...(ev.terminalDestino ? [["Terminal destino", ev.terminalDestino]] : []),
                ...(ev.ciudadDestino ? [["Ciudad destino", ev.ciudadDestino]] : []),
                ...(ev.tipoPoblacionOrigen ? [["Tipo pob. origen", ev.tipoPoblacionOrigen === "directa_domestica" ? "Directa/Doméstica" : "Reexpedición"]] : []),
                ...(ev.tipoPoblacionDestino ? [["Tipo pob. destino", ev.tipoPoblacionDestino === "directa_domestica" ? "Directa/Doméstica" : "Reexpedición"]] : []),
                ...(ev.equipoRecogida ? [["Equipo recogida", ev.equipoRecogida]] : []),
                ...(ev.equipoEntrega ? [["Equipo entrega", ev.equipoEntrega]] : []),
                ...(ev.equipoTenencia != null ? [["Equipo tenencia", `${ev.equipoTenencia} unidad(es)`]] : []),
                ...(ev.resultadoIA ? [["Resultado IA", ev.resultadoIA]] : []),
                ...(ev.veredictoOperador ? [["Veredicto operador", ev.veredictoOperador]] : []),
                ...(ev.direccion ? [["Dirección", ev.direccion]] : []),
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-xs text-muted-foreground mb-0.5">{l}</div>
                  {l === "Terminal" ? (
                    <button onClick={() => abrirTerminal(v!)} className="text-sm font-medium text-coordinadora-blue hover:underline">{v}</button>
                  ) : l === "Días abierto" ? (
                    <div className="text-sm font-medium flex items-center gap-1">
                      {ev.estado !== "cerrado" && ev.diasAbierto > 30 ? "🔴 " : ev.estado !== "cerrado" && ev.diasAbierto > 3 ? "⏰ " : ""}{v}
                    </div>
                  ) : (
                    <div className="text-sm font-medium">{v}</div>
                  )}
                </div>
              ))}
            </div>

            {/* Descripción de hechos */}
            <div className="mt-3 bg-muted/40 rounded-xl p-4">
              <div className="text-xs text-muted-foreground mb-1">Descripción de los hechos</div>
              <p className="text-sm leading-relaxed">{ev.descripcionHechos}</p>
            </div>

            {/* Justificación operador */}
            {ev.justificacionOperador && (
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Justificación operador</div>
                <p className="text-sm">{ev.justificacionOperador}</p>
              </div>
            )}
          </section>

          {/* Guías */}
          {ev.guias && ev.guias.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-2">Guías asociadas ({ev.guias.length})</h3>
              <div className="flex flex-wrap gap-2">
                {ev.guias.map((g) => (
                  <button key={g} onClick={() => abrirGuia(g)} className="text-sm font-mono px-3 py-1.5 rounded-lg border border-border hover:bg-muted transition-colors text-coordinadora-blue">
                    📦 {g}
                  </button>
                ))}
              </div>
            </section>
          )}

          {/* Personas responsables */}
          {ev.personasResponsables.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3">Personas responsables ({ev.personasResponsables.length})</h3>
              <div className="space-y-2">
                {ev.personasResponsables.map((pv) => {
                  const p = getPersona(pv.personaId);
                  if (!p) return null;
                  return (
                    <button
                      key={pv.personaId}
                      onClick={() => abrirPersona(p.id)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors"
                    >
                      <AvatarInicial nombre={p.nombre} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{p.nombre}</div>
                        <div className="text-xs text-muted-foreground">ID {p.cedula} · {p.cargo}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">Responsable</span>
                      <EstadoPersonaBadge estado={p.estado} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Personas participantes */}
          {ev.personasParticipantes.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3">Personas participantes ({ev.personasParticipantes.length})</h3>
              <div className="space-y-2">
                {ev.personasParticipantes.map((pv) => {
                  const p = getPersona(pv.personaId);
                  if (!p) return null;
                  return (
                    <button
                      key={pv.personaId}
                      onClick={() => abrirPersona(p.id)}
                      className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors"
                    >
                      <AvatarInicial nombre={p.nombre} size="md" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">{p.nombre}</div>
                        <div className="text-xs text-muted-foreground">ID {p.cedula} · {p.cargo}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">Participante</span>
                      <EstadoPersonaBadge estado={p.estado} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Vehículos vinculados */}
          {ev.vehiculosVinculados && ev.vehiculosVinculados.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3">Vehículos vinculados</h3>
              <div className="space-y-2">
                {ev.vehiculosVinculados.map((vv) => {
                  const v = getVehiculo(vv.vehiculoId);
                  if (!v) return null;
                  return (
                    <button key={vv.vehiculoId} onClick={() => abrirVehiculo(v.id)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors">
                      <div className="text-2xl">🚛</div>
                      <div className="flex-1">
                        <div className="font-medium text-sm font-mono">{v.placa}</div>
                        <div className="text-xs text-muted-foreground">{v.tipo}{vv.ruta ? ` · ${vv.ruta}` : ""}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Complementar investigación */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Complementar investigación</h3>
              {!complementando && (
                <button onClick={() => setComplementando(true)} className="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
                  + Complementar investigación
                </button>
              )}
            </div>
            {complementando && (
              <div className="border border-primary/30 rounded-xl p-4 bg-primary/5 space-y-3">
                <textarea
                  value={complementoTexto}
                  onChange={(e) => setComplementoTexto(e.target.value)}
                  className="w-full text-sm bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={3}
                  placeholder="Describe los nuevos hechos o hallazgos encontrados en la investigación..."
                />
                <div className="flex gap-2">
                  <button onClick={guardarComplemento} disabled={!complementoTexto.trim()} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                    Guardar hallazgo
                  </button>
                  <button onClick={() => { setComplementando(false); setComplementoTexto(""); }} className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* Timeline seguimiento */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Timeline de seguimiento ({ev.anotaciones.length})</h3>
            {ev.anotaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin anotaciones aún.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {[...ev.anotaciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((a) => {
                  const tipoIcono: Record<string, string> = {
                    hallazgo: "🔍",
                    seguimiento: "📝",
                    resolucion: "✅",
                    nota_interna: "📝",
                  };
                  const tipoLabel: Record<string, string> = {
                    hallazgo: "Hallazgo",
                    seguimiento: "Seguimiento",
                    resolucion: "Resolución",
                    nota_interna: "Nota interna",
                  };
                  const tipoColor: Record<string, string> = {
                    hallazgo: "bg-amber-100 text-amber-700",
                    seguimiento: "bg-blue-100 text-blue-700",
                    resolucion: "bg-green-100 text-green-700",
                    nota_interna: "bg-gray-100 text-gray-600",
                  };
                  return (
                    <div key={a.id} className="flex gap-3">
                      <AvatarInicial nombre={a.autorNombre} size="sm" />
                      <div className="flex-1 bg-muted/40 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-semibold">{a.autorNombre}</span>
                          <span className="text-xs text-muted-foreground">{a.autorRol}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{tipoIcono[a.tipo] ?? "📝"} {formatDateTime(a.fecha)}</span>
                        </div>
                        <p className="text-sm">{a.texto}</p>
                        <span className={`text-xs mt-1 inline-block px-1.5 py-0.5 rounded ${tipoColor[a.tipo] ?? "bg-blue-100 text-blue-700"}`}>
                          {tipoLabel[a.tipo] ?? a.tipo}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {/* Mini form */}
            <div className="border border-border rounded-xl p-4 bg-muted/20">
              <textarea
                value={nuevaAnotacion}
                onChange={(e) => setNuevaAnotacion(e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                placeholder="Escribe una anotación de seguimiento..."
              />
              <div className="flex items-center gap-2 mt-2">
                <select value={tipoAnotacion} onChange={(e) => setTipoAnotacion(e.target.value)} className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none">
                  <option value="seguimiento">📝 Seguimiento</option>
                  <option value="hallazgo">🔍 Hallazgo</option>
                  <option value="resolucion">✅ Resolución</option>
                  <option value="nota_interna">🔒 Nota interna</option>
                </select>
                <button onClick={agregarAnotacion} disabled={!nuevaAnotacion.trim()} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                  Agregar
                </button>
              </div>
            </div>
          </section>

          {/* Soporte CCTV */}
          <section>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold flex items-center gap-1.5">
                <Video className="w-4 h-4 text-blue-600" /> Soporte CCTV
                {soportesCCTV.length > 0 && <span className="text-xs text-muted-foreground font-normal">({soportesCCTV.length})</span>}
              </h3>
              {ev.estadoFlujo !== "cerrado" && !cctvFormAbierto && (
                <button
                  onClick={() => setCctvFormAbierto(true)}
                  className="text-[11px] px-2.5 py-1 rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50 font-medium transition-colors"
                >
                  + Registrar soporte CCTV
                </button>
              )}
            </div>

            {cctvFormAbierto && (
              <div className="border border-blue-200 bg-blue-50/50 rounded-xl p-4 space-y-3 mb-3">
                <div className="text-xs font-semibold text-blue-800 flex items-center gap-1.5">
                  <Video className="w-3.5 h-3.5" /> Registrar soporte CCTV
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Descripción de lo observado *</label>
                  <textarea
                    value={cctvDescripcion}
                    onChange={(e) => setCctvDescripcion(e.target.value)}
                    className="w-full text-xs bg-background border border-border rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                    rows={3}
                    placeholder="Describe lo observado en cámaras: qué pasó, quién intervino, horario, si se confirma o descarta la novedad..."
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground mb-1 block">Fotos o videos (opcional)</label>
                  <label className="flex flex-col items-center justify-center w-full h-20 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer hover:bg-blue-50/50 hover:border-blue-300 transition-colors">
                    <div className="flex items-center gap-2 text-blue-600">
                      <Upload className="w-4 h-4" />
                      <span className="text-xs font-medium">Subir fotos o videos</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">JPG, PNG, MP4, MOV</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,video/*"
                      className="hidden"
                      onChange={(e) => handleCctvFiles(e.target.files)}
                    />
                  </label>
                  {cctvArchivos.length > 0 && (
                    <div className="mt-2 space-y-1.5">
                      {cctvArchivos.map((file, idx) => {
                        const isVideo = file.type.startsWith("video/");
                        return (
                          <div key={idx} className="flex items-center justify-between gap-2 bg-background border border-border rounded-lg px-3 py-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {isVideo
                                ? <FileVideo className="w-4 h-4 text-purple-500 flex-shrink-0" />
                                : <ImageIcon className="w-4 h-4 text-blue-500 flex-shrink-0" />
                              }
                              <span className="text-xs truncate">{file.name}</span>
                              <span className="text-[10px] text-muted-foreground flex-shrink-0">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                              </span>
                            </div>
                            <button
                              onClick={() => setCctvArchivos(prev => prev.filter((_, i) => i !== idx))}
                              className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={registrarSoporteCCTV}
                    disabled={!cctvDescripcion.trim()}
                    className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
                  >
                    Registrar soporte
                  </button>
                  <button
                    onClick={() => { setCctvFormAbierto(false); setCctvDescripcion(""); setCctvArchivos([]); }}
                    className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}

            {soportesCCTV.length > 0 && (
              <div className="space-y-2">
                {soportesCCTV.map(sol => (
                  <div key={sol.id} className="rounded-xl border border-green-200 bg-green-50/50 p-4 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold">{sol.id}</span>
                        <span className="text-[10px] text-muted-foreground">{formatDate(sol.fechaSolicitud)}</span>
                      </div>
                      {sol.investigadoPor && (
                        <span className="text-[10px] text-muted-foreground">Por: {sol.investigadoPor.nombre}</span>
                      )}
                    </div>
                    {sol.conclusionCCTV && (
                      <p className="text-xs leading-relaxed">{sol.conclusionCCTV}</p>
                    )}
                    {sol.evidenciasUrls && sol.evidenciasUrls.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {sol.evidenciasUrls.map((url, idx) => {
                          const isVideo = url.endsWith(".mp4") || url.endsWith(".webm") || url.endsWith(".mov");
                          return (
                            <a key={idx} href={url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-green-100 border border-green-200 text-green-800 hover:bg-green-200 transition-colors font-medium">
                              {isVideo ? "🎬" : "📷"} {isVideo ? "Video" : "Foto"} {idx + 1}
                            </a>
                          );
                        })}
                      </div>
                    )}
                    {sol.personaIdentificada && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-green-700 font-medium">Persona identificada: </span>
                        <button
                          onClick={() => abrirPersona(sol.personaIdentificada!.cedula)}
                          className="text-xs font-medium text-primary underline hover:no-underline"
                        >
                          {sol.personaIdentificada.nombre} (CC {sol.personaIdentificada.cedula})
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Historial */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Historial de cambios</h3>
            <div className="space-y-1.5">
              {[...ev.historial].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((h) => (
                <div key={h.id} className="flex items-start gap-3 text-xs text-muted-foreground">
                  <span className="flex-shrink-0 w-32">{formatDateTime(h.fecha)}</span>
                  <span className="font-medium text-foreground/70">{h.usuarioNombre}</span>
                  <span>{h.accion}</span>
                </div>
              ))}
            </div>
          </section>

          {/* Relacionados */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Eventos relacionados ({relacionados.length})</h3>
            {relacionados.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No se encontraron eventos relacionados.</p>
            ) : (
              <div className="space-y-2">
                {relacionados.map((r) => (
                  <button key={r.id} onClick={() => abrirRegistro(r.id)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors">
                    <CategoriaBadge categoria={r.categoria} />
                    <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                    <span className="text-sm flex-1 truncate">{r.tipoEvento}</span>
                    <EstadoBadge estado={r.estado} />
                  </button>
                ))}
              </div>
            )}
          </section>

          {/* Registro por */}
          <section>
            <h3 className="text-sm font-semibold mb-2">Registrado por</h3>
            <div className="bg-muted/40 rounded-xl p-4 flex items-center gap-3">
              <AvatarInicial nombre={ev.usuarioRegistro} size="sm" />
              <div>
                <div className="text-sm font-medium">{ev.usuarioRegistro}</div>
                <div className="text-xs text-muted-foreground">{ev.perfilUsuario} · {ev.terminalUsuario}</div>
                <div className="text-xs text-muted-foreground">{formatDateTime(ev.fechaRegistro)}</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// ---- Persona 360 ----
const CAT_ICON: Record<string, string> = {
  dineros: "💰", unidades: "📦", listas_vinculantes: "📋", pqr: "📞", disciplinarios: "⚖️",
};

export function Persona360Drawer() {
  const { drawer, cerrarDrawer, abrirRegistro, abrirTerminal, abrirResolucionAcumulativa } = useApp();
  const [estudiosOpen, setEstudiosOpen] = useState(true);
  const [lesivaOpen, setLesivaOpen] = useState(false);
  const [lesivaCat, setLesivaCat] = useState("");
  const [lesivaSub, setLesivaSub] = useState("");
  const [lesivaObs, setLesivaObs] = useState("");
  const [, forceUpdate] = useState(0);

  if (drawer.tipo !== "persona360" || !drawer.id) return null;
  const persona = personas.find((p) => p.id === drawer.id);
  if (!persona) return null;

  const evPersona = eventos.filter((e) =>
    e.personasResponsables.some((pv) => pv.personaId === persona.id) ||
    e.personasParticipantes.some((pv) => pv.personaId === persona.id)
  );
  const estudios = estudiosSeguridad.filter((e) => e.personaId === persona.id);
  const alertasPersona = alertasIA.filter(a =>
    a.entidadesInvolucradas.some(e => e.tipo === "persona" && e.id === persona.id)
  );

  const totalEv = evPersona.length;
  const evAbiertos = evPersona.filter(e => e.estado === "abierto").length;
  const evCerradosConHallazgo = evPersona.filter(e => e.estado === "cerrado" && e.resolucionFinal && e.resolucionFinal !== "sin_hallazgos" && e.resolucionFinal !== "caso_insuficiente").length;
  const estudiosConHallazgo = estudios.filter(e => e.resultado === "hallazgos_encontrados").length;
  const riskScore = (evAbiertos * 2) + (evCerradosConHallazgo * 1) + (estudiosConHallazgo * 3);

  const riskConfig = riskScore >= 13
    ? { color: "bg-red-500", track: "bg-red-100", border: "border-red-200", bg: "bg-red-50", label: "Riesgo crítico", text: "text-red-800" }
    : riskScore >= 8
      ? { color: "bg-orange-500", track: "bg-orange-100", border: "border-orange-200", bg: "bg-orange-50", label: "Riesgo alto", text: "text-orange-800" }
      : riskScore >= 4
        ? { color: "bg-amber-400", track: "bg-amber-100", border: "border-amber-200", bg: "bg-amber-50", label: "Riesgo medio", text: "text-amber-800" }
        : { color: "bg-green-500", track: "bg-green-100", border: "border-green-200", bg: "bg-green-50", label: "Bajo riesgo", text: "text-green-800" };

  const barPct = Math.min(100, (riskScore / 20) * 100);

  const decisiones = evPersona.filter(e => e.decisionGH).map(e => ({
    decision: e.decisionGH!,
    fecha: e.fecha,
    evento: e.id,
    usuario: e.usuarioRegistro,
  }));

  const alertaReincidencia = alertasIA.find(a =>
    a.tipo === "reincidencia_persona" && a.entidadesInvolucradas.some(e => e.tipo === "persona" && e.id === persona.id)
  );

  type TimelineItem = { fecha: string; icon: string; desc: string; badge?: React.ReactNode; onClick?: () => void };

  const timeline: TimelineItem[] = [
    ...evPersona.map(e => ({
      fecha: e.fecha,
      icon: CAT_ICON[e.categoria] ?? "📋",
      desc: `${e.id} — ${e.tipoEvento} · ${e.terminal}`,
      badge: <EstadoBadge estado={e.estado} />,
      onClick: () => abrirRegistro(e.id),
    })),
    ...alertasPersona.map(a => ({
      fecha: a.fechaDeteccion,
      icon: "🤖",
      desc: a.titulo,
      badge: <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${a.severidad === "critica" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{a.severidad}</span>,
    })),
  ].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[60%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <AvatarInicial nombre={persona.nombre} size="lg" />
            <div>
              <h2 className="font-bold text-lg">{persona.nombre}</h2>
              <div className="text-sm text-muted-foreground">
                {persona.tipo === "cliente" ? `NIT ${persona.nit}` : `ID ${persona.cedula}`} · {persona.cargo} ·{" "}
                <button onClick={() => abrirTerminal(persona.terminal)} className="text-coordinadora-blue hover:underline">
                  {persona.terminal}
                </button>
              </div>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
                  persona.estado === "bloqueado" ? "bg-red-100 text-red-700 border border-red-200"
                  : persona.estado === "en_seguimiento" ? "bg-amber-100 text-amber-700 border border-amber-200"
                  : "bg-green-100 text-green-700 border border-green-200"
                }`}>
                  {persona.estado === "bloqueado" ? "🔴 Bloqueado" : persona.estado === "en_seguimiento" ? "🟡 En seguimiento" : "🟢 Sin novedad"}
                </span>
              </div>
            </div>
          </div>
          <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Score de riesgo — termómetro */}
          <div className={`${riskConfig.bg} border ${riskConfig.border} rounded-xl p-4`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">Score de riesgo</span>
              <span className={`text-sm font-black ${riskConfig.text}`}>{riskScore}</span>
            </div>
            <div className={`w-full h-3 ${riskConfig.track} rounded-full overflow-hidden mb-2`}>
              <div className={`h-full rounded-full transition-all ${riskConfig.color}`} style={{ width: `${barPct}%` }} />
            </div>
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${riskConfig.text}`}>{riskConfig.label}</span>
              <span className="text-[11px] text-muted-foreground">
                {evAbiertos} abierto{evAbiertos !== 1 ? "s" : ""} · {evCerradosConHallazgo} con hallazgos · {estudiosConHallazgo} estudio{estudiosConHallazgo !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          {/* Decisiones GH previas (lectura) */}
          {decisiones.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <h3 className="font-semibold text-sm mb-2">Decisiones de Gestión Humana</h3>
              <div className="flex flex-wrap gap-2">
                {decisiones.map((d, i) => (
                  <div key={i} className="inline-flex items-center gap-2 text-xs bg-muted/40 rounded-lg px-3 py-1.5">
                    <span className="font-semibold">{d.decision}</span>
                    <span className="text-muted-foreground">·</span>
                    <span className="text-muted-foreground">{formatDate(d.fecha)}</span>
                    <span className="text-muted-foreground">· {d.evento}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* CTA resolución acumulativa */}
          {totalEv >= 3 && (
            <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  Esta persona tiene {totalEv} eventos registrados.
                </p>
                <p className="text-xs text-amber-700/70 mt-0.5">Puedes aplicar una resolución que cubra todos los eventos vinculados.</p>
              </div>
              <button
                onClick={() => {
                  if (alertaReincidencia) {
                    abrirResolucionAcumulativa(alertaReincidencia.id);
                  } else {
                    abrirResolucionAcumulativa(`persona:${persona.id}`);
                  }
                }}
                className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-xs font-semibold hover:bg-primary/90 transition-colors shadow-sm"
              >
                Iniciar resolución acumulativa
              </button>
            </div>
          )}

          {/* Actividades Lesivas registradas */}
          {(() => {
            const actLesivas = getActividadesLesivasPorPersona(persona.id);
            if (actLesivas.length === 0) return null;
            return (
              <div className="border border-red-200 bg-red-50/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Actividades Lesivas ({actLesivas.length})</h3>
                <div className="space-y-2">
                  {actLesivas.map((al) => (
                    <div key={al.id} className="bg-white border border-red-100 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-red-700">{CATEGORIAS_LESIVAS[al.categoria]?.label}</span>
                        <span className="text-[10px] text-muted-foreground">·</span>
                        <span className="text-xs text-muted-foreground">{al.subcategoria}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">{al.observaciones}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{al.fechaRegistro}</span>
                        <span>· {al.terminalReporta}</span>
                        <span>· {al.registradoPor.nombre}</span>
                        {al.archivoAdjunto && <span className="text-blue-600">📎 Adjunto</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* Acción: Actividad Lesiva */}
          {persona.estado !== "bloqueado" ? (
            <button
              onClick={() => setLesivaOpen(!lesivaOpen)}
              className="w-full text-left px-3 py-2.5 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
            >
              <div className="text-xs font-semibold text-red-700">🚫 Registrar Actividad Lesiva</div>
              <div className="text-[10px] text-red-600/70 mt-0.5">Bloquear persona por responsabilidad directa en eventos</div>
            </button>
          ) : (
            <div className="px-3 py-2.5 border border-red-200 bg-red-50 rounded-xl">
              <div className="text-xs font-semibold text-red-700">🚫 Persona Bloqueada</div>
            </div>
          )}

          {/* Mini-form: Actividad Lesiva */}
          {lesivaOpen && (
            <div className="border border-red-200 bg-red-50/50 rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-semibold text-red-800">Registrar Actividad Lesiva</h4>
              <p className="text-xs text-red-700/70">Bloquear a esta persona por responsabilidad directa en eventos.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-300"
                    value={lesivaCat}
                    onChange={(e) => { setLesivaCat(e.target.value); setLesivaSub(""); }}
                  >
                    <option value="">Seleccionar...</option>
                    {Object.entries(CATEGORIAS_LESIVAS).map(([key, cat]) => (
                      <option key={key} value={key}>{cat.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Subcategoría</label>
                  <select
                    className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-red-300"
                    value={lesivaSub}
                    onChange={(e) => setLesivaSub(e.target.value)}
                    disabled={!lesivaCat}
                  >
                    <option value="">Seleccionar...</option>
                    {lesivaCat && CATEGORIAS_LESIVAS[lesivaCat as keyof typeof CATEGORIAS_LESIVAS]?.subcategorias.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>
              </div>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none focus:outline-none focus:ring-2 focus:ring-red-300"
                rows={3}
                placeholder="Observaciones: describir hechos, guías, evidencias, montos involucrados..."
                value={lesivaObs}
                onChange={(e) => setLesivaObs(e.target.value)}
              />
              <div className="flex gap-2">
                <button
                  disabled={!lesivaCat || !lesivaSub || !lesivaObs.trim()}
                  onClick={() => {
                    persona.estado = "bloqueado";
                    forceUpdate(k => k + 1);
                    toast({ title: "🚫 Actividad Lesiva registrada", description: `${persona.nombre} ha sido bloqueada. Categoría: ${CATEGORIAS_LESIVAS[lesivaCat as keyof typeof CATEGORIAS_LESIVAS]?.label} — ${lesivaSub}` });
                    setLesivaOpen(false);
                    setLesivaCat("");
                    setLesivaSub("");
                    setLesivaObs("");
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar bloqueo
                </button>
                <button onClick={() => { setLesivaOpen(false); setLesivaCat(""); setLesivaSub(""); setLesivaObs(""); }} className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-muted transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          )}

          {/* Timeline unificada */}
          {timeline.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-3">Timeline ({timeline.length})</h3>
              <div className="space-y-1">
                {timeline.map((item, i) => (
                  <button
                    key={i}
                    onClick={item.onClick}
                    disabled={!item.onClick}
                    className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border border-transparent transition-colors ${
                      item.onClick ? "hover:bg-muted hover:border-border cursor-pointer" : "cursor-default"
                    }`}
                  >
                    <span className="text-[11px] font-mono text-muted-foreground w-[72px] flex-shrink-0">{item.fecha}</span>
                    <span className="text-sm leading-none flex-shrink-0">{item.icon}</span>
                    <span className="text-xs flex-1 min-w-0 truncate">{item.desc}</span>
                    {item.badge && <div className="flex-shrink-0">{item.badge}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Estudios de seguridad (colapsable) */}
          {estudios.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors"
                onClick={() => setEstudiosOpen(s => !s)}
              >
                <span className="font-semibold text-sm">🔎 Estudios de seguridad</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{estudios.length}</span>
                  {estudiosOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {estudiosOpen && (
                <div className="p-4 space-y-2">
                  {estudios.map((e) => (
                    <div key={e.id} className={`border rounded-lg p-3 ${e.resultado === "hallazgos_encontrados" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold">{e.proveedor}</span>
                        <span className="text-xs text-muted-foreground">{e.fecha}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${e.resultado === "hallazgos_encontrados" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                          {e.resultado === "hallazgos_encontrados" ? "⚠️ Hallazgos" : "✅ Sin hallazgos"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">{e.observaciones}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {totalEv === 0 && estudios.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <span className="text-4xl">👤</span>
              <p className="mt-2 text-sm">Esta persona no tiene eventos registrados.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Vehículo 360 ----
export function Vehiculo360Drawer() {
  const { drawer, cerrarDrawer, abrirPersona, abrirRegistro } = useApp();
  const [vehLesivaOpen, setVehLesivaOpen] = useState(false);
  const [vehLesivaCat, setVehLesivaCat] = useState("");
  const [vehLesivaSub, setVehLesivaSub] = useState("");
  const [vehLesivaObs, setVehLesivaObs] = useState("");
  const [, forceUpdate] = useState(0);
  if (drawer.tipo !== "vehiculo360" || !drawer.id) return null;
  const vehiculo = vehiculos.find((v) => v.id === drawer.id);
  if (!vehiculo) return null;
  const conductor = vehiculo.conductorId ? personas.find((p) => p.id === vehiculo.conductorId) : null;
  const evVehiculo = eventos.filter((e) => e.vehiculosVinculados?.some((vv) => vv.vehiculoId === vehiculo.id));
  const rutas = [...new Set(evVehiculo.flatMap((e) => e.vehiculosVinculados?.filter((vv) => vv.vehiculoId === vehiculo.id && vv.ruta).map((vv) => vv.ruta!) || []))];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[55%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-3xl">🚛</span>
              <h2 className="text-2xl font-black font-mono">{vehiculo.placa}</h2>
              <span className={`text-sm px-2.5 py-1 rounded-full font-medium ${vehiculo.estado === "bloqueado" ? "bg-red-100 text-red-700 border border-red-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
                {vehiculo.estado === "bloqueado" ? "🔴 Bloqueado" : "🟢 Activo"}
              </span>
            </div>
            <div className="text-sm text-muted-foreground">{vehiculo.tipo}</div>
            {conductor && (
              <button onClick={() => abrirPersona(conductor.id)} className="text-sm text-coordinadora-blue hover:underline mt-1 block">
                Conductor asignado: {conductor.nombre} →
              </button>
            )}
          </div>
          <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="font-semibold text-sm mb-2">🤖 Análisis de riesgo IA</div>
            <p className="text-xs text-muted-foreground">
              {evVehiculo.length === 0 ? "Vehículo sin eventos asociados. Perfil limpio." :
                `Vehículo vinculado a ${evVehiculo.length} evento${evVehiculo.length !== 1 ? "s" : ""}. ${evVehiculo.length > 1 ? `Patrón detectado: ${evVehiculo.length} eventos en rutas diferentes. El riesgo podría estar asociado a la ruta.` : "Sin patrones críticos detectados."}`}
            </p>
          </div>

          {/* Actividades lesivas registradas */}
          {(() => {
            const actLesivas = getActividadesLesivasPorVehiculo(vehiculo.id);
            if (actLesivas.length === 0) return null;
            return (
              <div className="border border-red-200 bg-red-50/50 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-red-800 mb-2">Actividades Lesivas</h3>
                {actLesivas.map((al) => (
                  <div key={al.id} className="bg-white border border-red-100 rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-semibold text-red-700">{CATEGORIAS_LESIVAS[al.categoria]?.label}</span>
                      <span className="text-xs text-muted-foreground">{al.subcategoria}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{al.observaciones}</p>
                    <div className="text-[10px] text-muted-foreground mt-1">{al.fechaRegistro} · {al.registradoPor.nombre}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* Actividad Lesiva — botón + formulario inline */}
          {vehiculo.estado !== "bloqueado" ? (
            <>
              <button
                onClick={() => setVehLesivaOpen(!vehLesivaOpen)}
                className="w-full text-left px-3 py-2.5 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
              >
                <div className="text-xs font-semibold text-red-700">🚫 Registrar Actividad Lesiva (Bloquear vehículo)</div>
              </button>
              {vehLesivaOpen && (
                <div className="border border-red-200 bg-red-50/50 rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Categoría</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={vehLesivaCat} onChange={(e) => { setVehLesivaCat(e.target.value); setVehLesivaSub(""); }}>
                        <option value="">Seleccionar...</option>
                        {Object.entries(CATEGORIAS_LESIVAS).map(([key, cat]) => (
                          <option key={key} value={key}>{cat.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-muted-foreground mb-1 block">Subcategoría</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background" value={vehLesivaSub} onChange={(e) => setVehLesivaSub(e.target.value)} disabled={!vehLesivaCat}>
                        <option value="">Seleccionar...</option>
                        {vehLesivaCat && CATEGORIAS_LESIVAS[vehLesivaCat as keyof typeof CATEGORIAS_LESIVAS]?.subcategorias.map((sub) => (
                          <option key={sub} value={sub}>{sub}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background resize-none" rows={3} placeholder="Observaciones..." value={vehLesivaObs} onChange={(e) => setVehLesivaObs(e.target.value)} />
                  <div className="flex gap-2">
                    <button
                      disabled={!vehLesivaCat || !vehLesivaSub || !vehLesivaObs.trim()}
                      onClick={() => {
                        vehiculo.estado = "bloqueado";
                        forceUpdate(k => k + 1);
                        toast({ title: "🚫 Vehículo bloqueado", description: `${vehiculo.placa} registrado en actividades lesivas.` });
                        setVehLesivaOpen(false); setVehLesivaCat(""); setVehLesivaSub(""); setVehLesivaObs("");
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Confirmar bloqueo
                    </button>
                    <button onClick={() => { setVehLesivaOpen(false); setVehLesivaCat(""); setVehLesivaSub(""); setVehLesivaObs(""); }} className="px-4 py-2 border border-border rounded-lg text-xs hover:bg-muted">Cancelar</button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="px-3 py-2.5 border border-red-200 bg-red-50 rounded-lg">
              <div className="text-xs font-semibold text-red-700">🚫 Vehículo Bloqueado</div>
            </div>
          )}

          {evVehiculo.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 font-semibold text-sm">Eventos asociados ({evVehiculo.length})</div>
              <table className="w-full text-xs p-4">
                <thead className="bg-muted/20">
                  <tr>{["ID", "Categoría", "Tipo evento", "Ruta", "Fecha", "Estado"].map((h) => <th key={h} className="text-left px-4 py-2 font-semibold text-muted-foreground">{h}</th>)}</tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {evVehiculo.map((e) => {
                    const vv = e.vehiculosVinculados?.find((vv) => vv.vehiculoId === vehiculo.id);
                    return (
                      <tr key={e.id} onClick={() => abrirRegistro(e.id)} className="cursor-pointer hover:bg-muted transition-colors">
                        <td className="px-4 py-2.5 font-mono">{e.id}</td>
                        <td className="px-4 py-2.5"><CategoriaBadge categoria={e.categoria} /></td>
                        <td className="px-4 py-2.5 max-w-[120px] truncate">{e.tipoEvento}</td>
                        <td className="px-4 py-2.5">{vv?.ruta || "—"}</td>
                        <td className="px-4 py-2.5">{e.fecha}</td>
                        <td className="px-4 py-2.5"><EstadoBadge estado={e.estado} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {rutas.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <div className="font-semibold text-sm mb-3">Rutas involucradas</div>
              <div className="space-y-1.5">
                {rutas.map((ruta) => {
                  const cnt = evVehiculo.filter((e) => e.vehiculosVinculados?.some((vv) => vv.vehiculoId === vehiculo.id && vv.ruta === ruta)).length;
                  return (
                    <div key={ruta} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                      <span>📍 {ruta}</span>
                      <span className="text-xs text-muted-foreground">{cnt} vez{cnt !== 1 ? "es" : ""}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Guía 360 ----
export function Guia360Drawer() {
  const { drawer, cerrarDrawer, abrirRegistro } = useApp();
  if (drawer.tipo !== "guia360" || !drawer.id) return null;
  const guia = guias.find((g) => g.numero === drawer.id);
  if (!guia) return null;
  const evGuia = getEventosPorGuia(guia.numero);

  const timeline = evGuia.flatMap((e) => [
    { fecha: e.fecha, texto: `${categoriaConfig[e.categoria].label} — ${e.tipoEvento} (${e.id})`, eventoId: e.id },
    ...e.anotaciones.map((a) => ({ fecha: a.fecha.split("T")[0], texto: `Anotación de ${a.autorNombre} — ${a.texto.slice(0, 60)}...`, eventoId: e.id })),
  ]).sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[55%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Perfil 360° de guía</div>
            <h2 className="text-2xl font-black font-mono mb-1">{guia.numero}</h2>
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${guia.estadoGeneral === "con_novedad" ? "bg-amber-100 text-amber-700 border border-amber-200" : guia.estadoGeneral === "cerrada" ? "bg-gray-100 text-gray-600 border border-gray-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
              {guia.estadoGeneral === "con_novedad" ? "Con novedad" : guia.estadoGeneral === "cerrada" ? "Cerrada" : "Sin novedad"}
            </span>
          </div>
          <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {guia.valorDeclarado >= 1000000 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold text-green-700">💰 Guía con recaudo superior a $1M — Seguimiento RCE activo</div>
                  <div className="text-xs text-green-600/70 mt-0.5">Esta guía requiere seguimiento preventivo de seguridad por su alto valor de recaudo ({formatCurrency(guia.valorDeclarado)})</div>
                </div>
                <button
                  onClick={() => {
                    const nuevoId = `EVT-${Date.now().toString().slice(-6)}`;
                    const nuevoEvento: Evento = {
                      id: nuevoId,
                      estado: "abierto",
                      estadoFlujo: "abierto",
                      categoria: "dineros",
                      tipoEvento: "Seguimiento preventivo RCE",
                      tipoEntidad: "tercero",
                      fecha: new Date().toISOString().split("T")[0],
                      fechaRegistro: new Date().toISOString().split("T")[0],
                      terminal: guia.terminalOrigen,
                      ciudad: guia.ciudadOrigen,
                      guias: [guia.numero],
                      personasResponsables: [],
                      personasParticipantes: [],
                      vehiculosVinculados: [],
                      descripcionHechos: `Seguimiento preventivo por alto valor de recaudo (${formatCurrency(guia.valorDeclarado)}). Guía: ${guia.numero} · ${guia.nombreCliente}`,
                      asignadoA: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre, cargo: usuarioLogueado.cargo },
                      usuarioRegistro: usuarioLogueado.nombre,
                      perfilUsuario: usuarioLogueado.cargo,
                      terminalUsuario: usuarioLogueado.terminal,
                      anotaciones: [],
                      historial: [{
                        id: `h-${Date.now()}`,
                        fecha: new Date().toISOString(),
                        usuarioNombre: usuarioLogueado.nombre,
                        accion: "Evento creado — Seguimiento preventivo RCE",
                      }],
                      diasAbierto: 0,
                    };
                    eventos.unshift(nuevoEvento);
                    guia.estadoGeneral = "con_novedad";
                    toast({ title: "✅ Evento RCE creado", description: `${nuevoId} registrado para guía ${guia.numero}` });
                    abrirRegistro(nuevoId);
                  }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 transition-colors flex-shrink-0"
                >
                  Registrar seguimiento RCE
                </button>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-xl p-4">
            {[
              ["Origen", `${guia.terminalOrigen} (${guia.ciudadOrigen})`],
              ["Destino", `${guia.terminalDestino} (${guia.ciudadDestino})`],
              ["Cliente", guia.nombreCliente],
              ["NIT", guia.nitCliente],
              ["Valor declarado", formatCurrency(guia.valorDeclarado)],
              ["Fecha creación", formatDate(guia.fechaCreacion)],
            ].map(([l, v]) => (
              <div key={l}><div className="text-xs text-muted-foreground mb-0.5">{l}</div><div className="text-sm font-medium">{v}</div></div>
            ))}
          </div>

          {evGuia.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 font-semibold text-sm">Eventos asociados ({evGuia.length})</div>
              <div className="divide-y divide-border">
                {evGuia.map((e) => (
                  <button key={e.id} onClick={() => abrirRegistro(e.id)} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3">
                    <CategoriaBadge categoria={e.categoria} />
                    <span className="font-mono text-xs text-muted-foreground">{e.id}</span>
                    <span className="text-sm flex-1 truncate">{e.tipoEvento}</span>
                    <EstadoBadge estado={e.estado} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {timeline.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <div className="font-semibold text-sm mb-3">Timeline de la guía</div>
              <div className="relative pl-4 space-y-3">
                <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-border" />
                {timeline.map((item, i) => (
                  <button key={i} onClick={() => abrirRegistro(item.eventoId)} className="w-full text-left flex items-start gap-3 group">
                    <div className="absolute left-0 mt-1 w-2.5 h-2.5 rounded-full bg-coordinadora-blue border-2 border-white -translate-x-[3px]" />
                    <div className="pl-3">
                      <span className="text-xs font-mono text-muted-foreground">{item.fecha}</span>
                      <p className="text-xs mt-0.5 group-hover:text-coordinadora-blue transition-colors">{item.texto}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {evGuia.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm">No se encontraron eventos asociados a esta guía.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Terminal 360 ----
export function Terminal360Drawer() {
  const { drawer, cerrarDrawer, abrirRegistro, abrirPersona } = useApp();

  if (drawer.tipo !== "terminal360" || !drawer.id) return null;
  const terminalNombre = drawer.id;

  let pais = "—";
  let regional = "—";
  for (const [p, regionales] of Object.entries(PAISES_REGIONALES)) {
    for (const [r, terminalesArr] of Object.entries(regionales)) {
      if (terminalesArr.includes(terminalNombre)) {
        pais = p;
        regional = r;
      }
    }
  }

  const evTerminal = eventos.filter((e) => e.terminal === terminalNombre);
  const ahora = new Date();
  const hace30 = new Date(ahora.getTime() - 30 * 24 * 60 * 60 * 1000);

  const eventosAbiertos = evTerminal.filter((e) => e.estado !== "cerrado").length;
  const evEsteMes = evTerminal.filter((e) => new Date(e.fecha) >= hace30).length;
  const casosVencidos = evTerminal.filter((e) => e.estado !== "cerrado" && e.diasAbierto > 30).length;
  const alertasTerminal = alertasIA.filter((a) =>
    a.entidadesInvolucradas.some((e) => e.tipo === "terminal" && e.nombre.toLowerCase().includes(terminalNombre.toLowerCase()))
  );

  const recientes = [...evTerminal]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 10);

  const conteoPersonas: Record<string, number> = {};
  evTerminal.forEach((e) => {
    [...e.personasResponsables, ...e.personasParticipantes].forEach((pv) => {
      conteoPersonas[pv.personaId] = (conteoPersonas[pv.personaId] ?? 0) + 1;
    });
  });
  const topPersonas = Object.entries(conteoPersonas)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([id, count]) => ({ persona: personas.find((p) => p.id === id), count }))
    .filter((x) => x.persona);

  const paisBandera = pais === "Colombia" ? "🇨🇴" : pais === "México" ? "🇲🇽" : "🌐";

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[58%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div>
            <div className="text-xs text-muted-foreground mb-1">Perfil 360° de Terminal</div>
            <h2 className="text-2xl font-black mb-1">Terminal {terminalNombre}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-muted-foreground">{paisBandera} {pais} · {regional}</span>
              <span className="text-xs px-2.5 py-1 rounded-full font-medium bg-amber-100 text-amber-800 border border-amber-200">
                {eventosAbiertos} eventos abiertos
              </span>
            </div>
          </div>
          <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Eventos abiertos", value: eventosAbiertos, icon: "📋", color: "border-blue-200 bg-blue-50" },
              { label: "Eventos este mes", value: evEsteMes, icon: "📅", color: "border-border bg-muted/30" },
              { label: "Vencidos >30d", value: casosVencidos, icon: "⏰", color: casosVencidos > 0 ? "border-red-200 bg-red-50" : "border-border bg-muted/30" },
              { label: "Alertas IA", value: alertasTerminal.length, icon: "🤖", color: alertasTerminal.length > 0 ? "border-amber-200 bg-amber-50" : "border-border bg-muted/30" },
            ].map(({ label, value, icon, color }) => (
              <div key={label} className={`rounded-xl border p-4 ${color}`}>
                <div className="text-2xl mb-1">{icon}</div>
                <div className="text-3xl font-black">{value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {recientes.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 font-semibold text-sm">
                Eventos recientes ({recientes.length} de {evTerminal.length})
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border bg-muted/10">
                    {["Categoría", "ID", "Tipo evento", "Estado", "Fecha"].map((h) => (
                      <th key={h} className="text-left px-4 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {recientes.map((e) => (
                    <tr key={e.id} onClick={() => abrirRegistro(e.id)} className="cursor-pointer hover:bg-muted transition-colors">
                      <td className="px-4 py-2.5"><CategoriaBadge categoria={e.categoria} /></td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">{e.id}</td>
                      <td className="px-4 py-2.5 max-w-[160px] truncate">{e.tipoEvento}</td>
                      <td className="px-4 py-2.5"><EstadoBadge estado={e.estado} /></td>
                      <td className="px-4 py-2.5 text-muted-foreground">{e.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {evTerminal.length === 0 && (
            <div className="text-center py-10 text-muted-foreground">
              <span className="text-4xl">📋</span>
              <p className="mt-2 text-sm">No hay eventos para esta terminal.</p>
            </div>
          )}

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 font-semibold text-sm">Top personas vinculadas</div>
            {topPersonas.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground italic">No hay personas con eventos en esta terminal.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border bg-muted/10">
                    {["Nombre", "ID empleado", "Apariciones", "Estado"].map((h) => (
                      <th key={h} className="text-left px-4 py-2 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {topPersonas.map(({ persona, count }) => (
                    <tr key={persona!.id} onClick={() => abrirPersona(persona!.id)} className="cursor-pointer hover:bg-muted transition-colors">
                      <td className="px-4 py-2.5">
                        <div className="flex items-center gap-2">
                          <AvatarInicial nombre={persona!.nombre} size="sm" />
                          <span className="font-medium">{persona!.nombre}</span>
                        </div>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted-foreground">
                        {persona!.cedula || persona!.nit || "—"}
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${count >= 3 ? "bg-red-100 text-red-700" : count >= 2 ? "bg-amber-100 text-amber-700" : "bg-muted text-muted-foreground"}`}>
                          {count}×
                        </span>
                      </td>
                      <td className="px-4 py-2.5">
                        <EstadoPersonaBadge estado={persona!.estado} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-muted/30 font-semibold text-sm">🤖 Alertas IA</div>
            {alertasTerminal.length === 0 ? (
              <p className="px-4 py-4 text-sm text-muted-foreground italic">Sin alertas activas para esta terminal.</p>
            ) : (
              <div className="divide-y divide-border">
                {alertasTerminal.map((a) => (
                  <div key={a.id} className={`px-4 py-3 ${a.severidad === "critica" ? "bg-red-50" : a.severidad === "alta" ? "bg-amber-50" : "bg-blue-50"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <SeveridadBadge severidad={a.severidad} />
                      <span className="text-xs font-semibold">{a.titulo}</span>
                    </div>
                    <p className="text-xs text-muted-foreground line-clamp-2">{a.descripcion}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ---- Resolución Acumulativa ----
const DECISION_OPTIONS: { value: ResolucionFinal; label: string; icon: string; color: string; selected: string }[] = [
  { value: "caso_insuficiente",        label: "Sin acción — caso insuficiente",  icon: "✅", color: "border-green-200 bg-green-50/50 text-green-900",      selected: "border-green-500 bg-green-100 ring-2 ring-green-500/30" },
  { value: "llamado_atencion_verbal",  label: "Llamado de atención verbal",     icon: "⚠️", color: "border-amber-200 bg-amber-50/50 text-amber-900",      selected: "border-amber-500 bg-amber-100 ring-2 ring-amber-500/30" },
  { value: "llamado_atencion_escrito", label: "Llamado de atención escrito",    icon: "⚠️", color: "border-amber-200 bg-amber-50/50 text-amber-900",      selected: "border-amber-500 bg-amber-100 ring-2 ring-amber-500/30" },
  { value: "suspension_temporal",      label: "Suspensión temporal",            icon: "🔶", color: "border-orange-200 bg-orange-50/50 text-orange-900",    selected: "border-orange-500 bg-orange-100 ring-2 ring-orange-500/30" },
  { value: "proceso_disciplinario",    label: "Proceso disciplinario",          icon: "🔴", color: "border-red-200 bg-red-50/50 text-red-900",             selected: "border-red-500 bg-red-100 ring-2 ring-red-500/30" },
  { value: "desvinculacion",           label: "Desvinculación",                 icon: "🚫", color: "border-red-200 bg-red-50/50 text-red-900",             selected: "border-red-600 bg-red-100 ring-2 ring-red-600/30" },
  { value: "escalamiento_seguridad",   label: "Escalamiento a seguridad",       icon: "↗️", color: "border-purple-200 bg-purple-50/50 text-purple-900",    selected: "border-purple-500 bg-purple-100 ring-2 ring-purple-500/30" },
];

const REQUIERE_OBSERVACIONES: ResolucionFinal[] = ["desvinculacion", "proceso_disciplinario"];

export function ResolucionAcumulativaPanel() {
  const { drawer, cerrarDrawer, abrirRegistro } = useApp();
  const [decision, setDecision] = useState<ResolucionFinal | "">("");
  const [observaciones, setObservaciones] = useState("");
  const [confirmado, setConfirmado] = useState(false);

  if (drawer.tipo !== "resolucion_acumulativa" || !drawer.id) return null;

  let persona: typeof personas[0] | undefined;

  let alertaRef: AlertaIA | undefined;
  if (drawer.id.startsWith("persona:")) {
    const personaId = drawer.id.replace("persona:", "");
    persona = personas.find(p => p.id === personaId);
  } else {
    alertaRef = alertasIA.find(a => a.id === drawer.id);
    if (!alertaRef || alertaRef.tipo !== "reincidencia_persona") return null;
    const personaEntidad = alertaRef.entidadesInvolucradas.find(e => e.tipo === "persona");
    persona = personaEntidad ? personas.find(p => p.id === personaEntidad.id) : undefined;
  }
  if (!persona) return null;

  const evPersona = eventos.filter(e =>
    e.personasResponsables.some(pv => pv.personaId === persona.id) ||
    e.personasParticipantes.some(pv => pv.personaId === persona.id)
  );

  const evSorted = [...evPersona].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());

  const conteoCategoria: Record<string, number> = {};
  evPersona.forEach(e => { conteoCategoria[e.categoria] = (conteoCategoria[e.categoria] ?? 0) + 1; });
  const desglose = Object.entries(conteoCategoria)
    .map(([cat, n]) => `${n} ${categoriaConfig[cat as keyof typeof categoriaConfig]?.label ?? cat}`)
    .join(" · ");

  const necesitaObs = decision ? REQUIERE_OBSERVACIONES.includes(decision as ResolucionFinal) : false;
  const puedeConfirmar = decision && (!necesitaObs || observaciones.trim().length > 0);

  function confirmarDecision() {
    if (!puedeConfirmar || confirmado) return;
    setConfirmado(true);
    const decisionLabel = DECISION_OPTIONS.find(o => o.value === decision)?.label ?? decision;

    const abiertosAntes = evPersona.filter(e => e.estado === "abierto").length;
    evPersona.forEach(e => {
      if (e.estado === "abierto") {
        e.estado = "cerrado";
        e.estadoFlujo = "cerrado";
        e.resolucionFinal = decision as ResolucionFinal;
        e.observacionResolucion = observaciones || undefined;
        e.fechaResolucion = new Date().toISOString().split("T")[0];
        e.historial.push({
          id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          fecha: new Date().toISOString(),
          usuarioNombre: "Sandra Herrera",
          accion: `Cerrado por resolución acumulativa — ${decisionLabel}`,
        });
      }
    });

    const desvinculaciones: ResolucionFinal[] = ["desvinculacion"];
    const disciplinarios: ResolucionFinal[] = ["proceso_disciplinario", "suspension_temporal"];
    if (desvinculaciones.includes(decision as ResolucionFinal)) {
      persona!.estado = "bloqueado";
    } else if (disciplinarios.includes(decision as ResolucionFinal)) {
      persona!.estado = "en_seguimiento";
    }

    if (alertaRef) alertaRef.estado = "revisada";

    toast({ title: "✅ Decisión registrada", description: `Se aplicó "${decisionLabel}" a ${abiertosAntes} evento${abiertosAntes !== 1 ? "s" : ""} de ${persona!.nombre}` });
    setTimeout(() => {
      cerrarDrawer();
      setConfirmado(false);
      setDecision("");
      setObservaciones("");
    }, 600);
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[62%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-base">Resolución acumulativa</h2>
              <p className="text-xs text-muted-foreground">{alertaRef ? `Alerta ${alertaRef.id} · ${alertaRef.titulo}` : `Persona · ${persona?.nombre}`}</p>
            </div>
          </div>
          <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Two-panel body */}
        <div className="flex-1 overflow-hidden flex">

          {/* Left: Contexto de la persona */}
          <div className="w-[40%] border-r border-border overflow-y-auto p-5 space-y-5">

            {/* Persona card */}
            <div className="bg-muted/40 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <AvatarInicial nombre={persona.nombre} size="lg" />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{persona.nombre}</div>
                  <div className="text-xs text-muted-foreground">CC {persona.cedula} · {persona.cargo}</div>
                  <div className="text-xs text-muted-foreground">{persona.terminal}</div>
                </div>
              </div>
              <EstadoPersonaBadge estado={persona.estado} />
            </div>

            {/* Total prominente */}
            <div className="text-center py-4 bg-destructive/5 border border-destructive/20 rounded-xl">
              <div className="text-4xl font-black text-destructive">{evPersona.length}</div>
              <div className="text-xs text-muted-foreground mt-1">eventos vinculados</div>
              <div className="text-[11px] text-muted-foreground mt-0.5">{desglose}</div>
            </div>

            {/* Timeline de eventos */}
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Eventos (cronología)</h3>
              <div className="space-y-2">
                {evSorted.map(e => (
                  <button
                    key={e.id}
                    onClick={() => abrirRegistro(e.id)}
                    className="w-full text-left p-3 rounded-xl border border-border hover:bg-muted/50 hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <CategoriaBadge categoria={e.categoria} />
                      <span className="font-mono text-[11px] text-muted-foreground">{e.id}</span>
                      <EstadoBadge estado={e.estado} />
                    </div>
                    <div className="text-xs font-medium group-hover:text-primary transition-colors">{e.tipoEvento}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {formatDate(e.fecha)} · {e.terminal}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Tomar decisión */}
          <div className="flex-1 overflow-y-auto p-5 space-y-5">

            <div>
              <h3 className="text-sm font-bold mb-1">Tomar decisión</h3>
              <p className="text-xs text-muted-foreground">
                Selecciona la resolución que aplica para <span className="font-semibold text-foreground">{persona.nombre}</span> considerando los {evPersona.length} eventos vinculados.
                Al confirmar, todos los eventos abiertos se cerrarán con esta resolución.
              </p>
            </div>

            {/* Radio buttons */}
            <div className="space-y-2">
              {DECISION_OPTIONS.map(opt => {
                const isSelected = decision === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected ? opt.selected : `${opt.color} hover:shadow-sm`
                    }`}
                  >
                    <input
                      type="radio"
                      name="decision_acumulativa"
                      value={opt.value}
                      checked={isSelected}
                      onChange={() => setDecision(opt.value)}
                      className="sr-only"
                    />
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isSelected ? "border-primary bg-primary" : "border-muted-foreground/30 bg-background"
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                    </div>
                    <span className="text-lg leading-none">{opt.icon}</span>
                    <span className="text-sm font-medium">{opt.label}</span>
                  </label>
                );
              })}
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Observaciones {necesitaObs && <span className="text-destructive">*obligatorio</span>}
              </label>
              <textarea
                value={observaciones}
                onChange={e => setObservaciones(e.target.value)}
                className="w-full text-sm bg-background border border-border rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={3}
                placeholder="Justificación de la decisión, hallazgos relevantes..."
              />
            </div>

            {/* Confirm */}
            <div className="pt-2 border-t border-border">
              <button
                onClick={confirmarDecision}
                disabled={!puedeConfirmar || confirmado}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 disabled:opacity-40 transition-all shadow-sm"
              >
                {confirmado ? "Registrando..." : `Confirmar decisión — ${evPersona.filter(e => e.estado === "abierto").length} eventos se cerrarán`}
              </button>
              <p className="text-[11px] text-muted-foreground text-center mt-2">
                Esta acción cerrará todos los eventos abiertos, actualizará el estado de la persona y marcará la alerta como revisada.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
