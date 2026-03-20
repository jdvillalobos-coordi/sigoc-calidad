import React, { useState } from "react";
import { X, ChevronLeft, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { guias, terminales, getGuia, getPersonaPorCedula } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";
import type { CategoriaEvento } from "@/types";

const CATEGORIAS = [
  { id: "dineros" as CategoriaEvento, icon: "💰", label: "Dineros", desc: "Hurtos, faltantes o desviaciones de recaudos y dineros" },
  { id: "unidades" as CategoriaEvento, icon: "📦", label: "Unidades", desc: "Faltantes de mercancía, novedades código 100" },
  { id: "listas_vinculantes" as CategoriaEvento, icon: "📋", label: "Listas Vinculantes", desc: "Antecedentes, denuncias, vínculos externos (Truora)" },
  { id: "pqr" as CategoriaEvento, icon: "📞", label: "PQR", desc: "Reclamaciones de clientes: mala entrega, deterioro, etc." },
  { id: "disciplinarios" as CategoriaEvento, icon: "⚖️", label: "Disciplinarios", desc: "Faltas laborales: llegadas tarde, desacatos, llamados de atención" },
] as const;

const TIPOS_EVENTO: Record<CategoriaEvento, { grupo?: string; opciones: string[] }[]> = {
  dineros:            [{ opciones: ["Hurto de dinero", "Faltante de dinero", "Faltante injustificado"] }],
  unidades:           [{ opciones: ["Faltante novedad 100", "Faltante novedad 300", "Faltante novedad 400", "Sobrante novedad 403", "Cierre especial 529"] }],
  listas_vinculantes: [{ opciones: ["Denuncia penal", "Accidente de tránsito", "Vinculación grupos al margen de la ley", "Antecedente Truora", "Reporte empresa externa"] }],
  pqr:                [{ opciones: ["Unidad no entregada", "Producto incompleto", "Producto en mal estado", "Incumplimiento de funcionario", "Entrega trocada", "Entrega no reconocida", "Pérdida total", "Deterioro"] }],
  disciplinarios:     [{ opciones: ["Llegada tarde", "Llamado de atención verbal", "Llamado de atención escrito", "Desacato", "Falta leve", "Falta grave", "Falta gravísima"] }],
};

const FUENTES: Record<CategoriaEvento, string> = {
  dineros:            "SIGO Dineros",
  unidades:           "SIGO NyS",
  listas_vinculantes: "Truora / ClickCloud",
  pqr:                "Reporte cliente / Agente CAL",
  disciplinarios:     "SuccessFactors / Gestión Humana",
};

interface GuiaData { terminal: string; ciudad: string; cliente: string; nit: string; valor: number; }

export default function NewRecordForm({ onClose }: { onClose: () => void }) {
  const [categoria, setCategoria] = useState<CategoriaEvento | null>(null);
  const [tipoEvento, setTipoEvento] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [terminal, setTerminal] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [valorAfectacion, setValorAfectacion] = useState("");
  const [guiaInputs, setGuiaInputs] = useState<string[]>([""]);
  const [guiasData, setGuiasData] = useState<Record<number, GuiaData>>({});
  const [guiaErrors, setGuiaErrors] = useState<Record<number, boolean>>({});
  const [cedulas, setCedulas] = useState<string[]>([""]);
  const [cedulasNombre, setCedulasNombre] = useState<Record<number, string>>({});
  // Específicos
  const [codigoNovedad, setCodigoNovedad] = useState("");
  const [resultadoIA, setResultadoIA] = useState("");
  const [veredicto, setVeredicto] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [nitCliente, setNitCliente] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [rolSolicitante, setRolSolicitante] = useState("");
  const [gravedadFalta, setGravedadFalta] = useState("");
  const [decisionGH, setDecisionGH] = useState("");

  function buscarGuia(idx: number, num: string) {
    const g = getGuia(num);
    if (g) {
      setGuiasData((prev) => ({ ...prev, [idx]: { terminal: g.terminalOrigen, ciudad: g.ciudadOrigen, cliente: g.nombreCliente, nit: g.nitCliente, valor: g.valorDeclarado } }));
      if (idx === 0) setTerminal(g.terminalOrigen);
      setGuiaErrors((prev) => ({ ...prev, [idx]: false }));
    } else if (num.length > 4) {
      setGuiasData((prev) => { const n = { ...prev }; delete n[idx]; return n; });
      setGuiaErrors((prev) => ({ ...prev, [idx]: true }));
    }
  }

  function validarCedula(idx: number, ced: string) {
    const p = getPersonaPorCedula(ced);
    if (p) setCedulasNombre((prev) => ({ ...prev, [idx]: p.nombre }));
    else if (ced.length > 5) setCedulasNombre((prev) => ({ ...prev, [idx]: "" }));
  }

  const puedeCrear = !!(categoria && tipoEvento && tipoEntidad && terminal && fecha && descripcion);

  function crear() {
    const prefix = categoria!.slice(0, 3).toUpperCase();
    const id = `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`;
    toast({ title: `✅ Evento ${id} creado exitosamente` });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {categoria && <button onClick={() => setCategoria(null)} className="p-1 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>}
            <h2 className="font-bold text-base">
              {categoria ? `Nuevo evento — ${CATEGORIAS.find(c => c.id === categoria)?.label}` : "Nuevo evento"}
            </h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* Paso 1: selección de categoría */}
          {!categoria && (
            <div className="grid grid-cols-2 gap-3">
              {CATEGORIAS.map((c) => (
                <button key={c.id} onClick={() => setCategoria(c.id)}
                  className="text-left p-4 rounded-xl border border-border hover:border-ring hover:shadow-card-hover transition-all">
                  <div className="text-2xl mb-2">{c.icon}</div>
                  <div className="font-semibold text-sm mb-1">{c.label}</div>
                  <div className="text-xs text-muted-foreground">{c.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Paso 2+3: campos */}
          {categoria && (
            <div className="space-y-4">
              {/* Tipo de evento */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de evento *</label>
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={tipoEvento} onChange={(e) => setTipoEvento(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_EVENTO[categoria].map((g) =>
                    g.grupo
                      ? <optgroup key={g.grupo} label={g.grupo}>{g.opciones.map((o) => <option key={o} value={o}>{o}</option>)}</optgroup>
                      : g.opciones.map((o) => <option key={o} value={o}>{o}</option>)
                  )}
                </select>
              </div>

              {/* Tipo de entidad */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de entidad *</label>
                <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={tipoEntidad} onChange={(e) => setTipoEntidad(e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {["Empleado CM", "Aliado Goo", "Aliado Droop", "Contratista", "Tercero (persona jurídica)", "Vehículo"].map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>

              {/* Terminal y Fecha */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Terminal *</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={terminal} onChange={(e) => setTerminal(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {terminales.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fecha *</label>
                  <input type="date" className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" value={fecha} onChange={(e) => setFecha(e.target.value)} />
                </div>
              </div>

              {/* Guías */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Guía(s)</label>
                <div className="space-y-2">
                  {guiaInputs.map((g, i) => (
                    <div key={i}>
                      <input
                        className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${guiaErrors[i] ? "border-red-400" : "border-border"}`}
                        placeholder="19900293001"
                        value={g}
                        onChange={(e) => setGuiaInputs((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                        onBlur={() => g && buscarGuia(i, g)}
                      />
                      {guiaErrors[i] && <p className="text-xs text-red-500 mt-0.5">Guía no encontrada — completa datos manualmente</p>}
                      {guiasData[i] && (
                        <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap gap-2">
                          {[["Terminal", guiasData[i].terminal], ["Cliente", guiasData[i].cliente], ["Valor", formatCurrency(guiasData[i].valor)]].map(([l, v]) => (
                            <span key={l} className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-700">{l}: {v}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setGuiaInputs((prev) => [...prev, ""])} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Agregar otra guía
                  </button>
                </div>
                <p className="text-xs text-muted-foreground/70 mt-1">Opcional — dejar vacío si el evento no está asociado a una guía</p>
              </div>

              {/* Personas responsables */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Persona(s) responsable(s) *</label>
                <div className="space-y-1.5">
                  {cedulas.map((ced, i) => (
                    <div key={i}>
                      <input
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="Número de cédula"
                        value={ced}
                        onChange={(e) => setCedulas((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                        onBlur={() => validarCedula(i, ced)}
                      />
                      {cedulasNombre[i] && <span className="text-xs text-green-600 font-medium mt-0.5 block">{cedulasNombre[i]}</span>}
                    </div>
                  ))}
                  <button onClick={() => setCedulas((prev) => [...prev, ""])} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Agregar persona
                  </button>
                </div>
              </div>

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Descripción de los hechos *</label>
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                  placeholder="Describe en detalle los hechos..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              {/* Valor de afectación */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  {categoria === "dineros" ? "Valor del dinero" : categoria === "unidades" ? "Valor declarado de unidades" : "Valor estimado de afectación"}
                </label>
                <input
                  type="number"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Valor en COP"
                  value={valorAfectacion}
                  onChange={(e) => setValorAfectacion(e.target.value)}
                />
              </div>

              {/* Campos específicos por categoría */}
              {categoria === "unidades" && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Código novedad</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={codigoNovedad} onChange={(e) => setCodigoNovedad(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {["100", "300", "400", "403", "529"].map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              )}


              {categoria === "pqr" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">NIT Cliente</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="900234567" value={nitCliente} onChange={(e) => setNitCliente(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Nombre Cliente</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Razón social" value={nombreCliente} onChange={(e) => setNombreCliente(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Rol solicitante</label>
                    <div className="flex gap-2">
                      {["remitente", "destinatario", "tercero"].map((r) => (
                        <button key={r} onClick={() => setRolSolicitante(r)} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors ${rolSolicitante === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {categoria === "disciplinarios" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Gravedad de la falta</label>
                    <div className="flex gap-2">
                      {[["leve", "Leve"], ["grave", "Grave"], ["gravisima", "Gravísima"]].map(([v, l]) => (
                        <button key={v} onClick={() => setGravedadFalta(v)} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${gravedadFalta === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Decisión GH</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={decisionGH} onChange={(e) => setDecisionGH(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {["Sin decisión aún", "Llamado de atención verbal", "Llamado de atención escrito", "Suspensión", "Inicio proceso disciplinario", "Desvinculación", "Otro"].map((o) => <option key={o} value={o}>{o}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* Fuente (read-only) */}
              <div className="p-3 bg-muted/40 rounded-lg flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Fuente:</span>
                <span className="text-xs font-semibold">{FUENTES[categoria]}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {categoria && (
          <div className="border-t border-border px-6 py-4 flex justify-end gap-3 flex-shrink-0">
            <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">Cancelar</button>
            <button
              onClick={crear}
              disabled={!puedeCrear}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 transition-colors"
            >
              Registrar evento
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
