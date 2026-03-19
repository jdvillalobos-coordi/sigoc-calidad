import React, { useState } from "react";
import { X, ChevronLeft } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { guias, personas, vehiculos, terminales, getGuia, getPersonaPorCedula, getVehiculoPorPlaca } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";

type TipoF = "faltante" | "evento" | "rce" | "posventa" | "lesiva" | "contacto" | "evidencia" | null;

const TIPOS_FORM = [
  { id: "faltante", icon: "🔵", label: "Faltante", desc: "Investigar guías reportadas como faltantes (novedad 100)" },
  { id: "evento", icon: "🔴", label: "Evento", desc: "Registrar riesgos materializados: hurtos, fraudes, accidentes, etc." },
  { id: "rce", icon: "🟢", label: "RCE", desc: "Seguimiento a guías con recaudo contra entrega >$1M" },
  { id: "posventa", icon: "🟣", label: "Posventa", desc: "Reclamaciones de clientes: mala entrega, deterioro, etc." },
  { id: "lesiva", icon: "⚫", label: "Actividad Lesiva", desc: "Bloquear personas, vehículos o clientes por responsabilidad" },
  { id: "contacto", icon: "🟡", label: "Cuadro de Contacto", desc: "Registrar persona en seguimiento por sospecha" },
  { id: "evidencia", icon: "🟠", label: "Evidencia", desc: "Registrar resultado de validación IA sobre prueba de entrega" },
] as const;

const EVENTOS_TIPOS = [
  { grupo: "Seguridad física", opciones: ["Hurto de Combustible", "Intrusión", "Sabotaje", "Vandalismo", "Secuestro", "Extorsión", "Homicidio", "Lesiones Personales", "Terrorismo"] },
  { grupo: "Transporte y vías", opciones: ["Accidentes de Tránsito", "Aéreo", "Bloqueo de vías", "Descuelgue"] },
  { grupo: "Fraude y documentación", opciones: ["Dinero RCE/FP — Fraude, Hurto, Pérdida", "Fraude en la Documentación", "Suplantación"] },
  { grupo: "Tecnología y señales", opciones: ["Falla del Servidor / GPS", "Fuga de Información", "Inhibidores de Señal"] },
  { grupo: "Otros", opciones: ["Afectaciones a la seguridad híbrida"] },
];

const REQUERIMIENTOS_POSVENTA = [
  { grupo: "Entregas", opciones: [
    "Certificación de entrega - mala entrega",
    "Entrega no reconocida",
    "Entrega trocada",
    "Entrega a tercero no autorizado",
    "Entrega en dirección incorrecta",
    "Entrega parcial",
  ]},
  { grupo: "Faltantes y pérdidas", opciones: [
    "Faltante parcial",
    "Faltante total",
    "Pérdida total",
    "Pérdida parcial",
  ]},
  { grupo: "Daños y deterioro", opciones: [
    "Deterioro",
    "Avería por manipulación",
    "Daño por humedad",
    "Empaque inadecuado",
  ]},
  { grupo: "Novedades operativas", opciones: [
    "Novedad 300-400-403-829 superior a 72h sin gestión",
    "Incumplimiento de SLA",
    "Devolución no gestionada",
    "Reexpedición fallida",
  ]},
  { grupo: "Fraude y sospecha", opciones: [
    "Suplantación de identidad en entrega",
    "Reclamación fraudulenta",
    "Incumplimiento",
    "Manipulación de evidencia fotográfica",
  ]},
];

interface GuiaData { terminal: string; ciudad: string; cliente: string; nit: string; valor: number; }

export default function NewRecordForm({ onClose }: { onClose: () => void }) {
  const { abrirRegistro } = useApp();
  const [tipo, setTipo] = useState<TipoF>(null);
  const [guiaInput, setGuiaInput] = useState("");
  const [guiaData, setGuiaData] = useState<GuiaData | null>(null);
  const [guiaError, setGuiaError] = useState(false);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [observaciones, setObservaciones] = useState("");
  const [terminal, setTerminal] = useState("");
  // Faltante
  const [codigoNovedad, setCodigoNovedad] = useState("");
  const [tipoRiesgo, setTipoRiesgo] = useState("");
  const [cedResp, setCedResp] = useState(""); const [cedRespNombre, setCedRespNombre] = useState(""); const [cedRespError, setCedRespError] = useState(false);
  const [nysAsociado, setNysAsociado] = useState("");
  // Evento
  const [tipoEvento, setTipoEvento] = useState("");
  const [ubicacion, setUbicacion] = useState("sede");
  const [descDetallada, setDescDetallada] = useState("");
  const [fuente, setFuente] = useState("");
  // RCE
  const [valorRecaudo, setValorRecaudo] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [estadoRecaudo, setEstadoRecaudo] = useState("");
  const [porcentajeCobro, setPorcentajeCobro] = useState("");
  // Posventa
  const [requerimiento, setRequerimiento] = useState("");
  const [rolSolicitante, setRolSolicitante] = useState("");
  // Lesiva
  const [tipoEntidad, setTipoEntidad] = useState("");
  const [identificacion, setIdentificacion] = useState("");
  const [motivoBloqueo, setMotivoBloqueo] = useState("");
  // Contacto
  const [cedContacto, setCedContacto] = useState(""); const [cedContactoNombre, setCedContactoNombre] = useState("");
  const [motivoSeg, setMotivoSeg] = useState("");
  // Evidencia
  const [tipoEvidencia, setTipoEvidencia] = useState("");
  const [resultadoIA, setResultadoIA] = useState("");
  const [motivoNoCumple, setMotivoNoCumple] = useState("");

  function buscarGuia(num: string) {
    const g = getGuia(num);
    if (g) {
      setGuiaData({ terminal: g.terminalOrigen, ciudad: g.ciudadOrigen, cliente: g.nombreCliente, nit: g.nitCliente, valor: g.valorDeclarado });
      setTerminal(g.terminalOrigen);
      setGuiaError(false);
    } else {
      setGuiaData(null); setGuiaError(true);
    }
  }

  function validarCedula(ced: string, setNombre: (n: string) => void, setError: (e: boolean) => void) {
    const p = getPersonaPorCedula(ced);
    if (p) { setNombre(p.nombre); setError(false); }
    else if (ced.length > 5) { setNombre(""); setError(true); }
  }

  const puedeCrear = tipo && observaciones && (
    tipo === "lesiva" ? (tipoEntidad && identificacion && motivoBloqueo) :
    tipo === "contacto" ? (cedContacto && motivoSeg) :
    tipo === "posventa" ? (fecha) :
    (guiaInput && fecha)
  );

  function crear() {
    const id = `${tipo!.slice(0, 3).toUpperCase()}-${String(Math.floor(Math.random() * 900) + 100)}`;
    toast({ title: `✅ Registro ${id} creado exitosamente` });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {tipo && <button onClick={() => setTipo(null)} className="p-1 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>}
            <h2 className="font-bold text-base">{tipo ? `Nuevo registro — ${TIPOS_FORM.find(t => t.id === tipo)?.label}` : "Nuevo registro"}</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Capa 1: selección tipo */}
          {!tipo && (
            <div className="grid grid-cols-2 gap-3">
              {TIPOS_FORM.map((t) => (
                <button key={t.id} onClick={() => setTipo(t.id as TipoF)}
                  className="text-left p-4 rounded-xl border border-border hover:border-ring hover:shadow-card-hover transition-all group">
                  <div className="text-2xl mb-2">{t.icon}</div>
                  <div className="font-semibold text-sm mb-1">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Capa 2+3: formulario */}
          {tipo && (
            <div className="space-y-4 slide-down">
              {/* Campos comunes con guía */}
              {!["lesiva", "contacto"].includes(tipo) && (
                <>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                      Nro. Guía {tipo !== "posventa" ? "*" : ""}
                    </label>
                    <input
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring font-mono"
                      placeholder="19900293001"
                      value={guiaInput}
                      onChange={(e) => setGuiaInput(e.target.value)}
                      onBlur={() => guiaInput && buscarGuia(guiaInput)}
                    />
                    {tipo === "posventa" && (
                      <p className="text-xs text-muted-foreground/70 mt-1">Opcional — algunas reclamaciones no están asociadas a una guía en NyS</p>
                    )}
                    {guiaError && <p className="text-xs text-red-500 mt-1">Guía no encontrada en el sistema — completa los datos manualmente</p>}
                    {guiaData && (
                      <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="text-xs font-semibold text-blue-700 mb-1.5">Datos de la guía:</div>
                        <div className="flex flex-wrap gap-2">
                          {[["Terminal", guiaData.terminal], ["Ciudad", guiaData.ciudad], ["Cliente", guiaData.cliente], ["Valor", formatCurrency(guiaData.valor)]].map(([l, v]) => (
                            <span key={l} className="field-chip text-xs">{l}: {v}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Terminal *</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={terminal} onChange={(e) => setTerminal(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {terminales.map((t) => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fecha *</label>
                      <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                    </div>
                  </div>
                </>
              )}

              {/* Campos específicos por tipo */}
              {tipo === "faltante" && (
                <div className="space-y-3 slide-down">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Código novedad *</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={codigoNovedad} onChange={(e) => setCodigoNovedad(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {["100", "300", "400", "403", "529"].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de riesgo</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={tipoRiesgo} onChange={(e) => setTipoRiesgo(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {["Contaminación", "Contrabando", "Hurto", "Pérdida"].map((c) => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                  </div>
                  {tipoRiesgo && (
                    <div className="field-chip text-xs slide-down">Workflow: {["Contaminación", "Contrabando"].includes(tipoRiesgo) ? "Proceso Incautación ROS mcia" : "Eventos de Seguridad Denuncios"}</div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Cédula persona responsable *</label>
                    <input
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${cedRespError ? "border-red-400" : "border-border"}`}
                      placeholder="1036452781"
                      value={cedResp}
                      onChange={(e) => setCedResp(e.target.value)}
                      onBlur={() => validarCedula(cedResp, setCedRespNombre, setCedRespError)}
                    />
                    {cedRespNombre && <span className="field-chip text-xs mt-1 inline-block slide-down">{cedRespNombre}</span>}
                    {cedRespError && <p className="text-xs text-red-500 mt-1">Cédula no encontrada en el sistema</p>}
                  </div>
                </div>
              )}

              {tipo === "evento" && (
                <div className="space-y-3 slide-down">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de evento *</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {EVENTOS_TIPOS.map((g) => (
                        <optgroup key={g.grupo} label={g.grupo}>
                          {g.opciones.map((o) => <option key={o} value={o}>{o}</option>)}
                        </optgroup>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ubicación *</label>
                    <div className="flex gap-2">
                      {["sede", "ruta"].map((u) => (
                        <button key={u} onClick={() => setUbicacion(u)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${ubicacion === u ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{u === "sede" ? "📍 Sede" : "🛣 Ruta"}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descripción detallada *</label>
                    <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={4} value={descDetallada} onChange={(e) => setDescDetallada(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fuente del reporte</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={fuente} onChange={(e) => setFuente(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {["Operaciones", "Servicio al Cliente", "Seguridad", "Dirección General", "Otro"].map((f) => <option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {tipo === "rce" && (
                <div className="space-y-3 slide-down">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Valor recaudo (COP) *</label>
                      <input type="number" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="1250000" value={valorRecaudo} onChange={(e) => setValorRecaudo(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Forma de pago *</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={formaPago} onChange={(e) => setFormaPago(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {["Efectivo", "Transferencia", "Cheque", "Otro"].map((f) => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Estado recaudo *</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={estadoRecaudo} onChange={(e) => setEstadoRecaudo(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {["Pagado", "No pagado", "En proceso"].map((e) => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {tipo === "posventa" && (
                <div className="space-y-3 slide-down">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Requerimiento *</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={requerimiento} onChange={(e) => setRequerimiento(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {["Certificación de entrega - mala entrega", "Incumplimiento", "Entrega trocada", "Novedad 300-400-403-829 superior a 72h", "Deterioro", "Faltante parcial", "Entrega no reconocida", "Pérdida total"].map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Rol solicitante *</label>
                    <div className="flex gap-2">
                      {["remitente", "destinatario", "tercero"].map((r) => (
                        <button key={r} onClick={() => setRolSolicitante(r)} className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-colors capitalize ${rolSolicitante === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{r.charAt(0).toUpperCase() + r.slice(1)}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tipo === "lesiva" && (
                <div className="space-y-3 slide-down">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de entidad *</label>
                    <div className="grid grid-cols-2 gap-2">
                      {[["empleado", "👤 Empleado CM"], ["aliado", "🤝 Aliado"], ["vehiculo", "🚛 Vehículo"], ["cliente", "🏢 Cliente"]].map(([v, l]) => (
                        <button key={v} onClick={() => setTipoEntidad(v)} className={`py-2 px-3 rounded-lg border text-sm font-medium transition-colors text-left ${tipoEntidad === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">{tipoEntidad === "vehiculo" ? "Placa" : tipoEntidad === "cliente" ? "NIT" : "Cédula"} *</label>
                    <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={identificacion} onChange={(e) => setIdentificacion(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Motivo de bloqueo *</label>
                    <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={motivoBloqueo} onChange={(e) => setMotivoBloqueo(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fecha de bloqueo *</label>
                    <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                  </div>
                </div>
              )}

              {tipo === "contacto" && (
                <div className="space-y-3 slide-down">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Cédula *</label>
                    <input
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring ${cedRespError ? "border-red-400" : "border-border"}`}
                      value={cedContacto}
                      onChange={(e) => setCedContacto(e.target.value)}
                      onBlur={() => validarCedula(cedContacto, setCedContactoNombre, setCedRespError)}
                    />
                    {cedContactoNombre && <span className="field-chip text-xs mt-1 inline-block slide-down">{cedContactoNombre}</span>}
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Motivo del seguimiento *</label>
                    <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={motivoSeg} onChange={(e) => setMotivoSeg(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fecha *</label>
                    <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                  </div>
                </div>
              )}

              {tipo === "evidencia" && (
                <div className="space-y-3 slide-down">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de evidencia *</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring bg-background" value={tipoEvidencia} onChange={(e) => setTipoEvidencia(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {["Foto de entrega", "Firma", "Documento", "Otro"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Resultado validación IA *</label>
                    <div className="flex gap-3">
                      {[["cumple", "✅ Cumple", "border-green-400 bg-green-50 text-green-700"], ["no_cumple", "❌ No cumple", "border-red-400 bg-red-50 text-red-700"]].map(([v, l, cls]) => (
                        <button key={v} onClick={() => setResultadoIA(v)} className={`flex-1 py-3 rounded-xl border-2 font-semibold text-sm transition-all ${resultadoIA === v ? cls : "border-border hover:bg-muted"}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  {resultadoIA === "no_cumple" && (
                    <div className="slide-down">
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Motivo de no cumplimiento</label>
                      <textarea className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none" rows={3} value={motivoNoCumple} onChange={(e) => setMotivoNoCumple(e.target.value)} />
                    </div>
                  )}
                </div>
              )}

              {/* Observaciones */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Observaciones *</label>
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={3}
                  placeholder="Descripción general del registro..."
                  value={observaciones}
                  onChange={(e) => setObservaciones(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {tipo && (
          <div className="border-t border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <button
              onClick={crear}
              disabled={!puedeCrear}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Crear registro
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
