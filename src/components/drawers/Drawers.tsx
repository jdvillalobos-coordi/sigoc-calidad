import React, { useState } from "react";
import { eventos, personas, vehiculos, guias, getPersona, getVehiculo, getEventosPorGuia, getEventosRelacionados, estudiosSeguridad, alertasIA, PAISES_REGIONALES } from "@/data/mockData";
import { CategoriaBadge, EstadoBadge, SeveridadBadge, AvatarInicial, formatDate, formatDateTime, formatCurrency, descripcionCorta, categoriaConfig, estadoConfig, EstadoPersonaBadge } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import { X, ChevronDown, ChevronRight } from "lucide-react";
import type { Evento, EstadoEvento } from "@/types";
import { toast } from "@/hooks/use-toast";

// ---- RecordDetail Drawer ----
export function RecordDetailDrawer() {
  const { drawer, cerrarDrawer, abrirPersona, abrirVehiculo, abrirGuia, abrirRegistro, abrirTerminal, setNuevaRegistroAbierto } = useApp();
  const [localEventos, setLocalEventos] = useState(eventos);
  const [nuevaAnotacion, setNuevaAnotacion] = useState("");
  const [tipoAnotacion, setTipoAnotacion] = useState("hallazgo");
  const [complementando, setComplementando] = useState(false);
  const [complementoTexto, setComplementoTexto] = useState("");

  if (drawer.tipo !== "registro" || !drawer.id) return null;

  const ev = localEventos.find((e) => e.id === drawer.id);
  if (!ev) return null;

  const relacionados = getEventosRelacionados(ev.id);

  function cambiarEstado(nuevoEstado: EstadoEvento) {
    const prev = estadoConfig[ev!.estado].label;
    setLocalEventos((lst) =>
      lst.map((e) => e.id === ev!.id ? {
        ...e, estado: nuevoEstado,
        historial: [...e.historial, { id: `h${Date.now()}`, fecha: new Date().toISOString(), usuarioNombre: "Sandra Herrera", accion: `Cambió estado de '${prev}' a '${estadoConfig[nuevoEstado].label}'` }]
      } : e)
    );
    toast({ title: `✅ Estado actualizado a "${estadoConfig[nuevoEstado].label}"` });
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
        <div className="border-b border-border px-6 py-4 flex items-start justify-between gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <CategoriaBadge categoria={ev.categoria} />
              <span className="font-mono text-sm font-bold">{ev.id}</span>
            </div>
            <p className="font-semibold text-base">{ev.tipoEvento}</p>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ev.descripcionHechos}</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={ev.estado}
              onChange={(e) => cambiarEstado(e.target.value as EstadoEvento)}
              className={`text-xs px-2 py-1 rounded-full border font-medium focus:outline-none cursor-pointer ${estadoConfig[ev.estado].color}`}
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
                        <div className="text-xs text-muted-foreground">CC {p.cedula} · {p.cargo}</div>
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
                        <div className="text-xs text-muted-foreground">CC {p.cedula} · {p.cargo}</div>
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
export function Persona360Drawer() {
  const { drawer, cerrarDrawer, abrirRegistro, abrirTerminal } = useApp();
  const [open, setOpen] = useState<Record<string, boolean>>({
    dineros: true, unidades: true, listas: true, evidencias: true,
    pqr: true, disciplinarios: true, estudios: true,
  });

  if (drawer.tipo !== "persona360" || !drawer.id) return null;
  const persona = personas.find((p) => p.id === drawer.id);
  if (!persona) return null;

  const evPersona = eventos.filter((e) =>
    e.personasResponsables.some((pv) => pv.personaId === persona.id) ||
    e.personasParticipantes.some((pv) => pv.personaId === persona.id)
  );
  const evDineros = evPersona.filter((e) => e.categoria === "dineros");
  const evUnidades = evPersona.filter((e) => e.categoria === "unidades");
  const evListas = evPersona.filter((e) => e.categoria === "listas_vinculantes");
  const evEvidencias = evPersona.filter((e) => e.categoria === "proceso_evidencias");
  const evPQR = persona.tipo === "cliente" && persona.nit
    ? eventos.filter((e) => e.categoria === "pqr" && e.nitCliente === persona.nit)
    : evPersona.filter((e) => e.categoria === "pqr");
  const evDisciplinarios = evPersona.filter((e) => e.categoria === "disciplinarios");
  const estudios = estudiosSeguridad.filter((e) => e.personaId === persona.id);

  const totalEv = evPersona.length;
  const riskScore = Math.min(100, totalEv * 15 + (persona.estado === "bloqueado" ? 40 : persona.estado === "en_seguimiento" ? 20 : 0));
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

  function EventosMiniTabla({ evs }: { evs: Evento[] }) {
    return (
      <table className="w-full text-xs">
        <thead>
          <tr className="text-muted-foreground border-b border-border">
            {["ID", "Tipo", "Terminal", "Fecha", "Estado", "Rol"].map((h) => (
              <th key={h} className="text-left py-1.5 font-semibold">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {evs.map((e) => {
            const esResp = e.personasResponsables.some((pv) => pv.personaId === persona.id);
            return (
              <tr key={e.id} onClick={() => abrirRegistro(e.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                <td className="py-2 font-mono">{e.id}</td>
                <td className="py-2 max-w-[120px] truncate">{e.tipoEvento}</td>
                <td className="py-2">{e.terminal}</td>
                <td className="py-2">{e.fecha}</td>
                <td className="py-2"><EstadoBadge estado={e.estado} /></td>
                <td className="py-2 capitalize">{esResp ? "Responsable" : "Participante"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
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
              <div className="text-sm text-muted-foreground">
                {persona.tipo === "cliente" ? `NIT ${persona.nit}` : `CC ${persona.cedula}`} · {persona.cargo} ·{" "}
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
              {totalEv === 0
                ? "Esta persona no aparece en ningún evento. Perfil sin novedad."
                : `Esta persona aparece en ${totalEv} evento${totalEv !== 1 ? "s" : ""} del sistema. ${
                    persona.estado === "en_seguimiento" ? "Se encuentra en cuadro de seguimiento activo."
                    : persona.estado === "bloqueado" ? "Tiene bloqueo activo. Acceso restringido."
                    : "Sin indicadores de riesgo crítico."
                  }`
              }
            </p>
          </div>

          {evDineros.length > 0 && (
            <Section id="dineros" title="💰 Eventos de Dineros" count={evDineros.length} source="SIGO Dineros">
              <EventosMiniTabla evs={evDineros} />
            </Section>
          )}
          {evUnidades.length > 0 && (
            <Section id="unidades" title="📦 Eventos de Unidades" count={evUnidades.length} source="SIGO NyS">
              <EventosMiniTabla evs={evUnidades} />
            </Section>
          )}
          {evListas.length > 0 && (
            <Section id="listas" title="📋 Listas Vinculantes" count={evListas.length} source="Truora / ClickCloud">
              <EventosMiniTabla evs={evListas} />
            </Section>
          )}
          {evEvidencias.length > 0 && (
            <Section id="evidencias" title="📸 Proceso Evidencias" count={evEvidencias.length} source="Módulo Evidencias">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    {["ID", "Tipo", "Resultado IA", "Veredicto", "Fecha"].map((h) => (
                      <th key={h} className="text-left py-1.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evEvidencias.map((e) => (
                    <tr key={e.id} onClick={() => abrirRegistro(e.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                      <td className="py-2 font-mono">{e.id}</td>
                      <td className="py-2 max-w-[100px] truncate">{e.tipoEvento}</td>
                      <td className="py-2">
                        <span className={`px-1.5 py-0.5 rounded-full font-medium text-[11px] ${e.resultadoIA === "cumple" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                          {e.resultadoIA === "cumple" ? "✅ Cumple" : "❌ No cumple"}
                        </span>
                      </td>
                      <td className="py-2 capitalize">{e.veredictoOperador ?? "—"}</td>
                      <td className="py-2">{e.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
          {evPQR.length > 0 && (
            <Section id="pqr" title="📞 PQR asociadas" count={evPQR.length} source="Clientes / Agente CAL">
              <EventosMiniTabla evs={evPQR} />
            </Section>
          )}
          {evDisciplinarios.length > 0 && (
            <Section id="disciplinarios" title="⚖️ Disciplinarios" count={evDisciplinarios.length} source="SuccessFactors / GH">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-muted-foreground border-b border-border">
                    {["ID", "Tipo falta", "Gravedad", "Decisión GH", "Fecha"].map((h) => (
                      <th key={h} className="text-left py-1.5 font-semibold">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {evDisciplinarios.map((e) => (
                    <tr key={e.id} onClick={() => abrirRegistro(e.id)} className="cursor-pointer hover:bg-muted transition-colors border-b border-border last:border-0">
                      <td className="py-2 font-mono">{e.id}</td>
                      <td className="py-2 max-w-[120px] truncate">{e.tipoEvento}</td>
                      <td className="py-2 capitalize">{e.gravedadFalta ?? "—"}</td>
                      <td className="py-2 max-w-[120px] truncate">{e.decisionGH ?? "Sin decisión"}</td>
                      <td className="py-2">{e.fecha}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}
          {/* ── Acciones rápidas ── */}
          <div className="border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">⚡ Acciones rápidas</h3>
            <div className="space-y-2">
              {/* Cuadro de Contacto */}
              {persona.estado !== "en_seguimiento" && persona.estado !== "bloqueado" && (
                <button
                  onClick={() => toast({ title: "🟡 Persona agregada al Cuadro de Contacto", description: `${persona.nombre} ahora está en seguimiento.` })}
                  className="w-full text-left px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-lg hover:bg-amber-100 transition-colors"
                >
                  <div className="text-xs font-semibold text-amber-700">📋 Agregar al Cuadro de Contacto</div>
                  <div className="text-xs text-amber-600/70 mt-0.5">Marcar como persona en seguimiento por sospecha de reincidencia</div>
                </button>
              )}
              {persona.estado === "en_seguimiento" && (
                <div className="px-3 py-2.5 border border-amber-200 bg-amber-50 rounded-lg">
                  <div className="text-xs font-semibold text-amber-700">📋 En Cuadro de Contacto</div>
                  <div className="text-xs text-amber-600/70 mt-0.5">Esta persona está actualmente en seguimiento</div>
                </div>
              )}
              {/* Actividad Lesiva / Bloqueo */}
              {persona.estado !== "bloqueado" && (
                <button
                  onClick={() => toast({ title: "🔴 Actividad Lesiva registrada", description: `${persona.nombre} ha sido bloqueado(a).` })}
                  className="w-full text-left px-3 py-2.5 border border-red-200 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                >
                  <div className="text-xs font-semibold text-red-700">🚫 Registrar Actividad Lesiva (Bloquear)</div>
                  <div className="text-xs text-red-600/70 mt-0.5">Bloquear persona por responsabilidad directa en eventos</div>
                </button>
              )}
              {persona.estado === "bloqueado" && (
                <div className="px-3 py-2.5 border border-red-200 bg-red-50 rounded-lg">
                  <div className="text-xs font-semibold text-red-700">🚫 Persona Bloqueada</div>
                  <div className="text-xs text-red-600/70 mt-0.5">Actividad lesiva activa — acceso restringido</div>
                </div>
              )}
            </div>
          </div>

          {/* ── Decisiones de Gestión Humana ── */}
          <div className="border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">📋 Decisiones de Gestión Humana</h3>
            {evDisciplinarios.filter(e => e.decisionGH).length > 0 && (
              <div className="space-y-2 mb-3">
                {evDisciplinarios.filter(e => e.decisionGH).map(e => (
                  <div key={e.id} className="bg-muted/40 rounded-lg px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold">{e.decisionGH}</span>
                      <span className="text-xs text-muted-foreground">{formatDate(e.fecha)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5">{e.usuarioRegistro} · Evento {e.id}</div>
                  </div>
                ))}
              </div>
            )}
            <div className="space-y-2 pt-2 border-t border-border">
              <select className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring">
                <option value="">Registrar nueva decisión...</option>
                <option value="llamado_verbal">Llamado de atención verbal</option>
                <option value="llamado_escrito">Llamado de atención escrito</option>
                <option value="suspension">Suspensión temporal</option>
                <option value="proceso_disciplinario">Inicio proceso disciplinario</option>
                <option value="desvinculacion">Desvinculación</option>
                <option value="escalamiento">Escalamiento a seguridad</option>
                <option value="sin_accion">Sin acción — caso insuficiente</option>
              </select>
              <textarea
                className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                rows={2}
                placeholder="Observaciones de la decisión..."
              />
              <button
                onClick={() => toast({ title: "✅ Decisión registrada", description: `Decisión de GH registrada para ${persona.nombre}` })}
                className="px-3 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Registrar decisión
              </button>
            </div>
          </div>

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
                    {["Nombre", "Cédula", "Apariciones", "Estado"].map((h) => (
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
