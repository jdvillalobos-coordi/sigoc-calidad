import React, { useState } from "react";
import { registros, personas, vehiculos, guias, getPersona, getVehiculo, getRegistrosPorGuia, getRegistrosRelacionados, estudiosSeguridad } from "@/data/mockData";
import { TipoBadge, EstadoBadge, SeveridadBadge, AvatarInicial, formatDate, formatDateTime, formatCurrency, descripcionCorta, tipoConfig, estadoConfig, EstadoPersonaBadge } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import type { Registro, EstadoRegistro, RegistroFaltante, StepperInvestigacion } from "@/types";
import { toast } from "@/hooks/use-toast";
import { InvestigacionStepper } from "@/components/drawers/InvestigacionStepper";
import type { StepperState } from "@/components/drawers/InvestigacionStepper";

// ── Stepper state helpers ─────────────────────────────────────────────────────

function mkDefaultStepper(): StepperState {
  return {
    etapaActiva: "identificacion",
    etapas: {
      identificacion: { completada: true,  fechaCompletado: new Date().toISOString(), responsableNombre: "Sandra Herrera" },
      investigacion:  { completada: false },
      verificacion:   { completada: false },
      resolucion:     { completada: false },
    },
  };
}

function sigoStepperToLocal(s: StepperInvestigacion): StepperState {
  return {
    etapaActiva: s.etapaActiva,
    etapas: s.etapas as StepperState["etapas"],
    checkpoints: s.checkpoints,
  };
}

// ---- RecordDetail Drawer ----
export function RecordDetailDrawer() {
  const { drawer, cerrarDrawer, abrirPersona, abrirVehiculo, abrirGuia, abrirRegistro, setNuevaRegistroAbierto } = useApp();
  const [editando, setEditando] = useState(false);
  const [localRegistros, setLocalRegistros] = useState(registros);
  const [nuevaAnotacion, setNuevaAnotacion] = useState("");
  const [tipoAnotacion, setTipoAnotacion] = useState("hallazgo_investigacion");
  const [stepperLocalState, setStepperLocalState] = useState<StepperState | null>(null);

  if (drawer.tipo !== "registro" || !drawer.id) return null;

  const reg = localRegistros.find((r) => r.id === drawer.id);
  if (!reg) return null;

  const esFaltanteOPosventa = reg.tipo === "faltante" || reg.tipo === "posventa";
  const faltanteReg = esFaltanteOPosventa && reg.tipo === "faltante" ? (reg as RegistroFaltante) : null;

  // Inicializar stepper desde los datos del registro si no está en estado local
  const initStepper = (): StepperState => {
    if (faltanteReg?.stepper) return sigoStepperToLocal(faltanteReg.stepper);
    return mkDefaultStepper();
  };

  const currentStepper = stepperLocalState ?? initStepper();

  const relacionados = getRegistrosRelacionados(reg.id);
  const guiaNum = "guia" in reg ? (reg as any).guia : null;

  function cambiarEstado(nuevoEstado: EstadoRegistro) {
    const prev = estadoConfig[reg!.estado].label;
    setLocalRegistros((lst) =>
      lst.map((r) => r.id === reg!.id ? { ...r, estado: nuevoEstado, historial: [...r.historial, { id: `h${Date.now()}`, fecha: new Date().toISOString(), usuarioNombre: "Sandra Herrera", accion: `Cambió estado de '${prev}' a '${estadoConfig[nuevoEstado].label}'` }] } : r)
    );
    toast({ title: `✅ Estado actualizado a "${estadoConfig[nuevoEstado].label}"` });
  }

  function agregarAnotacion() {
    if (!nuevaAnotacion.trim()) return;
    setLocalRegistros((lst) =>
      lst.map((r) => r.id === reg!.id ? {
        ...r,
        anotaciones: [...r.anotaciones, { id: `a${Date.now()}`, autorId: "u-sandra", autorNombre: "Sandra Herrera", autorRol: "Coordinadora Nacional de Calidad", fecha: new Date().toISOString(), texto: nuevaAnotacion, tipo: tipoAnotacion as any }]
      } : r)
    );
    setNuevaAnotacion("");
    toast({ title: "✅ Anotación agregada" });
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[60%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <TipoBadge tipo={reg.tipo} />
              <span className="font-mono text-sm font-bold">{reg.id}</span>
            </div>
            <p className="font-semibold text-base">{descripcionCorta(reg)}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={reg.estado}
              onChange={(e) => cambiarEstado(e.target.value as EstadoRegistro)}
              className={`text-xs px-2 py-1 rounded-full border font-medium focus:outline-none cursor-pointer ${estadoConfig[reg.estado].color}`}
            >
              {Object.entries(estadoConfig).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <button onClick={cerrarDrawer} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">

          {/* ── STEPPER DE INVESTIGACIÓN (solo Faltante y Posventa) ── */}
          {esFaltanteOPosventa && (
            <section>
              <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
                <span className="w-1.5 h-4 rounded-full bg-primary inline-block" />
                Flujo de investigación
              </h3>
              <InvestigacionStepper
                stepperState={currentStepper}
                onStepperChange={(s) => setStepperLocalState(s)}
                onCerrarCaso={() => {
                  setLocalRegistros((lst) =>
                    lst.map((r) => r.id === reg!.id ? {
                      ...r,
                      estado: "cerrado" as const,
                      historial: [...r.historial, { id: `h${Date.now()}`, fecha: new Date().toISOString(), usuarioNombre: "Sandra Herrera", accion: "Cerró el caso desde el stepper de resolución" }]
                    } : r)
                  );
                  setStepperLocalState((prev) => prev ? {
                    ...prev,
                    etapas: {
                      ...prev.etapas,
                      resolucion: { ...prev.etapas.resolucion, completada: true, fechaCompletado: new Date().toISOString() }
                    }
                  } : null);
                  toast({ title: "✅ Caso cerrado exitosamente" });
                }}
                onCrearPosventa={() => {
                  setNuevaRegistroAbierto(true);
                  toast({ title: "📋 Abriendo formulario de Posventa..." });
                }}
              />
            </section>
          )}

          {/* Info principal */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Información del registro</h3>
              <button onClick={() => setEditando(!editando)} className="text-xs text-coordinadora-blue hover:underline">
                {editando ? "Cancelar" : "Editar"}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 bg-muted/40 rounded-xl p-4">
              {[
                ["Terminal", reg.terminal],
                ["Fecha", formatDate(reg.fecha)],
                ["Responsable", reg.responsableNombre],
                ["Días abierto", `${reg.diasAbierto} días`],
                ...(guiaNum ? [["Guía", guiaNum]] : []),
                ...(("codigoNovedad" in reg) ? [["Código novedad", (reg as any).codigoNovedad]] : []),
                ...(("tipoEvento" in reg) ? [["Tipo de evento", (reg as any).tipoEvento]] : []),
                ...(("valorRecaudo" in reg) ? [["Valor recaudo", formatCurrency((reg as any).valorRecaudo)]] : []),
                ...(("requerimiento" in reg) ? [["Requerimiento", (reg as any).requerimiento]] : []),
              ].map(([l, v]) => (
                <div key={l}>
                  <div className="text-xs text-muted-foreground mb-0.5">{l}</div>
                  {l === "Guía" ? (
                    <button onClick={() => abrirGuia(v!)} className="text-sm font-medium text-coordinadora-blue font-mono hover:underline">{v}</button>
                  ) : (
                    <div className="text-sm font-medium">{v}</div>
                  )}
                </div>
              ))}
            </div>
            {reg.observaciones && (
              <div className="mt-3 bg-muted/40 rounded-xl p-4">
                <div className="text-xs text-muted-foreground mb-1">Observaciones</div>
                <p className="text-sm">{reg.observaciones}</p>
              </div>
            )}
          </section>

          {/* Personas vinculadas */}
          {reg.personasVinculadas && reg.personasVinculadas.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3">Personas vinculadas ({reg.personasVinculadas.length})</h3>
              <div className="space-y-2">
                {reg.personasVinculadas.map((pv) => {
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
                        <div className="text-xs text-muted-foreground">CC {p.cedula} · {p.cargo}</div>
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                        {pv.rol === "responsable" ? "Responsable" : "Involucrado"}
                      </span>
                      <EstadoPersonaBadge estado={p.estado} />
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* Vehículos vinculados */}
          {reg.vehiculosVinculados && reg.vehiculosVinculados.length > 0 && (
            <section>
              <h3 className="text-sm font-semibold mb-3">Vehículos vinculados</h3>
              <div className="space-y-2">
                {reg.vehiculosVinculados.map((vv) => {
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

          {/* Timeline seguimiento */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Timeline de seguimiento ({reg.anotaciones.length})</h3>
            {reg.anotaciones.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">Sin anotaciones aún.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {[...reg.anotaciones].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((a) => {
                  const tipoIcono: Record<string, string> = {
                    hallazgo_investigacion: "🔍",
                    hallazgo_campo: "👁️",
                    validacion_evidencia: "📋",
                    resolucion: "✅",
                    nota_interna: "📝",
                    hallazgo: "🔍",
                    seguimiento: "📝",
                  };
                  const tipoLabel: Record<string, string> = {
                    hallazgo_investigacion: "Hallazgo de investigación",
                    hallazgo_campo: "Hallazgo de campo",
                    validacion_evidencia: "Validación de evidencia",
                    resolucion: "Resolución",
                    nota_interna: "Nota interna",
                    hallazgo: "Hallazgo",
                    seguimiento: "Seguimiento",
                  };
                  const tipoColor: Record<string, string> = {
                    hallazgo_investigacion: "bg-amber-100 text-amber-700",
                    hallazgo_campo: "bg-blue-100 text-blue-700",
                    validacion_evidencia: "bg-purple-100 text-purple-700",
                    resolucion: "bg-green-100 text-green-700",
                    nota_interna: "bg-gray-100 text-gray-600",
                    hallazgo: "bg-amber-100 text-amber-700",
                    seguimiento: "bg-blue-100 text-blue-700",
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
                  <option value="hallazgo_investigacion">🔍 Hallazgo de investigación</option>
                  <option value="hallazgo_campo">👁️ Hallazgo de campo</option>
                  <option value="validacion_evidencia">📋 Validación de evidencia</option>
                  <option value="resolucion">✅ Resolución</option>
                  <option value="nota_interna">📝 Nota interna</option>
                </select>
                <button onClick={agregarAnotacion} disabled={!nuevaAnotacion.trim()} className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors">
                  Agregar
                </button>
              </div>
            </div>
          </section>

          {/* Historial */}
          <section>
            <h3 className="text-sm font-semibold mb-3">Historial de cambios</h3>
            <div className="space-y-1.5">
              {[...reg.historial].sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map((h) => (
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
            <h3 className="text-sm font-semibold mb-3">Registros relacionados ({relacionados.length})</h3>
            {relacionados.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">No se encontraron registros relacionados.</p>
            ) : (
              <div className="space-y-2">
                {relacionados.map((r) => (
                  <button key={r.id} onClick={() => abrirRegistro(r.id)} className="w-full text-left flex items-center gap-3 p-3 rounded-xl border border-border hover:bg-muted transition-colors">
                    <TipoBadge tipo={r.tipo} />
                    <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                    <span className="text-sm flex-1 truncate">{descripcionCorta(r)}</span>
                    <EstadoBadge estado={r.estado} />
                  </button>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

// ---- Persona 360 ----
export function Persona360Drawer() {
  const { drawer, cerrarDrawer, abrirRegistro } = useApp();
  const [open, setOpen] = useState<Record<string, boolean>>({
    faltantes: true, eventos: true, lesivas: true, estudios: true,
    rce: true, posventa: true, contacto: true, evidencias: true,
  });

  if (drawer.tipo !== "persona360" || !drawer.id) return null;
  const persona = personas.find((p) => p.id === drawer.id);
  if (!persona) return null;

  const regsPersona = registros.filter((r) => r.personasVinculadas?.some((pv) => pv.personaId === persona.id));
  const faltantes  = regsPersona.filter((r) => r.tipo === "faltante");
  const eventos    = regsPersona.filter((r) => r.tipo === "evento");
  const lesivas    = regsPersona.filter((r) => r.tipo === "lesiva");
  const estudios   = estudiosSeguridad.filter((e) => e.personaId === persona.id);

  // RCE vinculados por personasVinculadas
  const rces = registros.filter(
    (r) => r.tipo === "rce" && r.personasVinculadas?.some((pv) => pv.personaId === persona.id)
  );

  // Posventa: por nitCliente (si cliente) O por personasVinculadas
  const posventas = registros.filter((r) => {
    if (r.tipo !== "posventa") return false;
    const rv = r as any;
    if (persona.tipo === "cliente" && persona.nit && rv.nitCliente === persona.nit) return true;
    return r.personasVinculadas?.some((pv) => pv.personaId === persona.id);
  });

  // Cuadro de contacto: por cedula
  const contactos = registros.filter(
    (r) => r.tipo === "contacto" && (r as any).cedula === persona.cedula
  );

  // Evidencias: guías de posventas del cliente → evidencias de esas guías
  const guiasCliente = posventas.map((r) => (r as any).guia).filter(Boolean) as string[];
  const evidencias = persona.tipo === "cliente" && guiasCliente.length > 0
    ? registros.filter((r) => r.tipo === "evidencia" && guiasCliente.includes((r as any).guia))
    : [];

  const totalReg = regsPersona.length;
  const riskScore = Math.min(100, totalReg * 15 + (persona.estado === "bloqueado" ? 40 : persona.estado === "en_seguimiento" ? 20 : 0));
  const riskColor = riskScore >= 70 ? "bg-red-500" : riskScore >= 40 ? "bg-amber-500" : riskScore >= 20 ? "bg-yellow-400" : "bg-green-500";
  const riskLabel = riskScore >= 70 ? "Alto" : riskScore >= 40 ? "Medio" : riskScore >= 20 ? "Bajo" : "Sin riesgo";

  function Section({ id, title, count, source, children }: { id: string; title: string; count: number; source?: string; children: React.ReactNode }) {
    return (
      <div className="border border-border rounded-xl overflow-hidden">
        <button
          className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted transition-colors"
          onClick={() => setOpen((s) => ({ ...s, [id]: !s[id] }))}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-semibold text-sm">{title}</span>
            {source && <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded truncate hidden sm:block">Fuente: {source}</span>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-muted-foreground">{count}</span>
            {open[id] ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
          </div>
        </button>
        {open[id] && <div className="p-4">{children}</div>}
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={cerrarDrawer} />
      <div className="fixed right-0 top-0 h-full w-[60%] bg-card shadow-drawer z-50 flex flex-col animate-slide-in-right overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex items-start justify-between flex-shrink-0">
          <div className="flex items-center gap-4">
            <AvatarInicial nombre={persona.nombre} size="lg" />
            <div>
              <h2 className="font-bold text-lg">{persona.nombre}</h2>
              <div className="text-sm text-muted-foreground">{persona.tipo === "cliente" ? `NIT ${persona.nit}` : `CC ${persona.cedula}`} · {persona.cargo} · {persona.terminal}</div>
              <div className="mt-1">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${persona.estado === "bloqueado" ? "bg-red-100 text-red-700 border border-red-200" : persona.estado === "en_seguimiento" ? "bg-amber-100 text-amber-700 border border-amber-200" : "bg-green-100 text-green-700 border border-green-200"}`}>
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
          {/* IA risk */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-semibold">🤖 Análisis de riesgo IA</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full text-white ${riskColor}`}>{riskLabel} ({riskScore}/100)</span>
            </div>
            <div className="w-full h-2 bg-blue-100 rounded-full overflow-hidden mb-3">
              <div className={`h-full rounded-full transition-all ${riskColor}`} style={{ width: `${riskScore}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {totalReg === 0
                ? "Esta persona no aparece en ningún evento o registro. Perfil sin novedad."
                : `Esta persona aparece en ${totalReg} registro${totalReg !== 1 ? "s" : ""} del sistema. ${persona.estado === "en_seguimiento" ? "Se encuentra en cuadro de contacto activo." : persona.estado === "bloqueado" ? "Tiene bloqueo activo. Acceso a operaciones restringido." : "Sin indicadores de riesgo crítico."}`}
            </p>
          </div>

          {/* ── Faltantes ── */}
          {faltantes.length > 0 && (
            <Section id="faltantes" title="🔵 Faltantes asociados" count={faltantes.length}>
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground border-b border-border">{["ID", "Guía", "Terminal", "Fecha", "Estado", "Rol"].map((h) => <th key={h} className="text-left py-1.5 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{faltantes.map((r) => {
                  const pv = r.personasVinculadas?.find((pv) => pv.personaId === persona.id);
                  return (
                    <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                      <td className="py-2 font-mono">{r.id}</td>
                      <td className="py-2 font-mono">{(r as any).guia}</td>
                      <td className="py-2">{r.terminal}</td>
                      <td className="py-2">{r.fecha}</td>
                      <td className="py-2"><EstadoBadge estado={r.estado} /></td>
                      <td className="py-2 capitalize">{pv?.rol}</td>
                    </tr>
                  );
                })}</tbody>
              </table>
            </Section>
          )}

          {/* ── Eventos ── */}
          {eventos.length > 0 && (
            <Section id="eventos" title="🔴 Eventos asociados" count={eventos.length}>
              <table className="w-full text-xs">
                <thead><tr className="text-muted-foreground border-b border-border">{["ID", "Tipo", "Terminal", "Fecha", "Estado"].map((h) => <th key={h} className="text-left py-1.5 font-semibold">{h}</th>)}</tr></thead>
                <tbody>{eventos.map((r) => (
                  <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                    <td className="py-2 font-mono">{r.id}</td>
                    <td className="py-2">{(r as any).tipoEvento}</td>
                    <td className="py-2">{r.terminal}</td>
                    <td className="py-2">{r.fecha}</td>
                    <td className="py-2"><EstadoBadge estado={r.estado} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </Section>
          )}

          {/* ── Lesivas ── */}
          {lesivas.length > 0 && (
            <Section id="lesivas" title="⚫ Actividades lesivas" count={lesivas.length}>
              {lesivas.map((r) => (
                <div key={r.id} className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2 last:mb-0">
                  <div className="text-xs font-semibold text-red-700 mb-1">{(r as any).motivoBloqueo}</div>
                  <div className="text-xs text-muted-foreground">Fecha bloqueo: {(r as any).fechaBloqueo} · Caso: <button onClick={() => abrirRegistro(r.id)} className="text-coordinadora-blue underline">{r.id}</button></div>
                </div>
              ))}
            </Section>
          )}

          {/* ── Estudios de seguridad ── */}
          {estudios.length > 0 && (
            <Section id="estudios" title="🔎 Estudios de seguridad" count={estudios.length}>
              {estudios.map((e) => (
                <div key={e.id} className={`border rounded-lg p-3 mb-2 last:mb-0 ${e.resultado === "hallazgos_encontrados" ? "bg-red-50 border-red-200" : "bg-green-50 border-green-200"}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold">{e.proveedor}</span>
                    <span className="text-xs text-muted-foreground">{e.fecha}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${e.resultado === "hallazgos_encontrados" ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"}`}>
                      {e.resultado === "hallazgos_encontrados" ? "⚠️ Hallazgos encontrados" : "✅ Sin hallazgos"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{e.observaciones}</p>
                </div>
              ))}
            </Section>
          )}

          {/* ── RCE asociados ── */}
          {rces.length > 0 && (
            <Section id="rce" title="🟢 RCE asociados" count={rces.length} source="Bitácora Matriz RCE">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    {["Guía", "Valor recaudo", "Forma pago", "Estado recaudo", "Terminal"].map((h) => (
                      <th key={h} className="text-left py-1.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rces.map((r) => {
                    const rv = r as any;
                    const estadoColor = rv.estadoRecaudo === "pagado"
                      ? "bg-green-100 text-green-700"
                      : rv.estadoRecaudo === "en_proceso"
                      ? "bg-amber-100 text-amber-700"
                      : "bg-red-100 text-red-700";
                    return (
                      <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                        <td className="py-2 font-mono">{rv.guia ?? "—"}</td>
                        <td className="py-2">{formatCurrency(rv.valorRecaudo)}</td>
                        <td className="py-2">{rv.formaPago}</td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded-full font-medium text-[11px] ${estadoColor}`}>
                            {rv.estadoRecaudo === "pagado" ? "Pagado" : rv.estadoRecaudo === "en_proceso" ? "En proceso" : "No pagado"}
                          </span>
                        </td>
                        <td className="py-2">{r.terminal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Solicitudes posventa ── */}
          {posventas.length > 0 && (
            <Section id="posventa" title="🟣 Solicitudes posventa" count={posventas.length} source="AppSheet Solicitudes Posventa">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    {["Guía", "Requerimiento", "Fecha", "Estado"].map((h) => (
                      <th key={h} className="text-left py-1.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {posventas.map((r) => {
                    const rv = r as any;
                    return (
                      <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                        <td className="py-2 font-mono">{rv.guia ?? "—"}</td>
                        <td className="py-2 max-w-[160px] truncate">{rv.requerimiento}</td>
                        <td className="py-2">{r.fecha}</td>
                        <td className="py-2"><EstadoBadge estado={r.estado} /></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          )}

          {/* ── Cuadro de contacto ── */}
          {contactos.length > 0 && (
            <Section id="contacto" title="🟡 Cuadro de contacto" count={contactos.length} source="Bitácora Cuadro de Contacto">
              <div className="space-y-3">
                {contactos.map((r) => {
                  const rv = r as any;
                  const diasSeguimiento = Math.floor((new Date().getTime() - new Date(r.fecha).getTime()) / (1000 * 60 * 60 * 24));
                  return (
                    <button
                      key={r.id}
                      onClick={() => abrirRegistro(r.id)}
                      className="w-full text-left bg-amber-50 border border-amber-200 rounded-lg p-3 hover:bg-amber-100 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2 mb-1.5">
                        <span className="text-xs font-semibold text-amber-800">{rv.motivoSeguimiento}</span>
                        <EstadoBadge estado={r.estado} />
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                        <span>📅 Desde {r.fecha}</span>
                        <span>⏱ {diasSeguimiento} días en seguimiento</span>
                        <span className="font-mono text-amber-700">{r.id}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Section>
          )}

          {/* ── Evidencias ── */}
          {evidencias.length > 0 && (
            <Section id="evidencias" title="🟠 Evidencias" count={evidencias.length} source="Evidencias - Validación IA">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    {["Guía", "Tipo evidencia", "Resultado IA", "Fecha"].map((h) => (
                      <th key={h} className="text-left py-1.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evidencias.map((r) => {
                    const rv = r as any;
                    return (
                      <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                        <td className="py-2 font-mono">{rv.guia ?? "—"}</td>
                        <td className="py-2">{rv.tipoEvidencia}</td>
                        <td className="py-2">
                          <span className={`px-1.5 py-0.5 rounded-full font-medium text-[11px] ${rv.resultadoIA === "cumple" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                            {rv.resultadoIA === "cumple" ? "✅ Cumple" : "❌ No cumple"}
                          </span>
                        </td>
                        <td className="py-2">{r.fecha}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

// ---- Vehículo 360 ----
export function Vehiculo360Drawer() {
  const { drawer, cerrarDrawer, abrirPersona, abrirRegistro } = useApp();
  if (drawer.tipo !== "vehiculo360" || !drawer.id) return null;
  const vehiculo = vehiculos.find((v) => v.id === drawer.id);
  if (!vehiculo) return null;
  const conductor = vehiculo.conductorId ? personas.find((p) => p.id === vehiculo.conductorId) : null;
  const regsV = registros.filter((r) => r.vehiculosVinculados?.some((vv) => vv.vehiculoId === vehiculo.id));
  const eventos = regsV.filter((r) => r.tipo === "evento");
  const lesivas = regsV.filter((r) => r.tipo === "lesiva");
  const rutas = [...new Set(regsV.flatMap((r) => r.vehiculosVinculados?.filter((vv) => vv.vehiculoId === vehiculo.id && vv.ruta).map((vv) => vv.ruta!) || []))];

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
          {/* IA */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="font-semibold text-sm mb-2">🤖 Análisis de riesgo IA</div>
            <p className="text-xs text-muted-foreground">
              {regsV.length === 0 ? "Vehículo sin eventos asociados. Perfil limpio." :
                `Vehículo vinculado a ${regsV.length} registro${regsV.length !== 1 ? "s" : ""}. ${eventos.length > 1 ? `Patrón detectado: ${eventos.length} eventos en rutas diferentes, con conductores distintos. El riesgo podría estar asociado a la ruta, no al conductor.` : "Sin patrones críticos detectados."}`}
            </p>
          </div>

          {eventos.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 font-semibold text-sm">Eventos asociados ({eventos.length})</div>
              <table className="w-full text-xs p-4">
                <thead className="bg-muted/20"><tr>{["ID", "Tipo evento", "Ruta", "Fecha", "Estado"].map((h) => <th key={h} className="text-left px-4 py-2 font-semibold text-muted-foreground">{h}</th>)}</tr></thead>
                <tbody className="divide-y divide-border">
                  {eventos.map((r) => {
                    const vv = r.vehiculosVinculados?.find((vv) => vv.vehiculoId === vehiculo.id);
                    return <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="cursor-pointer hover:bg-muted transition-colors">
                      <td className="px-4 py-2.5 font-mono">{r.id}</td>
                      <td className="px-4 py-2.5">{(r as any).tipoEvento}</td>
                      <td className="px-4 py-2.5">{vv?.ruta || "—"}</td>
                      <td className="px-4 py-2.5">{r.fecha}</td>
                      <td className="px-4 py-2.5"><EstadoBadge estado={r.estado} /></td>
                    </tr>;
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
                  const cnt = regsV.filter((r) => r.vehiculosVinculados?.some((vv) => vv.vehiculoId === vehiculo.id && vv.ruta === ruta)).length;
                  return <div key={ruta} className="flex items-center justify-between text-sm bg-muted/40 rounded-lg px-3 py-2">
                    <span>📍 {ruta}</span>
                    <span className="text-xs text-muted-foreground">{cnt} vez{cnt !== 1 ? "es" : ""}</span>
                  </div>;
                })}
              </div>
            </div>
          )}

          {lesivas.length > 0 && (
            <div className="border border-red-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-red-50 font-semibold text-sm text-red-700">Actividades lesivas</div>
              {lesivas.map((r) => (
                <div key={r.id} className="px-4 py-3 text-sm">
                  <div className="font-medium text-red-700">{(r as any).motivoBloqueo}</div>
                  <div className="text-xs text-muted-foreground mt-1">Fecha: {(r as any).fechaBloqueo}</div>
                </div>
              ))}
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
  const regsGuia = getRegistrosPorGuia(guia.numero);

  const timeline = regsGuia.flatMap((r) => [
    { fecha: r.fecha, texto: `${tipoConfig[r.tipo].label} registrado (${r.id})`, registroId: r.id },
    ...r.anotaciones.map((a) => ({ fecha: a.fecha.split("T")[0], texto: `Anotación de ${a.autorNombre} — ${a.texto.slice(0, 60)}...`, registroId: r.id })),
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
          {/* Datos guía */}
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

          {/* Registros */}
          {regsGuia.length > 0 && (
            <div className="border border-border rounded-xl overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 font-semibold text-sm">Registros asociados ({regsGuia.length})</div>
              <div className="divide-y divide-border">
                {regsGuia.map((r) => (
                  <button key={r.id} onClick={() => abrirRegistro(r.id)} className="w-full text-left px-4 py-3 hover:bg-muted transition-colors flex items-center gap-3">
                    <TipoBadge tipo={r.tipo} />
                    <span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                    <span className="text-sm flex-1 truncate">{descripcionCorta(r)}</span>
                    <EstadoBadge estado={r.estado} />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div className="border border-border rounded-xl p-4">
              <div className="font-semibold text-sm mb-3">Timeline de la guía</div>
              <div className="relative pl-4 space-y-3">
                <div className="absolute left-1 top-2 bottom-2 w-0.5 bg-border" />
                {timeline.map((item, i) => (
                  <button key={i} onClick={() => abrirRegistro(item.registroId)} className="w-full text-left flex items-start gap-3 group">
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

          {regsGuia.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-4xl mb-2">📦</p>
              <p className="text-sm">No se encontraron registros asociados a esta guía.</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
