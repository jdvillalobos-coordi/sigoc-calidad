import React, { useState } from "react";
import { X, ChevronLeft, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { guias, terminales, getGuia, getPersonaPorCedula, getVehiculoPorPlaca, usuarioLogueado, eventos } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";
import type { CategoriaEvento, FormPrefill, Persona, Evento } from "@/types";

const CATEGORIAS = [
  { id: "dineros" as CategoriaEvento, icon: "💰", label: "Dineros", desc: "Hurtos, faltantes o desviaciones de recaudos y dineros" },
  { id: "unidades" as CategoriaEvento, icon: "📦", label: "Unidades", desc: "Faltantes de mercancía, novedades código 100" },
  { id: "listas_vinculantes" as CategoriaEvento, icon: "📋", label: "Listas Vinculantes", desc: "Antecedentes, denuncias, vínculos externos (Truora)" },
  { id: "pqr" as CategoriaEvento, icon: "📞", label: "PQR", desc: "Reclamaciones de clientes: mala entrega, deterioro, etc." },
  { id: "disciplinarios" as CategoriaEvento, icon: "⚖️", label: "Disciplinarios", desc: "Faltas laborales: llegadas tarde, desacatos, llamados de atención" },
  { id: "evidencias" as CategoriaEvento, icon: "📸", label: "Evidencias", desc: "Falsa evidencia de entrega o intento de entrega" },
] as const;

const TIPOS_EVENTO: Record<CategoriaEvento, { grupo?: string; opciones: string[] }[]> = {
  dineros:            [{ opciones: ["Hurto de dinero", "Faltante de dinero", "Faltante injustificado", "Seguimiento RCE"] }],
  unidades:           [{ opciones: ["Faltante novedad 100", "Faltante novedad 300", "Faltante novedad 400", "Sobrante novedad 403", "Cierre especial 529"] }],
  listas_vinculantes: [{ opciones: ["Denuncia penal", "Accidente de tránsito", "Vinculación grupos al margen de la ley", "Antecedente Truora", "Reporte empresa externa"] }],
  pqr: [{ opciones: [
    "Alerta NYS no atendida",
    "Certificación de entrega - mala entrega",
    "Destinatario confirma recibido - Registrar fecha de entrega",
    "Deterioro posterior a la entrega",
    "Devolución pago realizado por el link de recaudo por guías no entregadas",
    "Doble cobro Flete (origen)",
    "Doble cobro Flete o RCE (Destino)",
    "Faltante / faltante interno posterior a la entrega",
    "Guía sin trazabilidad o movimiento - destino",
    "Guía sin trazabilidad o movimiento - origen",
    "Incumplimiento citas",
    "Incumplimiento de servicio RD",
    "Incumplimiento en el trámite de la solución",
    "Incumplimiento en TPS (Caso particular con reclamación previa y puntual por parte del cliente)",
    "Incumplimiento entrega grandes destinatarios (cadenas, zonas francas, puertos)",
    "Incumplimiento recogidas",
    "Novedad 200-302-402-404 superior a 48 horas hábiles sin gestión",
    "Novedad 300-400-403-829 superior a 72 horas hábiles sin gestión",
    "Novedad 401 sin movimiento",
    "Novedad 402 superior a 48 horas hábiles en estado 'Aprobada' sin gestión",
    "Novedad falsa / Solicitud nuevo intento sin cobro",
    "Novedad operativa - (guía mal liquidada, guía mal elaborada)",
    "Recogidas efectivas sin guía",
    "Solicitud cierre trámite de indemnización",
    "Validación de pago de RCE o FCE no realizado por link de recaudo",
  ] }],
  disciplinarios:     [{ opciones: ["Llegada tarde", "Llamado de atención verbal", "Llamado de atención escrito", "Desacato", "Falta leve", "Falta grave", "Falta gravísima"] }],
  evidencias:         [{ opciones: ["Falsa evidencia de entrega", "Falsa evidencia de intento de entrega", "Reporte causal dirección incorrecta"] }],
};

const FUENTES: Record<CategoriaEvento, string> = {
  dineros:            "SIGO Dineros",
  unidades:           "SIGO NyS",
  listas_vinculantes: "Truora / ClickCloud",
  pqr:                "Reporte cliente / Agente CAL",
  disciplinarios:     "SuccessFactors / Gestión Humana",
  evidencias:         "Auditoría IA Evidencias",
};

interface GuiaData { terminal: string; ciudad: string; cliente: string; nit: string; valor: number; }

export default function NewRecordForm({ onClose, prefill }: { onClose: () => void; prefill?: FormPrefill }) {
  const { abrirRegistro } = useApp();
  const [categoria, setCategoria] = useState<CategoriaEvento | null>(prefill?.categoria ?? null);
  const [tipoEvento, setTipoEvento] = useState("");
  const [tipoEntidad, setTipoEntidad] = useState("");
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [terminal, setTerminal] = useState(prefill?.terminal ?? "");
  const [descripcion, setDescripcion] = useState("");
  const [valorAfectacion, setValorAfectacion] = useState("");
  const [guiaInputs, setGuiaInputs] = useState<string[]>([prefill?.guia ?? ""]);
  const [guiasData, setGuiasData] = useState<Record<number, GuiaData>>(() => {
    if (prefill?.guia) {
      const g = getGuia(prefill.guia);
      if (g) return { 0: { terminal: g.terminalOrigen, ciudad: g.ciudadOrigen, cliente: g.nombreCliente, nit: g.nitCliente, valor: g.valorDeclarado } };
    }
    return {};
  });
  const [guiaErrors, setGuiaErrors] = useState<Record<number, boolean>>({});
  const [cedulas, setCedulas] = useState<string[]>([""]);
  const [cedulasPersona, setCedulasPersona] = useState<Record<number, Persona>>({});
  const [codigoNovedad, setCodigoNovedad] = useState(prefill?.codigoNovedad ?? "");
  const [placaInput, setPlacaInput] = useState("");
  const [placaData, setPlacaData] = useState<{ placa: string; tipo: string; conductorId: string; estado: string } | null>(null);
  const [placaError, setPlacaError] = useState(false);
  const [resultadoIA, setResultadoIA] = useState("");
  const [veredicto, setVeredicto] = useState("");
  const [justificacion, setJustificacion] = useState("");
  const [nitCliente, setNitCliente] = useState("");
  const [nombreCliente, setNombreCliente] = useState("");
  const [rolSolicitante, setRolSolicitante] = useState("");
  const [gravedadFalta, setGravedadFalta] = useState("");
  const [decisionGH, setDecisionGH] = useState("");
  const [terminalDestino, setTerminalDestino] = useState("");
  const [ciudadDestino, setCiudadDestino] = useState("");
  const [tipoPoblacionOrigen, setTipoPoblacionOrigen] = useState("");
  const [tipoPoblacionDestino, setTipoPoblacionDestino] = useState("");
  const [equipoRecogida, setEquipoRecogida] = useState("");
  const [equipoEntrega, setEquipoEntrega] = useState("");
  const [equipoTenencia, setEquipoTenencia] = useState(1);
  const [eventoCreado, setEventoCreado] = useState<string | null>(null);

  function buscarGuia(idx: number, num: string) {
    const g = getGuia(num);
    if (g) {
      setGuiasData((prev) => ({ ...prev, [idx]: { terminal: g.terminalOrigen, ciudad: g.ciudadOrigen, cliente: g.nombreCliente, nit: g.nitCliente, valor: g.valorDeclarado } }));
      if (idx === 0) {
        setTerminal(g.terminalOrigen);
        if (categoria === "pqr") {
          setTerminalDestino(g.terminalDestino);
          setCiudadDestino(g.ciudadDestino);
          setNitCliente(g.nitCliente);
          setNombreCliente(g.nombreCliente);
        }
      }
      setGuiaErrors((prev) => ({ ...prev, [idx]: false }));
    } else if (num.length > 4) {
      setGuiasData((prev) => { const n = { ...prev }; delete n[idx]; return n; });
      setGuiaErrors((prev) => ({ ...prev, [idx]: true }));
    }
  }

  function buscarVehiculo(placa: string) {
    const v = getVehiculoPorPlaca(placa.toUpperCase());
    if (v) {
      setPlacaData({ placa: v.placa, tipo: v.tipo, conductorId: v.conductorId, estado: v.estado });
      setPlacaError(false);
    } else if (placa.length >= 3) {
      setPlacaData(null);
      setPlacaError(true);
    }
  }

  function validarCedula(idx: number, ced: string) {
    const p = getPersonaPorCedula(ced);
    if (p) setCedulasPersona((prev) => ({ ...prev, [idx]: p }));
    else if (ced.length > 5) setCedulasPersona((prev) => { const n = { ...prev }; delete n[idx]; return n; });
  }

  const esVehiculo = tipoEntidad === "Vehículo";
  const puedeCrear = !!(categoria && tipoEvento && tipoEntidad && terminal && fecha && descripcion && (esVehiculo ? placaInput : true));

  const primerPersona = Object.values(cedulasPersona)[0];

  function resetForm() {
    setCategoria(null);
    setTipoEvento("");
    setTipoEntidad("");
    setFecha(new Date().toISOString().split("T")[0]);
    setTerminal("");
    setDescripcion("");
    setValorAfectacion("");
    setGuiaInputs([""]);
    setGuiasData({});
    setGuiaErrors({});
    setCedulas([""]);
    setCedulasPersona({});
    setCodigoNovedad("");
    setPlacaInput("");
    setPlacaData(null);
    setPlacaError(false);
    setNitCliente("");
    setNombreCliente("");
    setRolSolicitante("");
    setGravedadFalta("");
    setDecisionGH("");
    setTerminalDestino("");
    setCiudadDestino("");
    setTipoPoblacionOrigen("");
    setTipoPoblacionDestino("");
    setEquipoRecogida("");
    setEquipoEntrega("");
    setEquipoTenencia(1);
    setEventoCreado(null);
  }

  function crear() {
    const prefix = categoria!.slice(0, 3).toUpperCase();
    const id = `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const hoy = new Date().toISOString().split("T")[0];

    const tipoEntidadMap: Record<string, Evento["tipoEntidad"]> = {
      "Empleado CM":              "empleado",
      "Aliado Goo":               "aliado_goo",
      "Aliado Droop":             "aliado_droop",
      "Contratista":              "contratista",
      "Tercero (persona jurídica)": "tercero",
      "Vehículo":                 "vehiculo",
    };

    const guiaPrincipal = guiaInputs[0] ? getGuia(guiaInputs[0]) : null;
    const ciudad = guiaPrincipal?.ciudadOrigen ?? terminal;

    const personasResponsables = Object.values(cedulasPersona).map((p) => ({
      personaId: p.id,
      cedula: p.cedula,
      nombre: p.nombre,
      rol: "responsable" as const,
    }));

    const nuevoEvento: Evento = {
      id,
      estado: "abierto",
      categoria: categoria!,
      tipoEvento,
      tipoEntidad: tipoEntidadMap[tipoEntidad] ?? "empleado",
      fecha,
      terminal,
      ciudad,
      guias: guiaInputs.filter(Boolean),
      personasResponsables,
      personasParticipantes: [],
      vehiculosVinculados: placaData
        ? [{ vehiculoId: placaData.placa }]
        : [],
      descripcionHechos: descripcion,
      valorAfectacion: valorAfectacion ? Number(valorAfectacion) : undefined,
      valorDinero: categoria === "dineros" && valorAfectacion ? Number(valorAfectacion) : undefined,
      codigoNovedad: categoria === "unidades" ? codigoNovedad || undefined : undefined,
      nitCliente: nitCliente || undefined,
      nombreCliente: nombreCliente || undefined,
      rolSolicitante: rolSolicitante as Evento["rolSolicitante"] || undefined,
      gravedadFalta: gravedadFalta as Evento["gravedadFalta"] || undefined,
      decisionGH: decisionGH || undefined,
      terminalDestino: categoria === "pqr" ? terminalDestino || undefined : undefined,
      ciudadDestino: categoria === "pqr" ? ciudadDestino || undefined : undefined,
      tipoPoblacionOrigen: categoria === "pqr" ? tipoPoblacionOrigen as Evento["tipoPoblacionOrigen"] || undefined : undefined,
      tipoPoblacionDestino: categoria === "pqr" ? tipoPoblacionDestino as Evento["tipoPoblacionDestino"] || undefined : undefined,
      equipoRecogida: categoria === "pqr" ? equipoRecogida || undefined : undefined,
      equipoEntrega: categoria === "pqr" ? equipoEntrega || undefined : undefined,
      equipoTenencia: categoria === "pqr" ? equipoTenencia : undefined,
      estadoFlujo: "abierto",
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
        {
          id: `H-${Date.now()}`,
          fecha: hoy,
          usuarioNombre: usuarioLogueado.nombre,
          accion: "Evento creado",
        },
      ],
      diasAbierto: 0,
    };

    // Insertar al inicio del array para que aparezca primero en la lista
    eventos.unshift(nuevoEvento);

    setEventoCreado(id);
    toast({ title: `✅ Evento ${id} creado exitosamente` });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {categoria && !eventoCreado && <button onClick={() => setCategoria(null)} className="p-1 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>}
              <h2 className="font-bold text-base">
                {eventoCreado ? `Evento ${eventoCreado} creado` : categoria ? `Nuevo evento — ${CATEGORIAS.find(c => c.id === categoria)?.label}` : "Nuevo evento"}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          {categoria && !eventoCreado && (
            <p className="text-xs text-muted-foreground mt-2">
              Este evento se asignará automáticamente a <span className="font-semibold text-foreground">{usuarioLogueado.nombre}</span> · Estado: <span className="font-semibold text-foreground">Abierto</span>
            </p>
          )}
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

              {/* Placa del vehículo (solo si entidad es Vehículo) */}
              {esVehiculo && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Placa / Matrícula del vehículo *</label>
                  <input
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring ${placaError ? "border-red-400" : "border-border"}`}
                    placeholder="ABC-123"
                    value={placaInput}
                    onChange={(e) => setPlacaInput(e.target.value.toUpperCase())}
                    onBlur={() => placaInput && buscarVehiculo(placaInput)}
                  />
                  {placaError && <p className="text-xs text-red-500 mt-0.5">Vehículo no encontrado — verifica la placa</p>}
                  {placaData && (
                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap gap-2">
                      {[["Placa", placaData.placa], ["Tipo", placaData.tipo], ["Conductor", placaData.conductorId], ["Estado", placaData.estado]].map(([l, v]) => (
                        <span key={l} className={`text-xs bg-white border rounded px-1.5 py-0.5 ${placaData.estado === "bloqueado" && l === "Estado" ? "border-red-200 text-red-700" : "border-blue-200 text-blue-700"}`}>{l}: {v}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Guías (opcional para vehículos, normal para otros) */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Guía(s){esVehiculo ? "" : ""}
                </label>
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
                <p className="text-xs text-muted-foreground/70 mt-1">
                  {esVehiculo
                    ? "Opcional — no todos los eventos de vehículos están asociados a una guía"
                    : "Opcional — dejar vacío si el evento no está asociado a una guía"}
                </p>
              </div>

              {/* Personas responsables (opcional para vehículos) */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Persona(s) responsable(s){esVehiculo ? "" : " *"}
                </label>
                <div className="space-y-2">
                  {cedulas.map((ced, i) => (
                    <div key={i}>
                      <input
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="ID empleado"
                        value={ced}
                        onChange={(e) => setCedulas((prev) => prev.map((x, j) => j === i ? e.target.value : x))}
                        onBlur={() => validarCedula(i, ced)}
                      />
                      {cedulasPersona[i] && (
                        <div className="mt-1.5">
                          <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-semibold text-blue-900">{cedulasPersona[i].nombre}</span>
                            <span className="text-[11px] text-blue-700">· {cedulasPersona[i].cargo}</span>
                            <span className="text-[11px] text-blue-700">· {cedulasPersona[i].terminal}</span>
                          </div>
                        </div>
                      )}
                      {ced.length > 5 && !cedulasPersona[i] && (
                        <span className="text-xs text-muted-foreground mt-0.5 block">Persona no encontrada</span>
                      )}
                    </div>
                  ))}
                  <button onClick={() => setCedulas((prev) => [...prev, ""])} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Agregar persona
                  </button>
                </div>
                {esVehiculo && <p className="text-xs text-muted-foreground/70 mt-1">Opcional — puedes asociar el conductor u otra persona si aplica</p>}
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
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Terminal destino *</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={terminalDestino} onChange={(e) => setTerminalDestino(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {terminales.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ciudad destino *</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ciudad destino" value={ciudadDestino} onChange={(e) => setCiudadDestino(e.target.value)} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo población origen *</label>
                      <div className="flex gap-2">
                        {[["directa_domestica", "Directa/Doméstica"], ["reexpedicion", "Reexpedición"]].map(([v, l]) => (
                          <button key={v} onClick={() => setTipoPoblacionOrigen(v)} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${tipoPoblacionOrigen === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo población destino *</label>
                      <div className="flex gap-2">
                        {[["directa_domestica", "Directa/Doméstica"], ["reexpedicion", "Reexpedición"]].map(([v, l]) => (
                          <button key={v} onClick={() => setTipoPoblacionDestino(v)} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${tipoPoblacionDestino === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Equipo recogida *</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="EQ-BOG-045" value={equipoRecogida} onChange={(e) => setEquipoRecogida(e.target.value)} />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Equipo entrega</label>
                      <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="EQ-MDE-012 (opcional)" value={equipoEntrega} onChange={(e) => setEquipoEntrega(e.target.value)} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Equipo tenencia (unidades) *</label>
                    <div className="flex items-center gap-3">
                      <button onClick={() => setEquipoTenencia(Math.max(1, equipoTenencia - 1))} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors">−</button>
                      <span className="text-lg font-bold w-8 text-center">{equipoTenencia}</span>
                      <button onClick={() => setEquipoTenencia(equipoTenencia + 1)} className="w-8 h-8 rounded-lg border border-border flex items-center justify-center text-lg font-bold hover:bg-muted transition-colors">+</button>
                    </div>
                  </div>
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

              {/* Preview / resumen */}
              {puedeCrear && !eventoCreado && (
                <div className="p-4 bg-muted/40 rounded-xl border border-border space-y-2">
                  <p className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">📋 Resumen del evento</p>
                  <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                    <span className="text-muted-foreground">Categoría:</span>
                    <span className="font-medium">{CATEGORIAS.find(c => c.id === categoria)?.label}</span>
                    <span className="text-muted-foreground">Tipo:</span>
                    <span className="font-medium">{tipoEvento}</span>
                    {guiaInputs[0] && (<>
                      <span className="text-muted-foreground">Guía:</span>
                      <span className="font-medium font-mono">{guiaInputs[0]}</span>
                    </>)}
                    <span className="text-muted-foreground">Terminal:</span>
                    <span className="font-medium">{terminal}</span>
                    {primerPersona && (<>
                      <span className="text-muted-foreground">Persona responsable:</span>
                      <span className="font-medium">
                        {primerPersona.nombre} (ID {primerPersona.cedula})
                      </span>
                    </>)}
                    <span className="text-muted-foreground">Asignado a:</span>
                    <span className="font-medium">{usuarioLogueado.nombre}</span>
                    <span className="text-muted-foreground">Estado:</span>
                    <span className="font-medium">Abierto</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Post-create actions */}
          {eventoCreado && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✅</div>
              <p className="text-sm text-center text-muted-foreground">
                El evento <span className="font-bold text-foreground">{eventoCreado}</span> fue creado exitosamente y asignado a <span className="font-semibold">{usuarioLogueado.nombre}</span>.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => { onClose(); abrirRegistro(eventoCreado); }}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Abrir evento
                </button>
                <button
                  onClick={resetForm}
                  className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors"
                >
                  Crear otro
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {categoria && !eventoCreado && (
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
