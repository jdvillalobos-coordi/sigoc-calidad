import React, { useState } from "react";
import { Camera, ChevronDown, ChevronUp, ExternalLink, AlertTriangle, User, FileText } from "lucide-react";
import { evidencias, usuarioLogueado, eventos, getPersonaPorCedula } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { formatDate } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";
import type { Evidencia, Evento } from "@/types";

type FiltroRevision = "todos" | "pendientes" | "revisados";
type FiltroIA = "todos" | "cumple" | "no_cumple";

function ResultadoIABadge({ resultado }: { resultado: "cumple" | "no_cumple" }) {
  return resultado === "cumple" ? (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200">
      ✅ Cumple
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-100 text-red-800 border border-red-200">
      ❌ No cumple
    </span>
  );
}

function VeredictoTag({ v }: { v: "confirma" | "falso_negativo" | "falso_positivo" }) {
  const map = {
    confirma:       "bg-gray-100 text-gray-700 border-gray-200",
    falso_negativo: "bg-amber-100 text-amber-700 border-amber-200",
    falso_positivo: "bg-red-100 text-red-700 border-red-200",
  };
  const label = {
    confirma: "Confirmado",
    falso_negativo: "Falso negativo",
    falso_positivo: "No cumple",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map[v]}`}>
      {label[v]}
    </span>
  );
}

function EvidenciaRow({ ev }: { ev: Evidencia }) {
  const { abrirGuia, abrirRegistro } = useApp();
  const [expanded, setExpanded] = useState(false);
  const [veredicto, setVeredicto] = useState(ev.veredictoOperador ?? "");
  const [justificacion, setJustificacion] = useState(ev.justificacionOperador ?? "");
  const [guardado, setGuardado] = useState(!!ev.veredictoOperador);
  const [eventoGeneradoId, setEventoGeneradoId] = useState<string | null>(null);

  const pendiente = !ev.veredictoOperador;
  const generaEvento = veredicto === "falso_positivo";

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
      const tipoEv = "Evidencia de entrega inválida";

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
        tipoEvento: tipoEv,
        tipoEntidad: "empleado",
        fecha: hoy,
        terminal: ev.terminal,
        ciudad: ev.terminal,
        guias: [ev.guia],
        personasResponsables: personasResp,
        personasParticipantes: [],
        vehiculosVinculados: [],
        descripcionHechos: `El operador tomó una foto que no corresponde a la evidencia de entrega. Guía ${ev.guia}, terminal ${ev.terminal}.${justificacion ? ` Justificación del auditor: ${justificacion}` : ""}`.trim(),
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
          { id: `H-${Date.now() + 1}`, fecha: hoy, usuarioNombre: usuarioLogueado.nombre, accion: "Cerrado automáticamente — falla de evidencia clasificada por auditor" },
        ],
        diasAbierto: 0,
      };

      eventos.unshift(nuevoEvento);
      setEventoGeneradoId(id);
      toast({ title: `📸 Evento ${id} creado automáticamente`, description: `${tipoEv} — ${ev.operadorNombre ?? "Operador"}` });
    } else {
      toast({ title: "✅ Veredicto guardado", description: `Evidencia ${ev.id} revisada.` });
    }

    setExpanded(false);
  }

  return (
    <div className="border-b border-border last:border-0">
      {/* Fila principal */}
      <button
        className="w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center"
        onClick={() => setExpanded((v) => !v)}
      >
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
        <ResultadoIABadge resultado={ev.resultadoIA} />
        {ev.veredictoOperador
          ? <VeredictoTag v={ev.veredictoOperador} />
          : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">⏳ Pendiente</span>
        }
        <span className="text-xs text-muted-foreground">{formatDate(ev.fecha)}</span>
        {expanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {/* Panel expandido */}
      {expanded && (
        <div className="px-4 pb-4 bg-muted/20 border-t border-border">
          <div className="pt-4 grid grid-cols-2 gap-4">
            {/* Fotografías — links al sistema de origen */}
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

              {/* Operador que tomó la foto */}
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

              {/* Metadata */}
              <div className="mt-2 text-xs text-muted-foreground space-y-0.5">
                <div><span className="font-medium">Guía:</span> {ev.guia}</div>
                <div><span className="font-medium">Fecha:</span> {formatDate(ev.fecha)}</div>
                {ev.revisadoPor && <div><span className="font-medium">Revisado por:</span> {ev.revisadoPor}</div>}
              </div>
            </div>

            {/* Veredicto */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">Tu veredicto</p>
              {guardado ? (
                <div className="space-y-2">
                  <VeredictoTag v={veredicto as "confirma" | "falso_negativo" | "falso_positivo"} />
                  {justificacion && (
                    <p className="text-xs text-muted-foreground mt-1 italic">"{justificacion}"</p>
                  )}
                  <button
                    className="text-xs text-primary hover:underline"
                    onClick={() => setGuardado(false)}
                  >
                    Editar veredicto
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => setVeredicto("confirma")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${veredicto === "confirma" ? "bg-green-600 text-white border-green-600" : "border-border hover:bg-green-50 hover:border-green-200"}`}
                  >
                    <div className="text-xs font-medium">✅ Confirmo — La IA clasificó bien la foto</div>
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
                    <div className="text-xs font-medium">⚠️ Falso negativo — La IA rechazó una evidencia válida</div>
                    <div className={`text-xs mt-0.5 ${veredicto === "falso_negativo" ? "text-white/80" : "text-muted-foreground"}`}>
                      La foto sí corresponde a la entrega real, pero la IA la rechazó por error. Falla del modelo de IA.
                    </div>
                  </button>
                  <button
                    onClick={() => setVeredicto("falso_positivo")}
                    className={`w-full text-left px-3 py-2.5 rounded-lg border transition-colors ${veredicto === "falso_positivo" ? "bg-red-600 text-white border-red-600" : "border-border hover:bg-red-50 hover:border-red-200"}`}
                  >
                    <div className="text-xs font-medium">🚫 La foto no cumple — Error del operador</div>
                    <div className={`text-xs mt-0.5 ${veredicto === "falso_positivo" ? "text-white/80" : "text-muted-foreground"}`}>
                      La foto no corresponde a la evidencia, el operador tomó una foto incorrecta.
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
              )}

              {/* Banner genera evento automático */}
              {generaEvento && !guardado && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 font-medium">
                      Al guardar el veredicto se creará un evento automáticamente en la categoría Evidencias, vinculado al operador.
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
                      <button
                        className="text-xs text-primary hover:underline mt-1"
                        onClick={() => abrirRegistro(eventoGeneradoId)}
                      >
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

export function EvidenciasPanel({ filtroTerminalExt, fechaDesde, fechaHasta }: { filtroTerminalExt?: string; fechaDesde?: string; fechaHasta?: string }) {
  const [filtroRevision, setFiltroRevision] = useState<FiltroRevision>("todos");
  const [filtroIA, setFiltroIA] = useState<FiltroIA>("todos");

  const filtradas = evidencias.filter((ev) => {
    if (filtroRevision === "pendientes" && ev.veredictoOperador) return false;
    if (filtroRevision === "revisados" && !ev.veredictoOperador) return false;
    if (filtroIA === "cumple" && ev.resultadoIA !== "cumple") return false;
    if (filtroIA === "no_cumple" && ev.resultadoIA !== "no_cumple") return false;
    if (filtroTerminalExt && filtroTerminalExt !== "todos" && ev.terminal !== filtroTerminalExt) return false;
    if (fechaDesde && ev.fecha < fechaDesde) return false;
    if (fechaHasta && ev.fecha > fechaHasta) return false;
    return true;
  });

  return (
    <>
      <div className="flex flex-wrap gap-2 items-center mb-4">
        <select
          value={filtroRevision}
          onChange={(e) => setFiltroRevision(e.target.value as FiltroRevision)}
          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Todos</option>
          <option value="pendientes">Pendientes</option>
          <option value="revisados">Revisados</option>
        </select>
        <select
          value={filtroIA}
          onChange={(e) => setFiltroIA(e.target.value as FiltroIA)}
          className="text-xs border border-border rounded-lg px-2.5 py-1.5 bg-card focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="todos">Resultado IA: Todos</option>
          <option value="cumple">✅ Cumple</option>
          <option value="no_cumple">❌ No cumple</option>
        </select>
        <span className="text-xs text-muted-foreground ml-auto">{filtradas.length} evidencias</span>
      </div>

      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 px-4 py-2.5 bg-muted/30 border-b border-border text-xs font-medium text-muted-foreground">
          <span>Guía / Terminal</span>
          <span>Resultado IA</span>
          <span>Estado revisión</span>
          <span>Fecha</span>
          <span />
        </div>
        {filtradas.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-muted-foreground">
            No hay evidencias que coincidan con los filtros seleccionados.
          </div>
        ) : (
          filtradas.map((ev) => <EvidenciaRow key={ev.id} ev={ev} />)
        )}
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
          Gestión de Evidencias
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Revisa las evidencias de intento de entrega validadas por IA y confirma o corrige el resultado
        </p>
      </div>
      <div className="flex-1 overflow-y-auto p-6">
        <EvidenciasPanel />
      </div>
    </div>
  );
}
