import React, { useState } from "react";
import { eventos, personas, vehiculos, guias, getPersona, getVehiculo, getEventosPorGuia, getEventosRelacionados, estudiosSeguridad, alertasIA, PAISES_REGIONALES, solicitudesCCTV, CATEGORIAS_LESIVAS, actividadesLesivas, getActividadesLesivasPorPersona, getActividadesLesivasPorVehiculo, usuarioLogueado } from "@/data/mockData";
import { CategoriaBadge, EstadoBadge, SeveridadBadge, AvatarInicial, formatDate, formatDateTime, formatCurrency, descripcionCorta, categoriaConfig, estadoConfig } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import { X, ChevronDown, ChevronRight, AlertTriangle, Check, UserCheck, User, RotateCcw, Lock, Scale, Video, Upload, Trash2, Image as ImageIcon, FileVideo } from "lucide-react";
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
  // Coordinadores nacionales
  { id: "u-jefe-seg", nombre: "Carlos Mendoza", cargo: "Jefe de Seguridad", grupo: "Coordinación Nacional" },
  { id: "u-dir-calidad", nombre: "María Elena Rojas", cargo: "Directora de Calidad", grupo: "Coordinación Nacional" },
  { id: "u-coord-dineros", nombre: "Jorge Castaño", cargo: "Coordinador Nacional Dineros", grupo: "Coordinación Nacional" },
  { id: "u-coord-unidades", nombre: "Sandra Herrera", cargo: "Coordinadora Nacional Calidad", grupo: "Coordinación Nacional" },
  { id: "u-gerente-ops", nombre: "Andrés Gutiérrez", cargo: "Gerente de Operaciones", grupo: "Coordinación Nacional" },
  // Investigadores de terminal
  { id: "u-inv-bog", nombre: "Luis Alberto Díaz", cargo: "Investigador SG — Bogotá", grupo: "Investigadores Terminal" },
  { id: "u-inv-med", nombre: "Patricia Gómez", cargo: "Investigador SG — Medellín", grupo: "Investigadores Terminal" },
  { id: "u-inv-cal", nombre: "Ricardo Morales", cargo: "Investigador SG — Cali", grupo: "Investigadores Terminal" },
  { id: "u-inv-baq", nombre: "Carmen Lucia Vega", cargo: "Investigador SG — Barranquilla", grupo: "Investigadores Terminal" },
  { id: "u-inv-buc", nombre: "Diego Fernando Ruiz", cargo: "Investigador SG — Bucaramanga", grupo: "Investigadores Terminal" },
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
    const idx = eventos.findIndex((e) => e.id === ev!.id);
    if (idx !== -1) {
      Object.assign(eventos[idx], extras, {
        estado: nuevoEstado,
        estadoFlujo: nuevoFlujo,
        historial: [...eventos[idx].historial, { id: `h${Date.now()}`, fecha: new Date().toISOString(), usuarioNombre: usuarioLogueado.nombre, accion: `Cambió flujo de '${prevLabel}' a '${newLabel}'` }],
      });
    }
    setLocalEventos([...eventos]);
    toast({ title: `Estado actualizado a "${newLabel}"` });
  }

  function confirmarResolucion() {
    if (!resolucionSeleccionada) return;
    avanzarFlujo("cerrado", {
      resolucionFinal: resolucionSeleccionada as ResolucionFinal,
      observacionResolucion: observacionResolucion || undefined,
      fechaResolucion: new Date().toISOString(),
      resueltoPor: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre },
    });
    setResolviendoAbierto(false);
    setResolucionSeleccionada("");
    setObservacionResolucion("");
  }

  function confirmarEscalamiento() {
    const persona = PERSONAS_ESCALAMIENTO.find(p => p.id === escaladoPersonaId);
    if (!persona || !escaladoMotivo.trim()) return;
    avanzarFlujo("escalado", {
      asignadoA: persona,
      escaladoA: persona,
      escaladoPor: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre, cargo: usuarioLogueado.cargo },
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
      asignadoA: {
        id: ev!.usuarioRegistro,
        nombre: ev!.usuarioRegistro,
        cargo: ev!.perfilUsuario,
      },
      escaladoA: undefined,
      escaladoPor: undefined,
      fechaEscalamiento: undefined,
      motivoEscalamiento: undefined,
    });
    toast({ title: `Evento devuelto a ${ev!.usuarioRegistro}` });
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
    const idx = eventos.findIndex((e) => e.id === ev!.id);
    if (idx !== -1) {
      eventos[idx].anotaciones.push({
        id: `a${Date.now()}`, autorId: usuarioLogueado.id, autorNombre: usuarioLogueado.nombre,
        autorRol: usuarioLogueado.cargo, fecha: new Date().toISOString(), texto: nuevaAnotacion, tipo: tipoAnotacion as any,
      });
    }
    setLocalEventos([...eventos]);
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
      solicitadoPor: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre },
      asignadoA: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre, cargo: usuarioLogueado.cargo },
      estado: "completada",
      conclusionCCTV: cctvDescripcion,
      evidenciasUrls: urls,
      fechaCierre: new Date().toISOString(),
      investigadoPor: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre },
    };
    solicitudesCCTV.push(nuevo);
    setLocalCCTV([...solicitudesCCTV]);
    const numArchivos = cctvArchivos.length;
    const idx = eventos.findIndex((e) => e.id === ev!.id);
    if (idx !== -1) {
      eventos[idx].anotaciones.push({
        id: `a${Date.now()}`, autorId: usuarioLogueado.id, autorNombre: usuarioLogueado.nombre,
        autorRol: usuarioLogueado.cargo, fecha: new Date().toISOString(),
        texto: `Soporte CCTV registrado: ${cctvDescripcion}${numArchivos > 0 ? ` — ${numArchivos} archivo(s) adjunto(s)` : ""}`,
        tipo: "hallazgo" as any,
      });
      eventos[idx].historial.push({ id: `h${Date.now()}`, fecha: new Date().toISOString(), usuarioNombre: usuarioLogueado.nombre, accion: "Soporte CCTV registrado" });
    }
    setLocalEventos([...eventos]);
    setCctvFormAbierto(false);
    setCctvDescripcion("");
    setCctvArchivos([]);
    toast({ title: "Soporte CCTV registrado en el evento" });
  }

  function guardarComplemento() {
    if (!complementoTexto.trim()) return;
    const idx = eventos.findIndex((e) => e.id === ev!.id);
    if (idx !== -1) {
      eventos[idx].anotaciones.push({
        id: `a${Date.now()}`, autorId: usuarioLogueado.id, autorNombre: usuarioLogueado.nombre,
        autorRol: usuarioLogueado.cargo, fecha: new Date().toISOString(), texto: complementoTexto, tipo: "hallazgo" as any,
      });
    }
    setLocalEventos([...eventos]);
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
            {ev.asignadoA ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-800 border border-blue-200 font-medium">
                <UserCheck className="w-3 h-3" />
                Asignado a: {ev.asignadoA.nombre} · {ev.asignadoA.cargo}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-medium">
                <User className="w-3 h-3" />
                Sin asignar
              </span>
            )}
            {!ev.asignadoA && ev.estadoFlujo === "abierto" && (
              <button
                onClick={() => {
                  avanzarFlujo(ev.estadoFlujo, {
                    asignadoA: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre, cargo: usuarioLogueado.cargo },
                  });
                  toast({ title: "Caso tomado", description: `Asignado a ${usuarioLogueado.nombre}` });
                }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-medium transition-colors shadow-sm"
              >
                <UserCheck className="w-3.5 h-3.5" /> Tomar caso
              </button>
            )}
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
                {Object.entries(
                  PERSONAS_ESCALAMIENTO.reduce<Record<string, typeof PERSONAS_ESCALAMIENTO>>((acc, p) => {
                    (acc[p.grupo] ??= []).push(p);
                    return acc;
                  }, {})
                ).map(([grupo, personas]) => (
                  <optgroup key={grupo} label={grupo}>
                    {personas.map(p => (
                      <option key={p.id} value={p.id}>{p.nombre} — {p.cargo}</option>
                    ))}
                  </optgroup>
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

          {/* Gestión de Seguridad — solo para dineros/unidades */}
          {(ev.categoria === "dineros" || ev.categoria === "unidades") && ev.estadoFlujo !== "cerrado" && (
            <section className="border border-blue-200 bg-blue-50/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-blue-800 flex items-center gap-1.5">
                🛡️ Gestión de Seguridad
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Intervención Seguridad</label>
                  <select
                    value={ev.intervencionSeguridad ?? ""}
                    onChange={(e) => {
                      const idx = eventos.findIndex((x) => x.id === ev.id);
                      if (idx !== -1) { eventos[idx].intervencionSeguridad = e.target.value || undefined; setLocalEventos([...eventos]); }
                    }}
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sin asignar</option>
                    <option value="Acompañamiento de SG en la entrega y RCE">Acompañamiento SG en entrega y RCE</option>
                    <option value="Seguimiento a la entrega y RCE">Seguimiento a la entrega y RCE</option>
                    <option value="Seguimiento a la devolución">Seguimiento a la devolución</option>
                    <option value="Investigación de Faltante">Investigación de Faltante</option>
                    <option value="Investigación (Guía anulada)">Investigación (Guía anulada)</option>
                    <option value="Proceso Denuncia">Proceso Denuncia</option>
                    <option value="Reporte Acta de Aprehensión">Reporte Acta de Aprehensión</option>
                    <option value="Reporte Acta de Incautación">Reporte Acta de Incautación</option>
                    <option value="602. Envío en Validación por Seguridad (Unidad retenida)">602. Envío en Validación por Seguridad</option>
                    <option value="N/A (Devolución efectiva al momento de investigar)">N/A (Devolución efectiva)</option>
                    <option value="N/A (RCE / Entrega Efectiva al momento de investigar)">N/A (RCE / Entrega Efectiva)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Desviaciones identificadas</label>
                  <select
                    value={ev.desviacionesIdentificadas ?? ""}
                    onChange={(e) => {
                      const idx = eventos.findIndex((x) => x.id === ev.id);
                      if (idx !== -1) { eventos[idx].desviacionesIdentificadas = e.target.value || undefined; setLocalEventos([...eventos]); }
                    }}
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sin asignar</option>
                    <option value="Demora legalización reexpedidor">Demora legalización reexpedidor</option>
                    <option value="Demora anulación RCE">Demora anulación RCE</option>
                    <option value="Pendiente devolución al remitente">Pendiente devolución al remitente</option>
                    <option value="Pendiente inventario unidad">Pendiente inventario unidad</option>
                    <option value="RCE mal liquidado">RCE mal liquidado</option>
                    <option value="RCE pagado, no se refleja en el sistema">RCE pagado, no se refleja en el sistema</option>
                    <option value="809. Guía mal elaborada, error en RCE">809. Guía mal elaborada, error en RCE</option>
                    <option value="Guía anulada (Unidad no recogida)">Guía anulada (Unidad no recogida)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Estado (Gestión SG)</label>
                  <select
                    value={ev.estadoGestionSG ?? ""}
                    onChange={(e) => {
                      const idx = eventos.findIndex((x) => x.id === ev.id);
                      if (idx !== -1) { eventos[idx].estadoGestionSG = e.target.value || undefined; setLocalEventos([...eventos]); }
                    }}
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Sin asignar</option>
                    <option value="Asignada">Asignada</option>
                    <option value="En proceso">En proceso</option>
                    <option value="En proceso (NyS)">En proceso (NyS)</option>
                    <option value="Parcial">Parcial</option>
                    <option value="RCE / Entrega Efectiva">RCE / Entrega Efectiva</option>
                    <option value="Devolución Efectiva">Devolución Efectiva</option>
                    <option value="Hurto">Hurto</option>
                    <option value="Pérdida">Pérdida</option>
                    <option value="Aprehensión">Aprehensión</option>
                    <option value="Incautación">Incautación</option>
                    <option value="Guía anulada (Unidad no recogida)">Guía anulada (Unidad no recogida)</option>
                    <option value="Cierre Investig.">Cierre Investigación</option>
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Causa raíz y cierre — solo para unidades */}
          {ev.categoria === "unidades" && ev.estadoFlujo !== "cerrado" && (
            <section className="border border-purple-200 bg-purple-50/30 rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-semibold text-purple-800 flex items-center gap-1.5">
                🔎 Investigación y cierre
              </h3>
              <div>
                <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Causa raíz de la novedad</label>
                <select
                  value={ev.causaRaiz ?? ""}
                  onChange={(e) => {
                    const idx = eventos.findIndex((x) => x.id === ev.id);
                    if (idx !== -1) { eventos[idx].causaRaiz = e.target.value || undefined; setLocalEventos([...eventos]); }
                  }}
                  className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Seleccionar causa raíz...</option>
                  <optgroup label="1 — Rotulado / Etiquetas">
                    <option value="1-Unidad mal rotulada o sin marcar">Unidad mal rotulada o sin marcar</option>
                    <option value="1-Unidad con doble rótulo">Unidad con doble rótulo</option>
                    <option value="1-Etiquetas Trocadas">Etiquetas Trocadas</option>
                    <option value="1-Guía pendiente por anular">Guía pendiente por anular</option>
                  </optgroup>
                  <optgroup label="2 — Despacho / Transporte">
                    <option value="2-Unidad se queda dentro del Vehículo Local">Unidad se queda en Vehículo Local</option>
                    <option value="2-Unidad se queda dentro del Vehículo Ruta Nacional">Unidad se queda en Vehículo Ruta Nacional</option>
                    <option value="2-Unidad se queda en Origen">Unidad se queda en Origen</option>
                    <option value="2-Unidad llega a Destino Errado">Unidad llega a Destino Errado</option>
                    <option value="2-Unidad se despacha en otro Trailer">Unidad se despacha en otro Trailer</option>
                    <option value="2-Cargue de la Unidad a la Móvil Sin Guía">Cargue de la Unidad a la Móvil Sin Guía</option>
                  </optgroup>
                  <optgroup label="3 — Entrega">
                    <option value="3-Entrega Trocada">Entrega Trocada</option>
                    <option value="3-Entrega Unidad Sin Guía">Entrega Unidad Sin Guía</option>
                    <option value="3-Suplantación de Firma">Suplantación de Firma</option>
                  </optgroup>
                  <optgroup label="4 — Solución operativa">
                    <option value="4-La Unidad si llegó, mal reporte">La Unidad si llegó, mal reporte</option>
                    <option value="4-MQP - Entrega directa al cliente">MQP - Entrega directa al cliente</option>
                    <option value="4-Unidad dentro del Tiempo de Entrega">Unidad dentro del Tiempo de Entrega</option>
                    <option value="4-Unidad ya Entregada al Cliente">Unidad ya Entregada al Cliente</option>
                    <option value="4-Unidad se queda donde el Cliente">Unidad se queda donde el Cliente</option>
                    <option value="4-Se entrega unidad sellada (sellos originales)">Se entrega unidad sellada</option>
                    <option value="4-Se entrega unidad con guía vínculo">Se entrega unidad con guía vínculo</option>
                    <option value="4-Devolución al remitente con guía vínculo">Devolución con guía vínculo</option>
                    <option value="4-Demora por enlace">Demora por enlace</option>
                    <option value="4-Unidad se queda en Terminal de Enlace">Unidad se queda en Terminal de Enlace</option>
                    <option value="4-Pérdida de Etiqueta">Pérdida de Etiqueta</option>
                    <option value="4-Unidad Incautada por autoridad competente">Unidad Incautada por autoridad</option>
                    <option value="4-Unidad aprehendida por autoridad competente">Unidad aprehendida por autoridad</option>
                    <option value="4-Contrabando (Unidad incautada)">Contrabando (Unidad incautada)</option>
                    <option value="4-Unidad no es leída por el Sorter">Unidad no es leída por el Sorter</option>
                  </optgroup>
                  <optgroup label="5 — Checkpoint">
                    <option value="5-Ausencia lectura Checkpoint">Ausencia lectura Checkpoint</option>
                    <option value="5-Lectura checkpoint sin cobertura de cámaras">Lectura checkpoint sin cobertura de cámaras</option>
                  </optgroup>
                  <optgroup label="6-14 — Otras causas">
                    <option value="6-Unidad se queda por Deterioro en el Despacho">Deterioro en el Despacho</option>
                    <option value="7-Unidad en planilla cero o mal leída en despacho">Planilla cero o mal leída</option>
                    <option value="8-Avería en el transporte">Avería en el transporte</option>
                    <option value="9-Cambio de destino">Cambio de destino</option>
                    <option value="10-Cliente recibe y firma, guía se pierde">Cliente recibe y firma, guía se pierde</option>
                    <option value="11-Despacho mal elaborado, anulado o repetido">Despacho mal elaborado</option>
                    <option value="12-Unidad con Dummy mal Asociado">Unidad con Dummy mal Asociado</option>
                    <option value="13-Unidad va en Consolidadora pero no llega">Unidad va en Consolidadora pero no llega</option>
                    <option value="14-Retracto Remitente">Retracto Remitente</option>
                  </optgroup>
                  <optgroup label="15 — Seguridad externa">
                    <option value="15-Atraco en vía pública">Atraco en vía pública</option>
                    <option value="15-Vandalismo">Vandalismo</option>
                    <option value="15-Intrusión en Sede">Intrusión en Sede</option>
                  </optgroup>
                  <optgroup label="16 — Protocolo de seguridad">
                    <option value="16-Descuido, Distracción, Imprudencia">Descuido, Distracción, Imprudencia</option>
                    <option value="16-Entrega en dirección diferente">Entrega en dirección diferente</option>
                    <option value="16-Mercancía al borde del furgón">Mercancía al borde del furgón</option>
                    <option value="16-Mercancía en la cabina">Mercancía en la cabina</option>
                    <option value="16-Mercancía a cuidado de terceros">Mercancía a cuidado de terceros</option>
                    <option value="16-No uso de candado">No uso de candado</option>
                    <option value="16-No uso de caletas para dinero">No uso de caletas para dinero</option>
                    <option value="16-No firma guía destinatario con CC">No firma guía destinatario con CC</option>
                    <option value="16-Móvil sola (Rompen el candado)">Móvil sola (Rompen el candado)</option>
                    <option value="16-No se identifica la unidad por cámaras">No se identifica por cámaras</option>
                  </optgroup>
                  <optgroup label="17+ — Infraestructura y otros">
                    <option value="17-Ausencia de cobertura por CCTV">Ausencia de cobertura por CCTV</option>
                    <option value="17-No se cuenta con grabación de CCTV">No se cuenta con grabación de CCTV</option>
                    <option value="18-Empleado/Aliado deshonesto">Empleado/Aliado deshonesto</option>
                    <option value="20-Cierre de Vías">Cierre de Vías</option>
                    <option value="22-Intrusión">Intrusión</option>
                    <option value="22-Hurto por terceros (Accidente en ruta)">Hurto por terceros (Accidente en ruta)</option>
                    <option value="23-Ubicada en NyS">Ubicada en NyS</option>
                    <option value="23-Se pierde trazabilidad en NyS">Se pierde trazabilidad en NyS</option>
                    <option value="24-Bloqueo de vías">Bloqueo de vías</option>
                    <option value="24-Descuelgue">Descuelgue</option>
                    <option value="25-Se entrega unidad a Control Salvamento">Se entrega unidad a Control Salvamento</option>
                  </optgroup>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Grupo de cierre</label>
                  <select
                    value={ev.grupoCierre ?? ""}
                    onChange={(e) => {
                      const idx = eventos.findIndex((x) => x.id === ev.id);
                      if (idx !== -1) { eventos[idx].grupoCierre = e.target.value || undefined; eventos[idx].subgrupoCierre = undefined; setLocalEventos([...eventos]); }
                    }}
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">Seleccionar grupo...</option>
                    <option value="Hurto">Hurto</option>
                    <option value="Perdida">Pérdida</option>
                    <option value="Solución SG en la Operación">Solución SG en la Operación</option>
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-muted-foreground mb-1 block">Subgrupo de cierre</label>
                  <select
                    value={ev.subgrupoCierre ?? ""}
                    onChange={(e) => {
                      const idx = eventos.findIndex((x) => x.id === ev.id);
                      if (idx !== -1) { eventos[idx].subgrupoCierre = e.target.value || undefined; setLocalEventos([...eventos]); }
                    }}
                    className="w-full text-xs border border-border rounded-lg px-2.5 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                    disabled={!ev.grupoCierre}
                  >
                    <option value="">Seleccionar subgrupo...</option>
                    {ev.grupoCierre === "Hurto" && <>
                      <option value="Hurto Unidad en Distribución">Hurto Unidad en Distribución</option>
                      <option value="Hurto Unidad en Plataforma / Sede">Hurto Unidad en Plataforma / Sede</option>
                      <option value="Hurto unidad en recogida">Hurto unidad en recogida</option>
                      <option value="Hurto Unidad Interna en Distribución">Hurto Unidad Interna en Distribución</option>
                      <option value="Hurto Unidad Interna en Plataforma / Sede">Hurto Unidad Interna en Plataforma / Sede</option>
                      <option value="Hurto Unidad interna en recogida">Hurto Unidad interna en recogida</option>
                    </>}
                    {ev.grupoCierre === "Perdida" && <>
                      <option value="Perdida Unidad en Distribución">Pérdida Unidad en Distribución</option>
                      <option value="Perdida Unidad en Plataforma / Sede">Pérdida Unidad en Plataforma / Sede</option>
                      <option value="Perdida Unidad en recogida">Pérdida Unidad en recogida</option>
                      <option value="Perdida Unidad Interna en Distribución">Pérdida Unidad Interna en Distribución</option>
                      <option value="Perdida Unidad Interna en Plataforma / Sede">Pérdida Unidad Interna en Plataforma / Sede</option>
                      <option value="Perdida Unidad Interna en recogida">Pérdida Unidad Interna en recogida</option>
                    </>}
                    {ev.grupoCierre === "Solución SG en la Operación" && <>
                      <option value="Cliente no Despacha">Cliente no Despacha</option>
                      <option value="Unidad Incautada por Autoridad">Unidad Incautada por Autoridad</option>
                      <option value="Unidad Aprehendida por Autoridad">Unidad Aprehendida por Autoridad</option>
                      <option value="Unidad Interna Ubicada">Unidad Interna Ubicada</option>
                      <option value="Unidad Interna Ubicada (sobrante)">Unidad Interna Ubicada (sobrante)</option>
                      <option value="Unidad Ubicada">Unidad Ubicada</option>
                      <option value="Unidad Ubicada (sobrante)">Unidad Ubicada (sobrante)</option>
                      <option value="Unidad Recuperada">Unidad Recuperada</option>
                      <option value="Unidad Interna Recuperada">Unidad Interna Recuperada</option>
                    </>}
                  </select>
                </div>
              </div>
            </section>
          )}

          {/* Causa raíz y cierre — read-only si cerrado */}
          {ev.categoria === "unidades" && ev.estadoFlujo === "cerrado" && (ev.causaRaiz || ev.grupoCierre) && (
            <section className="bg-muted/40 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">🔎 Investigación y cierre</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {ev.causaRaiz && <div><div className="text-muted-foreground mb-0.5">Causa raíz</div><div className="font-medium">{ev.causaRaiz}</div></div>}
                {ev.grupoCierre && <div><div className="text-muted-foreground mb-0.5">Grupo cierre</div><div className="font-medium">{ev.grupoCierre}</div></div>}
                {ev.subgrupoCierre && <div><div className="text-muted-foreground mb-0.5">Subgrupo cierre</div><div className="font-medium">{ev.subgrupoCierre}</div></div>}
              </div>
            </section>
          )}

          {/* Gestión SG — vista read-only si cerrado */}
          {(ev.categoria === "dineros" || ev.categoria === "unidades") && ev.estadoFlujo === "cerrado" && (ev.intervencionSeguridad || ev.desviacionesIdentificadas || ev.estadoGestionSG) && (
            <section className="bg-muted/40 rounded-xl p-4">
              <h3 className="text-sm font-semibold mb-2 flex items-center gap-1.5">🛡️ Gestión de Seguridad</h3>
              <div className="grid grid-cols-3 gap-3 text-xs">
                {ev.intervencionSeguridad && <div><div className="text-muted-foreground mb-0.5">Intervención</div><div className="font-medium">{ev.intervencionSeguridad}</div></div>}
                {ev.desviacionesIdentificadas && <div><div className="text-muted-foreground mb-0.5">Desviaciones</div><div className="font-medium">{ev.desviacionesIdentificadas}</div></div>}
                {ev.estadoGestionSG && <div><div className="text-muted-foreground mb-0.5">Estado SG</div><div className="font-medium">{ev.estadoGestionSG}</div></div>}
              </div>
            </section>
          )}

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
  dineros: "💰", unidades: "📦", listas_vinculantes: "📋", pqr: "📞", disciplinarios: "⚖️", evidencias: "📸",
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
  const evCerrados = evPersona.filter(e => e.estado === "cerrado").length;

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
            </div>
          </div>
          <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

          {/* Eventos asociados */}
          <div className={`border rounded-xl p-4 ${totalEv >= 5 ? "bg-red-50 border-red-200" : totalEv >= 3 ? "bg-amber-50 border-amber-200" : "bg-muted/40 border-border"}`}>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{totalEv} evento{totalEv !== 1 ? "s" : ""} asociado{totalEv !== 1 ? "s" : ""}</span>
              <div className="flex items-center gap-2 text-xs">
                {evAbiertos > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 border border-blue-200 font-medium">{evAbiertos} abierto{evAbiertos !== 1 ? "s" : ""}</span>}
                {evCerrados > 0 && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200 font-medium">{evCerrados} cerrado{evCerrados !== 1 ? "s" : ""}</span>}
              </div>
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

          {/* CTA resolución sobre persona */}
          {totalEv >= 1 && (
            <div className="border border-amber-300 bg-amber-50 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex-1">
                <p className="text-sm font-semibold text-amber-900">
                  {totalEv === 1
                    ? "Esta persona tiene 1 evento registrado."
                    : `Esta persona tiene ${totalEv} eventos registrados.`}
                </p>
                <p className="text-xs text-amber-700/70 mt-0.5">Tomar una decisión de gestión humana sobre esta persona.</p>
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
                Tomar decisión
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
          <button
            onClick={() => setLesivaOpen(!lesivaOpen)}
            className="w-full text-left px-3 py-2.5 border border-red-200 bg-red-50 rounded-xl hover:bg-red-100 transition-colors"
          >
            <div className="text-xs font-semibold text-red-700">🚫 Registrar Actividad Lesiva</div>
            <div className="text-[10px] text-red-600/70 mt-0.5">Registrar actividad lesiva asociada a esta persona</div>
          </button>

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
                    actividadesLesivas.push({
                      id: `AL-${Date.now()}`,
                      tipoImplicado: persona.tipo === "empleado" ? "empleado" : "aliado",
                      identificacion: persona.cedula,
                      nombre: persona.nombre,
                      personaId: persona.id,
                      categoria: lesivaCat,
                      subcategoria: lesivaSub,
                      observaciones: lesivaObs,
                      fecha: new Date().toISOString().split("T")[0],
                      registradoPor: { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre },
                    });
                    forceUpdate(k => k + 1);
                    toast({ title: "🚫 Actividad Lesiva registrada", description: `${persona.nombre}. Categoría: ${CATEGORIAS_LESIVAS[lesivaCat as keyof typeof CATEGORIAS_LESIVAS]?.label} — ${lesivaSub}` });
                    setLesivaOpen(false);
                    setLesivaCat("");
                    setLesivaSub("");
                    setLesivaObs("");
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Confirmar registro
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
          usuarioNombre: usuarioLogueado.nombre,
          accion: `Cerrado por resolución acumulativa — ${decisionLabel}`,
        });
      }
    });

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
              <h2 className="font-bold text-base">Decisión sobre persona</h2>
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
