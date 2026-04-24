import React, { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, User, FileText } from "lucide-react";
import { evidencias, usuarioLogueado, eventos, getPersonaPorCedula } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { formatDate } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";
import type { Evidencia, Evento } from "@/types";
import {
  contarCargaAsignacion,
  crearOperadoresAsignacion,
  cumpleFiltroAsignacion,
  labelFiltroAsignacion,
  type FiltroAsignacionTrabajo,
  type OperadorAsignacion,
} from "@/lib/asignacion-trabajo";

type FiltroRevision = "todos" | "pendientes" | "revisados";
type FiltroResultado = "todos" | "cumple" | "no_cumple";
type FiltroTipo = "todos" | "ia" | "entrega";

// ── Badges ──────────────────────────────────────────────────────────────────

function ResultadoBadge({ resultado }: { resultado: "cumple" | "no_cumple" }) {
  return resultado === "cumple" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 whitespace-nowrap">
      Cumple
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200 whitespace-nowrap">
      No cumple
    </span>
  );
}

function VeredictoTag({ v }: { v: Evidencia["veredictoOperador"] }) {
  if (!v) return null;
  const map: Record<string, string> = {
    confirma:        "bg-green-50 text-green-700 border-green-200",
    falso_negativo:  "bg-amber-50 text-amber-700 border-amber-200",
    falso_positivo:  "bg-red-50 text-red-700 border-red-200",
    cumple:          "bg-green-50 text-green-700 border-green-200",
    no_cumple:       "bg-red-50 text-red-700 border-red-200",
  };
  const label: Record<string, string> = {
    confirma:       "Confirmado",
    falso_negativo: "Falso negativo",
    falso_positivo: "Falso positivo",
    cumple:         "Cumple",
    no_cumple:      "No cumple",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border whitespace-nowrap ${map[v] ?? ""}`}>
      {label[v] ?? v}
    </span>
  );
}

function TipoBadge({ tipo }: { tipo: "ia" | "entrega" }) {
  return tipo === "ia" ? (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200 whitespace-nowrap">
      IA
    </span>
  ) : (
    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-100 text-sky-700 border border-sky-200 whitespace-nowrap">
      Entrega
    </span>
  );
}

// ── Row ──────────────────────────────────────────────────────────────────────

function EvidenciaRow({
  ev,
  onUpdate,
  selected,
  onToggleSelected,
}: {
  ev: Evidencia;
  onUpdate: () => void;
  selected: boolean;
  onToggleSelected: () => void;
}) {
  const { abrirGuia, abrirRegistro, bumpData } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [veredicto, setVeredicto] = useState(ev.veredictoOperador ?? "");
  const [justificacion, setJustificacion] = useState(ev.justificacionOperador ?? "");
  const [guardado, setGuardado] = useState(!!ev.veredictoOperador);
  const [eventoGeneradoId, setEventoGeneradoId] = useState<string | null>(null);

  const esMia = ev.asignadoA?.id === usuarioLogueado.id;
  const sinAsignar = !ev.asignadoA;
  const deOtro = !!ev.asignadoA && !esMia;
  const seleccionable = !ev.veredictoOperador;

  // Genera evento si hay error de operador:
  // - tipo "ia": falso_positivo  O  (confirma + resultadoIA === "no_cumple")
  // - tipo "entrega": no_cumple
  const generaEvento = ev.tipo === "ia"
    ? (veredicto === "falso_positivo" || (veredicto === "confirma" && ev.resultadoIA === "no_cumple"))
    : veredicto === "no_cumple";

  function liberar(e: React.MouseEvent) {
    e.stopPropagation();
    ev.asignadoA = undefined;
    ev.fechaAsignacion = undefined;
    ev.asignadoPor = { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre };
    onUpdate();
  }

  function handleExpand() {
    if (deOtro) return;
    if (sinAsignar && !ev.veredictoOperador) {
      toast({ title: "Asigna la evidencia antes de revisarla", description: "Selecciona la evidencia y usa Tomar seleccionadas o Asignar a..." });
      return;
    }
    setExpanded(v => !v);
  }

  function guardar() {
    if (!veredicto) return;
    setGuardado(true);

    ev.veredictoOperador = veredicto as Evidencia["veredictoOperador"];
    ev.justificacionOperador = justificacion || undefined;
    ev.revisadoPor = usuarioLogueado.nombre;
    ev.fechaRevision = new Date().toISOString().split("T")[0];

    if (generaEvento && !eventoGeneradoId) {
      const id = `EV-EVI-${Date.now()}`;
      const hoy = new Date().toISOString().split("T")[0];

      const personasResp: Evento["personasResponsables"] = [];
      if (ev.operadorCedula) {
        const persona = getPersonaPorCedula(ev.operadorCedula);
        personasResp.push({
          personaId: persona?.id ?? ev.operadorCedula,
          nombre: ev.operadorNombre ?? "Desconocido",
          cedula: ev.operadorCedula,
          cargo: ev.operadorCargo ?? "",
          rol: "responsable",
        });
      }

      const nuevoEvento: Evento = {
        id,
        estado: "cerrado",
        categoria: "evidencias",
        tipoEvento: "Evidencia de entrega inválida",
        tipoEntidad: "empleado",
        fecha: hoy,
        terminal: ev.terminal,
        ciudad: ev.terminal,
        guias: [ev.guia],
        personasResponsables: personasResp,
        personasParticipantes: [],
        vehiculosVinculados: [],
        descripcionHechos: `Error del operador en evidencia de ${ev.tipo === "entrega" ? "entrega" : "registro IA"}. Guía ${ev.guia}, terminal ${ev.terminal}.`,
        resultadoIA: ev.resultadoIA,
        veredictoOperador: ev.tipo === "entrega" ? "falso_positivo" : (veredicto as "falso_positivo" | "confirma"),
        justificacionOperador: justificacion || undefined,
        estadoFlujo: "cerrado",
        asignadoA: {
          id: usuarioLogueado.id,
          nombre: usuarioLogueado.nombre,
          cargo: usuarioLogueado.cargo,
        },
        usuarioRegistro: usuarioLogueado.id,
        perfilUsuario: usuarioLogueado.cargo,
        terminalUsuario: usuarioLogueado.terminal,
        fechaRegistro: hoy,
        anotaciones: [],
        historial: [
          { id: `H-${Date.now()}`, fecha: hoy, usuarioNombre: usuarioLogueado.nombre, accion: "Evento creado automáticamente desde Evidencias" },
          { id: `H-${Date.now() + 1}`, fecha: hoy, usuarioNombre: usuarioLogueado.nombre, accion: "Cerrado automáticamente — error de operador confirmado" },
        ],
        diasAbierto: 0,
      };

      eventos.unshift(nuevoEvento);
      setEventoGeneradoId(id);
      bumpData();
      toast({ title: `📸 Evento ${id} creado`, description: `Error de operador confirmado — ${ev.operadorNombre ?? "Operador"}` });
    } else {
      bumpData();
      toast({ title: "✅ Veredicto guardado", description: `Evidencia ${ev.id} revisada.` });
    }

    setExpanded(false);
  }

  // Resultado a mostrar en la columna de tabla
  const resultadoCol: "cumple" | "no_cumple" | null =
    ev.tipo === "ia" ? (ev.resultadoIA ?? null) : null;

  return (
    <div className={`border-b border-border last:border-0 ${deOtro ? "opacity-60" : ""}`}>
      {/* Fila principal */}
      <button
        className={`w-full text-left px-4 py-3 transition-colors grid grid-cols-[28px_minmax(180px,1.4fr)_72px_112px_150px_128px_132px_24px] gap-3 items-center ${deOtro ? "cursor-default" : "hover:bg-muted/40"}`}
        onClick={handleExpand}
      >
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selected}
            disabled={!seleccionable}
            onChange={onToggleSelected}
            className="accent-primary disabled:opacity-30"
            aria-label={`Seleccionar evidencia ${ev.id}`}
          />
        </div>

        {/* Guía / terminal */}
        <div>
          <span
            role="link"
            tabIndex={0}
            className="text-xs font-mono text-primary hover:underline cursor-pointer"
            onClick={(e) => { e.stopPropagation(); abrirGuia(ev.guia); }}
            onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); abrirGuia(ev.guia); } }}
          >
            {ev.guia}
          </span>
          <span className="ml-2 text-xs text-muted-foreground">{ev.terminal}</span>
        </div>

        {/* Tipo */}
        <div className="flex justify-center">
          <TipoBadge tipo={ev.tipo} />
        </div>

        {/* Resultado (IA o —) */}
        <div className="flex justify-center">
          {resultadoCol ? (
            <ResultadoBadge resultado={resultadoCol} />
          ) : (
            <span className="text-xs text-muted-foreground">—</span>
          )}
        </div>

        {/* Asignada a */}
        <div className="flex justify-center">
          {ev.asignadoA ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                {ev.asignadoA.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <span className="text-[11px] text-foreground whitespace-nowrap">{ev.asignadoA.nombre.split(" ").slice(0, 2).join(" ")}</span>
            </div>
          ) : ev.revisadoPor ? (
            <div className="flex items-center gap-1.5">
              <div className="w-5 h-5 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                {ev.revisadoPor.split(" ").map(n => n[0]).slice(0, 2).join("")}
              </div>
              <span className="text-[11px] text-foreground whitespace-nowrap">{ev.revisadoPor.split(" ").slice(0, 2).join(" ")}</span>
            </div>
          ) : !ev.veredictoOperador ? (
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border text-amber-800 bg-amber-50 border-amber-200 whitespace-nowrap">
              Sin asignar
            </span>
          ) : (
            <span className="text-[11px] text-muted-foreground">—</span>
          )}
        </div>

        {/* Estado revisión */}
        <div className="flex justify-center">
          {ev.veredictoOperador
            ? <VeredictoTag v={ev.veredictoOperador} />
            : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200 whitespace-nowrap">Pendiente</span>
          }
        </div>

        {/* Fecha */}
        <span className="text-xs text-muted-foreground whitespace-nowrap text-right">{formatDate(ev.fecha)}</span>

        {deOtro
          ? <span className="w-4" />
          : expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />
        }
      </button>

      {/* Panel expandido */}
      {expanded && (
        <div className="px-4 pb-4 bg-muted/20 border-t border-border">
          <div className="pt-4 grid grid-cols-2 gap-4">
            {/* Izq: fotos + operador + metadata */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Fotografías de la evidencia</p>
              {ev.fotosUrls && ev.fotosUrls.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {ev.fotosUrls.map((url, i) => (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-background hover:bg-muted/50 transition-colors group"
                    >
                      <Camera className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-xs text-primary group-hover:underline truncate flex-1">
                        Foto {i + 1} — Evidencia de entrega
                      </span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                    </a>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic mb-3">Sin fotografías registradas</p>
              )}

              <div className="bg-muted/30 rounded-lg px-3 py-2.5 border border-border">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Operador que tomó la foto
                </p>
                {ev.operadorNombre ? (
                  <div className="space-y-0.5">
                    <div className="text-xs font-medium">{ev.operadorNombre}</div>
                    <div className="text-xs text-muted-foreground">{ev.operadorCargo} · ID {ev.operadorCedula}</div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground italic">Sin información del operador</p>
                )}
              </div>

              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div><span className="font-medium">Guía:</span> {ev.guia}</div>
                <div><span className="font-medium">Tipo:</span> {ev.tipo === "ia" ? "Revisión IA" : "Entrega rutinaria"}</div>
                <div><span className="font-medium">Fecha:</span> {formatDate(ev.fecha)}</div>
                {ev.asignadoA && <div><span className="font-medium">Asignada a:</span> {ev.asignadoA.nombre}</div>}
                {ev.revisadoPor && <div><span className="font-medium">Revisado por:</span> {ev.revisadoPor}</div>}
              </div>
              {esMia && !ev.veredictoOperador && (
                <button onClick={liberar} className="mt-2 text-[10px] text-red-500 hover:underline">Liberar evidencia</button>
              )}
            </div>

            {/* Der: panel de veredicto (adapta según tipo) */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">
                {ev.tipo === "ia" ? "Tu veredicto — ¿la IA clasificó bien?" : "Tu veredicto"}
              </p>

              {guardado ? (
                <div className="space-y-2">
                  <VeredictoTag v={veredicto as Evidencia["veredictoOperador"]} />
                  {justificacion && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{justificacion}"</p>
                  )}
                  <button className="text-xs text-primary hover:underline" onClick={() => setGuardado(false)}>
                    Editar veredicto
                  </button>
                </div>
              ) : ev.tipo === "ia" ? (
                /* ── Panel IA: 3 opciones ── */
                <div className="space-y-2">
                  <button
                    onClick={() => setVeredicto("confirma")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${veredicto === "confirma" ? "bg-green-600 text-white border-green-600" : "border-border hover:bg-green-50 hover:border-green-200"}`}
                  >
                    <div className="text-xs font-medium">✅ Confirmo — La IA clasificó bien</div>
                    <div className={`text-xs mt-0.5 ${veredicto === "confirma" ? "text-white/70" : "text-muted-foreground"}`}>
                      {ev.resultadoIA === "cumple"
                        ? "La foto es válida y corresponde a una entrega real."
                        : "La foto efectivamente no es válida. El caso debe escalarse."}
                    </div>
                  </button>
                  <button
                    onClick={() => setVeredicto("falso_negativo")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${veredicto === "falso_negativo" ? "bg-amber-500 text-white border-amber-500" : "border-border hover:bg-amber-50 hover:border-amber-200"}`}
                  >
                    <div className="text-xs font-medium">⚠️ Falso negativo — La IA rechazó una foto válida</div>
                    <div className={`text-xs mt-0.5 ${veredicto === "falso_negativo" ? "text-white/80" : "text-muted-foreground"}`}>
                      La foto sí corresponde a la entrega, pero la IA la rechazó por error del modelo.
                    </div>
                  </button>
                  <button
                    onClick={() => setVeredicto("falso_positivo")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${veredicto === "falso_positivo" ? "bg-red-600 text-white border-red-600" : "border-border hover:bg-red-50 hover:border-red-200"}`}
                  >
                    <div className="text-xs font-medium">🚫 La foto no cumple — Error del operador</div>
                    <div className={`text-xs mt-0.5 ${veredicto === "falso_positivo" ? "text-white/80" : "text-muted-foreground"}`}>
                      La foto no corresponde a la evidencia; el operador tomó una foto incorrecta.
                    </div>
                  </button>

                  {(veredicto === "falso_negativo" || veredicto === "falso_positivo") && (
                    <textarea
                      className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none mt-1"
                      rows={2}
                      placeholder="Justificación obligatoria..."
                      value={justificacion}
                      onChange={(e) => setJustificacion(e.target.value)}
                    />
                  )}

                  <button
                    onClick={guardar}
                    disabled={!veredicto || ((veredicto === "falso_negativo" || veredicto === "falso_positivo") && !justificacion)}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Guardar veredicto
                  </button>
                </div>
              ) : (
                /* ── Panel Entrega: 2 opciones simples ── */
                <div className="space-y-2">
                  <button
                    onClick={() => setVeredicto("cumple")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${veredicto === "cumple" ? "bg-green-600 text-white border-green-600" : "border-border hover:bg-green-50 hover:border-green-200"}`}
                  >
                    <div className="text-xs font-medium">✅ Cumple — La evidencia de entrega es correcta</div>
                    <div className={`text-xs mt-0.5 ${veredicto === "cumple" ? "text-white/70" : "text-muted-foreground"}`}>
                      La foto corresponde correctamente a la entrega registrada.
                    </div>
                  </button>
                  <button
                    onClick={() => setVeredicto("no_cumple")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${veredicto === "no_cumple" ? "bg-red-600 text-white border-red-600" : "border-border hover:bg-red-50 hover:border-red-200"}`}
                  >
                    <div className="text-xs font-medium">🚫 No cumple — La evidencia no es válida</div>
                    <div className={`text-xs mt-0.5 ${veredicto === "no_cumple" ? "text-white/80" : "text-muted-foreground"}`}>
                      La foto no corresponde a la entrega; se generará un evento automáticamente.
                    </div>
                  </button>

                  {veredicto === "no_cumple" && (
                    <textarea
                      className="w-full border border-border rounded-lg px-3 py-2 text-xs bg-background focus:outline-none focus:ring-2 focus:ring-ring resize-none mt-1"
                      rows={2}
                      placeholder="Justificación (opcional)..."
                      value={justificacion}
                      onChange={(e) => setJustificacion(e.target.value)}
                    />
                  )}

                  <button
                    onClick={guardar}
                    disabled={!veredicto}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg text-xs font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  >
                    Guardar veredicto
                  </button>
                </div>
              )}

              {/* Banner aviso genera evento */}
              {generaEvento && !guardado && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                      Al guardar se creará un evento automáticamente vinculado al operador.
                    </p>
                  </div>
                </div>
              )}
              {eventoGeneradoId && (
                <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <FileText className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs text-green-700 font-medium">Evento {eventoGeneradoId} creado automáticamente.</p>
                      <button className="text-xs text-primary hover:underline mt-1" onClick={() => abrirRegistro(eventoGeneradoId)}>
                        Abrir evento →
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Panel principal ──────────────────────────────────────────────────────────

function resultadoRevision(ev: Evidencia): "cumple" | "no_cumple" | undefined {
  if (ev.tipo === "ia") return ev.resultadoIA;
  if (ev.veredictoOperador === "cumple") return "cumple";
  if (ev.veredictoOperador === "no_cumple") return "no_cumple";
  return undefined;
}

export function EvidenciasPanel({ filtroTerminalExt, fechaDesde, fechaHasta }: { filtroTerminalExt?: string; fechaDesde?: string; fechaHasta?: string }) {
  const { bumpData } = useApp();
  const [filtroRevision, setFiltroRevision]     = useState<FiltroRevision>("todos");
  const [filtroResultado, setFiltroResultado]   = useState<FiltroResultado>("todos");
  const [filtroTipo, setFiltroTipo]             = useState<FiltroTipo>("todos");
  const [filtroAsignacion, setFiltroAsignacion] = useState<FiltroAsignacionTrabajo>("todos");
  const [seleccionadas, setSeleccionadas]       = useState<Set<string>>(new Set());
  const [operadorDestinoId, setOperadorDestinoId] = useState("");
  const [, forceUpdate] = useState(0);
  const bump = () => { forceUpdate(v => v + 1); bumpData(); };

  const operadoresAsignacion = useMemo(() => crearOperadoresAsignacion(evidencias, usuarioLogueado), []);

  const evidenciasContexto = evidencias.filter((ev) => {
    if (filtroTerminalExt && filtroTerminalExt !== "todos" && ev.terminal !== filtroTerminalExt) return false;
    if (fechaDesde && ev.fecha < fechaDesde) return false;
    if (fechaHasta && ev.fecha > fechaHasta) return false;
    return true;
  });

  const baseFiltrada = evidenciasContexto.filter((ev) => {
    if (filtroRevision === "pendientes" && ev.veredictoOperador) return false;
    if (filtroRevision === "revisados" && !ev.veredictoOperador) return false;
    if (filtroTipo !== "todos" && ev.tipo !== filtroTipo) return false;
    if (filtroResultado !== "todos" && resultadoRevision(ev) !== filtroResultado) return false;
    return true;
  });

  const filtradas = baseFiltrada.filter((ev) => {
    if (filtroAsignacion === "sin_asignar" && ev.veredictoOperador) return false;
    if (!cumpleFiltroAsignacion(ev, filtroAsignacion, usuarioLogueado.id)) return false;
    return true;
  });

  const misCount = baseFiltrada.filter(e => e.asignadoA?.id === usuarioLogueado.id && !e.veredictoOperador).length;
  const sinAsignarCount = baseFiltrada.filter(e => !e.asignadoA && !e.veredictoOperador).length;
  const cargaAsignacion = contarCargaAsignacion(baseFiltrada, operadoresAsignacion, (ev) => !ev.veredictoOperador);
  const idsSeleccionables = filtradas.filter((ev) => !ev.veredictoOperador).map((ev) => ev.id);
  const idsSeleccionablesKey = idsSeleccionables.join("|");
  const todasSeleccionadas = idsSeleccionables.length > 0 && idsSeleccionables.every((id) => seleccionadas.has(id));
  const operadorDestino = operadoresAsignacion.find((op) => op.id === operadorDestinoId);

  useEffect(() => {
    setSeleccionadas((prev) => new Set(Array.from(prev).filter((id) => idsSeleccionables.includes(id))));
  }, [idsSeleccionablesKey]);

  function toggleSeleccion(id: string) {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSeleccionTodas() {
    setSeleccionadas((prev) => {
      const next = new Set(prev);
      if (todasSeleccionadas) idsSeleccionables.forEach((id) => next.delete(id));
      else idsSeleccionables.forEach((id) => next.add(id));
      return next;
    });
  }

  function asignarSeleccionadas(operador: OperadorAsignacion | null) {
    const ahora = new Date().toISOString();
    let actualizadas = 0;

    evidencias.forEach((ev) => {
      if (!seleccionadas.has(ev.id) || ev.veredictoOperador) return;
      if (operador) {
        ev.asignadoA = operador;
        ev.fechaAsignacion = ahora.split("T")[0];
        ev.asignadoPor = { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre };
      } else {
        ev.asignadoA = undefined;
        ev.fechaAsignacion = undefined;
        ev.asignadoPor = { id: usuarioLogueado.id, nombre: usuarioLogueado.nombre };
      }
      actualizadas += 1;
    });

    if (actualizadas === 0) {
      toast({ variant: "destructive", title: "No hay evidencias pendientes seleccionadas" });
      return;
    }

    setSeleccionadas(new Set());
    setOperadorDestinoId("");
    bump();
    toast({ title: operador ? `${actualizadas} evidencia(s) asignada(s)` : `${actualizadas} evidencia(s) liberada(s)` });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <select
          value={filtroAsignacion}
          onChange={(e) => setFiltroAsignacion(e.target.value as FiltroAsignacionTrabajo)}
          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos los asignados</option>
          <option value="sin_asignar">Sin asignar ({sinAsignarCount})</option>
          <option value="mis_asignados">Mis asignados ({misCount})</option>
          {operadoresAsignacion.map((op) => (
            <option key={op.id} value={`usuario:${op.id}`}>{op.nombre}</option>
          ))}
        </select>
        <select
          value={filtroRevision}
          onChange={(e) => setFiltroRevision(e.target.value as FiltroRevision)}
          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Estado: Todos</option>
          <option value="pendientes">Pendientes</option>
          <option value="revisados">Revisados</option>
        </select>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Tipo: Todas</option>
          <option value="ia">Entrega fallida</option>
          <option value="entrega">Entrega efectiva</option>
        </select>
        <select
          value={filtroResultado}
          onChange={(e) => setFiltroResultado(e.target.value as FiltroResultado)}
          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Resultado: Todos</option>
          <option value="cumple">Cumple</option>
          <option value="no_cumple">No cumple</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtradas.length} evidencias</span>
      </div>

      {(sinAsignarCount > 0 || cargaAsignacion.length > 0 || filtroAsignacion !== "todos") && (
        <div className="flex items-center gap-2 flex-wrap text-[11px] text-muted-foreground mb-4">
          <span className="font-medium text-foreground">Asignación:</span>
          {filtroAsignacion !== "todos" && (
            <span className="px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
              {labelFiltroAsignacion(filtroAsignacion, operadoresAsignacion)}
            </span>
          )}
          {sinAsignarCount > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Sin asignar {sinAsignarCount}</span>}
          {cargaAsignacion.slice(0, 5).map((row) => (
            <span key={row.id} className="px-2 py-0.5 rounded-full bg-muted/60 border border-border">{row.nombre.split(" ").slice(0, 2).join(" ")} {row.count}</span>
          ))}
        </div>
      )}

      {seleccionadas.size > 0 && (
        <div className="flex items-center gap-2 flex-wrap rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 mb-4">
          <span className="text-xs font-semibold text-primary">{seleccionadas.size} seleccionada(s)</span>
          <button
            onClick={() => asignarSeleccionadas({ id: usuarioLogueado.id, nombre: usuarioLogueado.nombre, cargo: usuarioLogueado.cargo })}
            className="px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
          >
            Tomar seleccionadas
          </button>
          <select
            value={operadorDestinoId}
            onChange={(e) => setOperadorDestinoId(e.target.value)}
            className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Asignar a...</option>
            {operadoresAsignacion.map((op) => (
              <option key={op.id} value={op.id}>{op.nombre} — {op.cargo}</option>
            ))}
          </select>
          <button
            onClick={() => operadorDestino && asignarSeleccionadas(operadorDestino)}
            disabled={!operadorDestino}
            className="px-3 py-1.5 rounded-lg border border-border bg-background text-xs font-medium hover:bg-muted disabled:opacity-40 transition-colors"
          >
            Asignar
          </button>
          <button
            onClick={() => asignarSeleccionadas(null)}
            className="px-3 py-1.5 rounded-lg border border-amber-200 bg-amber-50 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-colors"
          >
            Liberar
          </button>
          <button
            onClick={() => { setSeleccionadas(new Set()); setOperadorDestinoId(""); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Cancelar selección
          </button>
        </div>
      )}

      <div className="bg-card border border-border rounded-xl overflow-x-auto">
        <div className="min-w-[920px]">
        <div className="grid grid-cols-[28px_minmax(180px,1.4fr)_72px_112px_150px_128px_132px_24px] gap-3 px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground items-center">
          <input
            type="checkbox"
            checked={todasSeleccionadas}
            onChange={toggleSeleccionTodas}
            disabled={idsSeleccionables.length === 0}
            className="accent-primary disabled:opacity-30"
            aria-label="Seleccionar evidencias filtradas"
          />
          <span>Guía / Terminal</span>
          <span className="text-center">Tipo</span>
          <span className="text-center">Resultado IA</span>
          <span className="text-center">Asignada a</span>
          <span className="text-center">Estado revisión</span>
          <span className="text-right">Fecha</span>
          <span />
        </div>
        {filtradas.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No hay evidencias que coincidan con los filtros seleccionados.
          </div>
        ) : (
          filtradas.map((ev) => (
            <EvidenciaRow
              key={ev.id}
              ev={ev}
              onUpdate={bump}
              selected={seleccionadas.has(ev.id)}
              onToggleSelected={() => toggleSeleccion(ev.id)}
            />
          ))
        )}
        </div>
      </div>
    </>
  );
}

export function evidenciasPendientesCount(): number {
  return evidencias.filter((e) => !e.veredictoOperador).length;
}

export default function EvidenciasPage() {
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="border-b border-border px-6 py-4 flex-shrink-0">
        <h1 className="text-lg font-bold flex items-center gap-2">
          <Camera className="w-5 h-5 text-muted-foreground" />
          Análisis de Evidencias
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Aquí auditas las evidencias fotográficas de entrega. La IA hace una primera clasificación
          (cumple / no cumple) y tu trabajo es validar ese veredicto: confirmarlo, marcarlo como
          falso positivo o negativo, o validar entregas rutinarias sin análisis automático. Cuando
          se identifica un error del operador, se genera un evento vinculado de forma automática.
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <EvidenciasPanel />
      </div>
    </div>
  );
}
