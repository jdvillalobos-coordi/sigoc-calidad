import React, { useState, useEffect } from "react";
import { X, ChevronLeft, Plus } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { guias, terminales, getGuia, getPersonaPorCedula, buscarPersonas, getVehiculoPorPlaca, usuarioLogueado, eventos, CATEGORIAS_LESIVAS, insumosRCE, insumosFaltantes, getMonedaPorTerminal } from "@/data/mockData";
import { formatCurrency } from "@/lib/utils-app";
import { toast } from "@/hooks/use-toast";
import type { CategoriaEvento, CategoriaLesiva, FormPrefill, Persona, Evento } from "@/types";
import { pqrReferenciaEsRecogida } from "@/lib/pqr-referencia";

const CATEGORIAS = [
  { id: "dineros" as CategoriaEvento, icon: "💰", label: "Dineros", desc: "Hurtos, faltantes o desviaciones de recaudos y dineros" },
  { id: "unidades" as CategoriaEvento, icon: "📦", label: "Unidades", desc: "Faltantes de mercancía, novedades código 100" },
  { id: "listas_vinculantes" as CategoriaEvento, icon: "📋", label: "Listas Vinculantes", desc: "Antecedentes, denuncias, vínculos externos (Truora)" },
  { id: "pqr" as CategoriaEvento, icon: "📞", label: "Solicitudes Postventa", desc: "Reclamaciones de clientes: mala entrega, deterioro, etc." },
  { id: "disciplinarios" as CategoriaEvento, icon: "⚖️", label: "Disciplinarios", desc: "Faltas laborales: llegadas tarde, desacatos, llamados de atención" },
  { id: "eventos_criticos" as CategoriaEvento, icon: "🛡️", label: "Eventos críticos", desc: "Accidentes, hurtos, extorsión y otros riesgos de alto impacto" },
  { id: "evidencias" as CategoriaEvento, icon: "📸", label: "Evidencias", desc: "Falsa evidencia de entrega o intento de entrega" },
] as const;

const TIPOS_EVENTO: Record<CategoriaEvento, { grupo?: string; opciones: string[] }[]> = {
  dineros:            [{ opciones: ["Faltante de dinero", "Seguimiento RCE", "Dineros falsos"] }],
  unidades:           [{ opciones: ["Faltante causal 100", "Faltantes causal 101"] }],
  listas_vinculantes: [
    { grupo: "Investigación", opciones: ["Denuncia penal", "Vinculación grupos al margen de la ley", "Antecedente Truora", "Reporte empresa externa"] },
  ],
  eventos_criticos: [{ opciones: [
    "Aéreo (Dron)",
    "Activo CM Hurto / Pérdida (Sede)",
    "Accidentes de Tránsito (Volcamiento, Choque, etc)",
    "Afectaciones a la seguridad híbrida",
    "Bloqueo de vías",
    "Extorsión",
    "Falla del Servidor (Plataforma GPS)",
    "Fraude en la Documentación",
    "Fuga de Información",
    "Homicidio",
    "Hurto de Combustible",
    "Intrusión",
    "Inhibidores de Señal (GSM, GPRS, GPS)",
    "Lesiones Personales",
    "Sabotaje",
    "Secuestro",
    "Suplantación",
    "Terrorismo",
    "Vandalismo",
  ] }],
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
  eventos_criticos:  "Gestión de Seguridad",
};

function PersonaSearchField({ value, persona, onChange, onSelect, onClear }: {
  value: string;
  persona: Persona | null;
  onChange: (val: string) => void;
  onSelect: (p: Persona) => void;
  onClear: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const sugerencias = buscarPersonas(value, 6);
  const showSugerencias = focused && value.length >= 2 && !persona && sugerencias.length > 0;

  return (
    <div className="relative">
      {persona ? (
        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center gap-2">
          <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold text-blue-900">{persona.nombre}</span>
            <span className="text-[11px] text-blue-700">· ID {persona.cedula}</span>
            <span className="text-[11px] text-blue-700">· {persona.cargo}</span>
            <span className="text-[11px] text-blue-700">· {persona.terminal}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${persona.tipo === "empleado" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>
              {persona.tipo === "empleado" ? "Empleado CM" : "Tercero"}
            </span>
          </div>
          <button type="button" onClick={onClear} className="text-blue-400 hover:text-blue-600 text-xs flex-shrink-0">✕</button>
        </div>
      ) : (
        <>
          <input
            className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar por nombre o cédula..."
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 200)}
          />
          {showSugerencias && (
            <div className="absolute z-20 left-0 right-0 mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
              {sugerencias.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="w-full text-left px-3 py-2 hover:bg-muted transition-colors flex items-center gap-2"
                  onMouseDown={(e) => { e.preventDefault(); onSelect(p); }}
                >
                  <div className="w-6 h-6 rounded-full bg-primary/15 text-primary flex items-center justify-center text-[9px] font-bold flex-shrink-0">
                    {p.nombre.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium">{p.nombre}</div>
                    <div className="text-[10px] text-muted-foreground">ID {p.cedula} · {p.cargo} · {p.terminal}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
          {value.length >= 3 && !focused && sugerencias.length === 0 && (
            <span className="text-xs text-amber-600 mt-0.5 block">No se encontró "{value}" — verifica el ID o nombre</span>
          )}
        </>
      )}
    </div>
  );
}

interface GuiaData { terminal: string; ciudad: string; cliente: string; nit: string; valor: number; }

export default function NewRecordForm({ onClose, prefill }: { onClose: () => void; prefill?: FormPrefill }) {
  const { abrirRegistro, bumpData } = useApp();
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
  const [ciudadOrigen, setCiudadOrigen] = useState("");
  const [ciudadDestino, setCiudadDestino] = useState("");
  const [tipoPoblacionOrigen, setTipoPoblacionOrigen] = useState("");
  const [tipoPoblacionDestino, setTipoPoblacionDestino] = useState("");
  const [equipoRecogida, setEquipoRecogida] = useState("");
  const [equipoEntrega, setEquipoEntrega] = useState("0");
  const [pqrIdRecogida, setPqrIdRecogida] = useState("");
  const [adjuntos, setAdjuntos] = useState<string[]>([]);
  const [categoriaLesiva, setCategoriaLesiva] = useState("");
  const [subcategoriaLesiva, setSubcategoriaLesiva] = useState("");
  const [placaAdicional, setPlacaAdicional] = useState("");
  const [placaAdicionalData, setPlacaAdicionalData] = useState<{ placa: string; tipo: string; conductorId: string; estado: string } | null>(null);
  const [placaAdicionalError, setPlacaAdicionalError] = useState(false);
  const [direccion, setDireccion] = useState("");
  const [eventoCreado, setEventoCreado] = useState<string | null>(null);

  function buscarGuia(idx: number, num: string) {
    const g = getGuia(num);
    if (g) {
      setGuiasData((prev) => ({ ...prev, [idx]: { terminal: g.terminalOrigen, ciudad: g.ciudadOrigen, cliente: g.nombreCliente, nit: g.nitCliente, valor: g.valorDeclarado } }));
      if (idx === 0) {
        setTerminal(g.terminalOrigen);
        if (categoria === "pqr") {
          setCiudadOrigen(g.ciudadOrigen);
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
      setPlacaData({ placa: v.placa, tipo: v.tipo, conductorId: v.conductorId ?? "N/A", estado: v.estado });
      setPlacaError(false);
    } else if (placa.length >= 3) {
      setPlacaData(null);
      setPlacaError(true);
    }
  }

  function validarCedula(idx: number, ced: string) {
    const p = getPersonaPorCedula(ced);
    if (p) setCedulasPersona((prev) => ({ ...prev, [idx]: p }));
    else if (ced.length >= 3) setCedulasPersona((prev) => { const n = { ...prev }; delete n[idx]; return n; });
  }

  function buscarVehiculoAdicional(placa: string) {
    const v = getVehiculoPorPlaca(placa.toUpperCase());
    if (v) { setPlacaAdicionalData({ placa: v.placa, tipo: v.tipo, conductorId: v.conductorId ?? "N/A", estado: v.estado }); setPlacaAdicionalError(false); }
    else if (placa.length >= 3) { setPlacaAdicionalData(null); setPlacaAdicionalError(true); }
  }

  const esVehiculo = tipoEntidad === "Vehículo";
  const esPqrRecogida = categoria === "pqr" && pqrReferenciaEsRecogida(tipoEvento);
  const esIncumplimientoRecogidas = categoria === "pqr" && /incumplimiento.*recogida/i.test(tipoEvento);
  // Para PQR ya no se pide tipo de entidad (se deriva del Rol solicitante).
  const hideTipoEntidad = categoria === "dineros" || categoria === "unidades" || categoria === "eventos_criticos" || categoria === "pqr";
  const mostrarPlacaAdicional = !esVehiculo && categoria === "listas_vinculantes";
  const esAperturaDinOUni = categoria === "dineros" || categoria === "unidades";
  const esAperturaEventosCriticos = categoria === "eventos_criticos";
  const valorNumReg = Number(valorAfectacion);
  const valorAperturaOk = valorAfectacion !== "" && !Number.isNaN(valorNumReg) && valorNumReg > 0;
  const personaOpcional = esVehiculo || categoria === "pqr" || categoria === "listas_vinculantes" || categoria === "evidencias" || categoria === "eventos_criticos";

  // Si se elige "Incumplimiento recogidas", equipo recogida se fija a 0 por defecto y se bloquea.
  useEffect(() => {
    if (esIncumplimientoRecogidas) setEquipoRecogida("0");
  }, [esIncumplimientoRecogidas]);

  const puedeCrear = esAperturaDinOUni
    ? !!(categoria && tipoEvento && terminal && fecha && descripcion.trim() && valorAperturaOk)
    : esAperturaEventosCriticos
    ? !!(categoria && tipoEvento && terminal && fecha && descripcion.trim() && valorAperturaOk)
    : !!(
        categoria && tipoEvento && (hideTipoEntidad || tipoEntidad) && terminal && fecha && descripcion
        && (esVehiculo ? placaInput : true)
        && (personaOpcional || hideTipoEntidad || Object.keys(cedulasPersona).length > 0)
        && (categoria === "pqr"
          ? (terminalDestino && ciudadOrigen && ciudadDestino && equipoRecogida && equipoEntrega && tipoPoblacionOrigen && tipoPoblacionDestino && rolSolicitante
            && (esPqrRecogida ? /^\d{8}$/.test(pqrIdRecogida.trim()) : /^\d{11}$/.test((guiaInputs[0] ?? "").trim())))
          : true)
      );

  const [intentoCrear, setIntentoCrear] = useState(false);
  const camposFaltantes: string[] = [];
  if (intentoCrear && !puedeCrear && categoria) {
    if (esAperturaDinOUni) {
      if (!tipoEvento) camposFaltantes.push("Tipo de evento");
      if (!terminal) camposFaltantes.push("Terminal");
      if (!fecha) camposFaltantes.push("Fecha");
      if (!descripcion.trim()) camposFaltantes.push("Descripción de los hechos");
      if (valorAfectacion === "" || Number.isNaN(valorNumReg) || valorNumReg <= 0) {
        camposFaltantes.push(categoria === "dineros" ? "Valor del dinero" : "Valor declarado de unidades");
      }
    } else if (esAperturaEventosCriticos) {
      if (!tipoEvento) camposFaltantes.push("Tipo de evento");
      if (!terminal) camposFaltantes.push("Terminal");
      if (!fecha) camposFaltantes.push("Fecha");
      if (!descripcion.trim()) camposFaltantes.push("Descripción de los hechos");
      if (valorAfectacion === "" || Number.isNaN(valorNumReg) || valorNumReg <= 0) {
        camposFaltantes.push("Valor de afectación");
      }
    } else {
      if (!tipoEvento) camposFaltantes.push("Tipo de evento");
      if (!hideTipoEntidad && !tipoEntidad) camposFaltantes.push("Tipo de entidad");
      if (!terminal) camposFaltantes.push("Terminal");
      if (!fecha) camposFaltantes.push("Fecha");
      if (!descripcion) camposFaltantes.push("Descripción");
      if (esVehiculo && !placaInput) camposFaltantes.push("Placa del vehículo");
      if (!personaOpcional && Object.keys(cedulasPersona).length === 0) camposFaltantes.push("Persona responsable");
      if (categoria === "pqr" && !ciudadOrigen) camposFaltantes.push("Ciudad origen");
      if (categoria === "pqr" && !terminalDestino) camposFaltantes.push("Terminal destino");
      if (categoria === "pqr" && !ciudadDestino) camposFaltantes.push("Ciudad destino");
      if (categoria === "pqr" && !equipoRecogida) camposFaltantes.push("Equipo recogida");
      if (categoria === "pqr" && !equipoEntrega) camposFaltantes.push("Equipo tenencia o Entrega");
      if (categoria === "pqr" && !tipoPoblacionOrigen) camposFaltantes.push("Tipo población origen");
      if (categoria === "pqr" && !tipoPoblacionDestino) camposFaltantes.push("Tipo población destino");
      if (categoria === "pqr" && !rolSolicitante) camposFaltantes.push("Rol solicitante");
      if (categoria === "pqr" && esPqrRecogida && !/^\d{8}$/.test(pqrIdRecogida.trim())) camposFaltantes.push("N° I.D recogida (8 dígitos)");
      if (categoria === "pqr" && !esPqrRecogida && !/^\d{11}$/.test((guiaInputs[0] ?? "").trim())) camposFaltantes.push("N° guía (11 dígitos)");
    }
  }

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
    setPlacaInput("");
    setPlacaData(null);
    setPlacaError(false);
    setResultadoIA("");
    setVeredicto("");
    setJustificacion("");
    setNitCliente("");
    setNombreCliente("");
    setRolSolicitante("");
    setGravedadFalta("");
    setDecisionGH("");
    setTerminalDestino("");
    setCiudadOrigen("");
    setCiudadDestino("");
    setTipoPoblacionOrigen("");
    setTipoPoblacionDestino("");
    setEquipoRecogida("");
    setEquipoEntrega("0");
    setPqrIdRecogida("");
    setAdjuntos([]);
    setCategoriaLesiva("");
    setSubcategoriaLesiva("");
    setPlacaAdicional("");
    setPlacaAdicionalData(null);
    setPlacaAdicionalError(false);
    setDireccion("");
    setIntentoCrear(false);
    setEventoCreado(null);
  }

  function crear() {
    const prefix = categoria!.slice(0, 3).toUpperCase();
    const id = `${prefix}-${String(Math.floor(Math.random() * 900) + 100)}`;
    const hoy = new Date().toISOString().split("T")[0];
    const fechaRegistroIso = new Date().toISOString();

    const tipoEntidadMap: Record<string, Evento["tipoEntidad"]> = {
      "Empleado CM":              "empleado",
      "Aliado Goo":               "aliado_goo",
      "Aliado Droop":             "aliado_droop",
      "Contratista":              "contratista",
      "Tercero (persona jurídica)": "tercero",
      "Vehículo":                 "vehiculo",
      "Delincuencia":             "delincuencia",
      "Remitente":                "remitente",
      "Destinatario":             "destinatario",
    };

    const guiaPrincipal = guiaInputs[0] ? getGuia(guiaInputs[0]) : null;
    const esRecogidaPqr = categoria === "pqr" && pqrReferenciaEsRecogida(tipoEvento);
    const ciudad =
      categoria === "pqr"
        ? (ciudadOrigen || guiaPrincipal?.ciudadOrigen || terminal)
        : (guiaPrincipal?.ciudadOrigen ?? terminal);

    // Para PQR la entidad se deriva del Rol solicitante; el resto usa el selector
    const tipoEntidadPqr: Evento["tipoEntidad"] | undefined =
      rolSolicitante === "remitente" ? "remitente"
      : rolSolicitante === "destinatario" ? "destinatario"
      : rolSolicitante === "tercero" ? "tercero"
      : undefined;

    const sinPersonasAperturaDinUnid = categoria === "dineros" || categoria === "unidades" || categoria === "eventos_criticos";
    const personasVinculadas = Object.values(cedulasPersona).map((p) => ({
      personaId: p.id,
      cedula: p.cedula,
      nombre: p.nombre,
      rol: (categoria === "dineros" ? "participante" : "responsable") as "responsable" | "participante",
    }));

    const nuevoEvento: Evento = {
      id,
      estado: "abierto",
      categoria: categoria!,
      tipoEvento,
      tipoEntidad: (categoria === "pqr" ? (tipoEntidadPqr ?? "tercero") : (tipoEntidadMap[tipoEntidad] || "empleado")),
      fecha,
      terminal,
      ciudad,
      guias:
        categoria === "pqr"
          ? (esRecogidaPqr ? [] : guiaInputs.filter(Boolean).slice(0, 1))
          : categoria === "eventos_criticos"
            ? guiaInputs.map((g) => g.trim()).filter(Boolean)
            : guiaInputs.filter(Boolean).slice(0, 1),
      pqrIdRecogida: categoria === "pqr" && esRecogidaPqr ? pqrIdRecogida.trim() : undefined,
      personasResponsables: sinPersonasAperturaDinUnid ? [] : personasVinculadas,
      personasParticipantes: sinPersonasAperturaDinUnid
        ? []
        : categoria === "dineros"
          ? personasVinculadas
          : [],
      vehiculosVinculados: sinPersonasAperturaDinUnid
        ? []
        : [
            ...(placaData ? [{ vehiculoId: placaData.placa }] : []),
            ...(placaAdicionalData ? [{ vehiculoId: placaAdicionalData.placa }] : []),
          ],
      descripcionHechos: descripcion,
      valorAfectacion: categoria !== "pqr" && valorAfectacion ? Number(valorAfectacion) : undefined,
      valorDinero: categoria === "dineros" && valorAfectacion ? Number(valorAfectacion) : undefined,
      direccion: categoria === "listas_vinculantes" ? direccion || undefined : undefined,
      nitCliente: nitCliente || undefined,
      nombreCliente: nombreCliente || undefined,
      rolSolicitante: rolSolicitante as Evento["rolSolicitante"] || undefined,
      categoriaLesivaEvento: categoria === "listas_vinculantes" ? categoriaLesiva || undefined : undefined,
      subcategoriaLesivaEvento: categoria === "listas_vinculantes" ? subcategoriaLesiva || undefined : undefined,
      gravedadFalta: gravedadFalta as Evento["gravedadFalta"] || undefined,
      decisionGH: decisionGH || undefined,
      terminalDestino: categoria === "pqr" ? terminalDestino || undefined : undefined,
      ciudadDestino: categoria === "pqr" ? ciudadDestino || undefined : undefined,
      tipoPoblacionOrigen: categoria === "pqr" ? tipoPoblacionOrigen as Evento["tipoPoblacionOrigen"] || undefined : undefined,
      tipoPoblacionDestino: categoria === "pqr" ? tipoPoblacionDestino as Evento["tipoPoblacionDestino"] || undefined : undefined,
      equipoRecogida: categoria === "pqr" ? equipoRecogida || undefined : undefined,
      equipoEntrega: categoria === "pqr" ? equipoEntrega || undefined : undefined,
      soportesAdjuntos: sinPersonasAperturaDinUnid ? undefined : (adjuntos.length > 0 ? adjuntos : undefined),
      fuenteExterna: FUENTES[categoria!],
      estadoFlujo: "abierto",
      asignadoA: categoria === "pqr" ? undefined : {
        id: usuarioLogueado.id,
        nombre: usuarioLogueado.nombre,
        cargo: usuarioLogueado.cargo,
      },
      usuarioRegistro: usuarioLogueado.id,
      perfilUsuario: usuarioLogueado.cargo,
      terminalUsuario: usuarioLogueado.terminal,
      fechaRegistro: fechaRegistroIso,
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

    eventos.unshift(nuevoEvento);

    if (prefill?.insumoId && prefill?.insumoTipo) {
      const arr = prefill.insumoTipo === "rce" ? insumosRCE : insumosFaltantes;
      const idx = arr.findIndex((x) => x.id === prefill.insumoId);
      if (idx !== -1) {
        arr[idx].estadoRevision = "abierto";
        arr[idx].eventoGenerado = id;
        arr[idx].revisadoPor = usuarioLogueado.nombre;
        arr[idx].fechaRevision = hoy;
      }
    }

    setEventoCreado(id);
    bumpData();
    toast({ title: `✅ Evento ${id} creado exitosamente` });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {categoria && !eventoCreado && <button onClick={() => { setCategoria(null); setTipoEvento(""); setTipoEntidad(""); setPqrIdRecogida(""); }} className="p-1 rounded hover:bg-muted transition-colors"><ChevronLeft className="w-4 h-4" /></button>}
              <h2 className="font-bold text-base">
                {eventoCreado ? `Registro ${eventoCreado} creado` : categoria ? `Nuevo registro — ${CATEGORIAS.find(c => c.id === categoria)?.label}` : "Nuevo registro"}
              </h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><X className="w-5 h-5 text-muted-foreground" /></button>
          </div>
          {categoria && !eventoCreado && (
            <p className="text-xs text-muted-foreground mt-2">
              {categoria === "pqr"
                ? <>Este registro quedará <span className="font-semibold text-foreground">sin asignar</span> para que un Agente de SPL lo tome · Estado: <span className="font-semibold text-foreground">Abierto</span></>
                : <>Este evento se asignará automáticamente a <span className="font-semibold text-foreground">{usuarioLogueado.nombre}</span> · Estado: <span className="font-semibold text-foreground">Abierto</span></>
              }
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

              {/* Tipo de entidad (oculto para PQR: se deriva del rol solicitante) */}
              {!hideTipoEntidad && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo de entidad *</label>
                  <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={tipoEntidad} onChange={(e) => setTipoEntidad(e.target.value)}>
                    <option value="">Seleccionar...</option>
                    {["Empleado CM", "Aliado Goo", "Aliado Droop", "Contratista", "Tercero (persona jurídica)", "Vehículo", "Delincuencia", "Remitente", "Destinatario"].map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}

              {/* Terminal origen + Ciudad origen + Fecha */}
              {categoria === "pqr" ? (
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Terminal origen *</label>
                    <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={terminal} onChange={(e) => setTerminal(e.target.value)}>
                      <option value="">Seleccionar...</option>
                      {terminales.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Ciudad origen *</label>
                    <input className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Ciudad origen" value={ciudadOrigen} onChange={(e) => setCiudadOrigen(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Fecha de radicación *</label>
                    <input
                      type="date"
                      readOnly
                      disabled
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-muted/50 text-muted-foreground cursor-not-allowed"
                      value={fecha}
                    />
                    <p className="text-[10px] text-muted-foreground mt-0.5">Fecha actual del sistema (no editable)</p>
                  </div>
                </div>
              ) : (
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
              )}

              {categoria === "eventos_criticos" && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">Guías (opcional)</label>
                  {guiaInputs.map((g, i) => (
                    <div key={i} className="flex gap-2 items-center">
                      <input
                        className={`flex-1 border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${guiaErrors[i] ? "border-red-400" : "border-border"}`}
                        placeholder="N° guía"
                        value={g}
                        onChange={(e) => {
                          const v = e.target.value;
                          setGuiaInputs((prev) => prev.map((x, j) => (j === i ? v : x)));
                        }}
                        onBlur={() => g && buscarGuia(i, g)}
                      />
                      {guiaInputs.length > 1 && (
                        <button
                          type="button"
                          className="text-xs text-red-500 px-2"
                          onClick={() => {
                            setGuiaInputs((prev) => prev.filter((_, j) => j !== i));
                            setGuiasData((d) => { const n = { ...d }; delete n[i]; return n; });
                          }}
                        >
                          Quitar
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setGuiaInputs((prev) => [...prev, ""])}
                    className="text-xs text-primary flex items-center gap-1 hover:underline"
                  >
                    <Plus className="w-3 h-3" /> Agregar otra guía
                  </button>
                  {guiasData[0] && guiaInputs[0] && (
                    <p className="text-[10px] text-muted-foreground">La primera guía consultada rellena terminal/ciudad al vincular en el sistema.</p>
                  )}
                </div>
              )}

              {categoria === "pqr" && (
                <div className="space-y-3 rounded-lg border border-primary/15 bg-primary/[0.03] p-3">
                  <p className="text-[10px] font-medium text-muted-foreground">Ubicación y equipos (tras origen y radicación)</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Terminal destino *</label>
                      <select className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring" value={terminalDestino} onChange={(e) => setTerminalDestino(e.target.value)}>
                        <option value="">Seleccionar...</option>
                        {terminales.map((t) => <option key={t} value={t}>{t}</option>)}
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
                          <button key={v} type="button" onClick={() => setTipoPoblacionOrigen(v)} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${tipoPoblacionOrigen === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Tipo población destino *</label>
                      <div className="flex gap-2">
                        {[["directa_domestica", "Directa/Doméstica"], ["reexpedicion", "Reexpedición"]].map(([v, l]) => (
                          <button key={v} type="button" onClick={() => setTipoPoblacionDestino(v)} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium transition-colors ${tipoPoblacionDestino === v ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{l}</button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Equipo recogida *</label>
                      <input
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:bg-muted/50 disabled:text-muted-foreground disabled:cursor-not-allowed"
                        placeholder={esIncumplimientoRecogidas ? "0" : "EQ-BOG-045"}
                        value={equipoRecogida}
                        disabled={esIncumplimientoRecogidas}
                        onChange={(e) => setEquipoRecogida(e.target.value)}
                      />
                      {esIncumplimientoRecogidas && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">En "Incumplimiento recogidas" no hay equipo asignado (se fija en 0).</p>
                      )}
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Equipo tenencia o Entrega *</label>
                      <input
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                        placeholder="0"
                        value={equipoEntrega}
                        onChange={(e) => setEquipoEntrega(e.target.value)}
                      />
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
                        <button key={r} type="button" onClick={() => setRolSolicitante(r)} className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors ${rolSolicitante === r ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{r}</button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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

              {/* Vehículo asociado (listas vinculantes) */}
              {mostrarPlacaAdicional && (
                <div>
                  <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                    Vehículo asociado <span className="font-normal text-muted-foreground">(opcional)</span>
                  </label>
                  <p className="text-[10px] text-muted-foreground mb-1">Si el evento involucra un vehículo (ej: tractomula de la ruta), ingresa la placa.</p>
                  <input
                    className={`w-full border rounded-lg px-3 py-2 text-sm font-mono uppercase focus:outline-none focus:ring-2 focus:ring-ring ${placaAdicionalError ? "border-red-400" : "border-border"}`}
                    placeholder="ABC-123"
                    value={placaAdicional}
                    onChange={(e) => setPlacaAdicional(e.target.value.toUpperCase())}
                    onBlur={() => placaAdicional && buscarVehiculoAdicional(placaAdicional)}
                  />
                  {placaAdicionalError && <p className="text-xs text-red-500 mt-0.5">Vehículo no encontrado — verifica la placa</p>}
                  {placaAdicionalData && (
                    <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap gap-2">
                      {[["Placa", placaAdicionalData.placa], ["Tipo", placaAdicionalData.tipo], ["Conductor", placaAdicionalData.conductorId], ["Estado", placaAdicionalData.estado]].map(([l, v]) => (
                        <span key={l} className={`text-xs bg-white border rounded px-1.5 py-0.5 ${placaAdicionalData.estado === "bloqueado" && l === "Estado" ? "border-red-200 text-red-700" : "border-blue-200 text-blue-700"}`}>{l}: {v}</span>
                      ))}
                    </div>
                  )}
                  {placaAdicionalData && (
                    <button type="button" onClick={() => { setPlacaAdicional(""); setPlacaAdicionalData(null); setPlacaAdicionalError(false); }} className="text-[10px] text-red-500 hover:underline mt-1">
                      Quitar vehículo
                    </button>
                  )}
                </div>
              )}

              {/* Guía o I.D (un solo referente por evento; PQR según tipo) */}
              {categoria !== "eventos_criticos" && (
              <div>
                {categoria === "pqr" && esPqrRecogida ? (
                  <>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">N° I.D recogida (8 dígitos) *</label>
                    <input
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="12345678"
                      inputMode="numeric"
                      maxLength={8}
                      value={pqrIdRecogida}
                      onChange={(e) => setPqrIdRecogida(e.target.value.replace(/\D/g, "").slice(0, 8))}
                    />
                    <p className="text-xs text-muted-foreground/70 mt-1">Tipología de recogida: identifica el caso con el número de I.D (8 dígitos), sin guía de entrega.</p>
                  </>
                ) : categoria === "pqr" && !esPqrRecogida ? (
                  <>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">N° guía (11 dígitos) *</label>
                    <input
                      className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${guiaErrors[0] ? "border-red-400" : "border-border"}`}
                      placeholder="20000001002"
                      inputMode="numeric"
                      maxLength={11}
                      value={guiaInputs[0] ?? ""}
                      onChange={(e) => setGuiaInputs([e.target.value.replace(/\D/g, "").slice(0, 11)])}
                      onBlur={() => guiaInputs[0] && buscarGuia(0, guiaInputs[0])}
                    />
                    {guiaErrors[0] && <p className="text-xs text-red-500 mt-0.5">Guía no encontrada — verifica el número</p>}
                    {guiasData[0] && (
                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap gap-2">
                        {[["Terminal", guiasData[0].terminal], ["Cliente", guiasData[0].cliente], ["Valor", (() => { const m = getMonedaPorTerminal(guiasData[0].terminal); return formatCurrency(guiasData[0].valor, m.currency, m.locale); })()]].map(([l, v]) => (
                          <span key={l} className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-700">{l}: {v}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">Un evento corresponde a una sola guía.</p>
                  </>
                ) : (
                  <>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">N° guía</label>
                    <input
                      className={`w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-ring ${guiaErrors[0] ? "border-red-400" : "border-border"}`}
                      placeholder="19900293001"
                      inputMode={categoria === "dineros" || categoria === "unidades" ? "numeric" : undefined}
                      value={guiaInputs[0] ?? ""}
                      onChange={(e) => {
                        const v = categoria === "dineros" || categoria === "unidades" ? e.target.value.replace(/\D/g, "") : e.target.value;
                        setGuiaInputs([v]);
                      }}
                      onBlur={() => guiaInputs[0] && buscarGuia(0, guiaInputs[0])}
                    />
                    {guiaErrors[0] && <p className="text-xs text-red-500 mt-0.5">Guía no encontrada — completa datos manualmente</p>}
                    {guiasData[0] && (
                      <div className="mt-1 p-2 bg-blue-50 border border-blue-200 rounded-lg flex flex-wrap gap-2">
                        {[["Terminal", guiasData[0].terminal], ["Cliente", guiasData[0].cliente], ["Valor", (() => { const m = getMonedaPorTerminal(guiasData[0].terminal); return formatCurrency(guiasData[0].valor, m.currency, m.locale); })()]].map(([l, v]) => (
                          <span key={l} className="text-xs bg-white border border-blue-200 rounded px-1.5 py-0.5 text-blue-700">{l}: {v}</span>
                        ))}
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground/70 mt-1">
                      {categoria === "dineros" || categoria === "unidades"
                        ? "Opcional — un solo número de guía."
                        : esVehiculo
                          ? "Opcional — un solo número de guía por evento"
                          : "Opcional — dejar vacío si no aplica; una guía por evento"}
                    </p>
                  </>
                )}
              </div>
              )}

              {/* Personas responsables (opcional para vehículos) */}
              {categoria !== "unidades" && categoria !== "dineros" && categoria !== "eventos_criticos" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  {categoria === "dineros" ? "Persona(s) presente(s) en el evento" : categoria === "pqr" ? "Persona(s) relacionada(s)" : "Persona(s) responsable(s)"}{personaOpcional ? "" : " *"}
                </label>
                <div className="space-y-2">
                  {cedulas.map((ced, i) => (
                    <PersonaSearchField
                      key={i}
                      value={ced}
                      persona={cedulasPersona[i] ?? null}
                      onChange={(val) => setCedulas((prev) => prev.map((x, j) => j === i ? val : x))}
                      onSelect={(p) => {
                        setCedulas((prev) => prev.map((x, j) => j === i ? p.cedula : x));
                        setCedulasPersona((prev) => ({ ...prev, [i]: p }));
                      }}
                      onClear={() => {
                        setCedulas((prev) => prev.map((x, j) => j === i ? "" : x));
                        setCedulasPersona((prev) => { const n = { ...prev }; delete n[i]; return n; });
                      }}
                    />
                  ))}
                  <button onClick={() => setCedulas((prev) => [...prev, ""])} className="text-xs text-primary flex items-center gap-1 hover:underline">
                    <Plus className="w-3 h-3" /> Agregar persona
                  </button>
                </div>
                {personaOpcional && <p className="text-xs text-muted-foreground/70 mt-1">{esVehiculo ? "Opcional — puedes asociar el conductor u otra persona si aplica" : "Opcional — puedes vincular una persona si aplica"}</p>}
              </div>
              )}

              {/* Descripción */}
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  {categoria === "dineros" || categoria === "unidades" || categoria === "eventos_criticos" ? "Descripción de los hechos" : "Descripción"} *
                </label>
                <textarea
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  rows={4}
                  placeholder="Describe en detalle los hechos..."
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                />
              </div>

              {categoria !== "dineros" && categoria !== "unidades" && categoria !== "eventos_criticos" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  Adjuntar imágenes o PDF <span className="font-normal text-muted-foreground">(opcional, máx. 5)</span>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  multiple
                  disabled={adjuntos.length >= 5}
                  className="block w-full text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary/10 file:text-primary hover:file:bg-primary/15"
                  onChange={(e) => {
                    const nuevos = Array.from(e.target.files ?? []).map((f) => f.name);
                    setAdjuntos((prev) => [...prev, ...nuevos].slice(0, 5));
                    e.target.value = "";
                  }}
                />
                {adjuntos.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {adjuntos.map((n, i) => (
                      <div key={i} className="flex items-center gap-2 px-2 py-1 rounded-md bg-muted/40 text-xs">
                        <span className="flex-1 truncate">{n}</span>
                        <button
                          type="button"
                          className="text-muted-foreground hover:text-red-500"
                          onClick={() => setAdjuntos((prev) => prev.filter((_, j) => j !== i))}
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              )}

              {/* Valor de afectación (no aplica en alta PQR) */}
              {categoria !== "listas_vinculantes" && categoria !== "pqr" && (
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                  {categoria === "dineros" ? "Valor del dinero" : categoria === "unidades" ? "Valor declarado de unidades" : categoria === "eventos_criticos" ? "Valor de afectación" : "Valor estimado de afectación"}
                  {(categoria === "dineros" || categoria === "unidades" || categoria === "eventos_criticos") && " *"}
                </label>
                <input
                  type="number"
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder={`Valor en ${getMonedaPorTerminal(terminal).currency}`}
                  value={valorAfectacion}
                  onChange={(e) => setValorAfectacion(e.target.value)}
                />
              </div>
              )}

              {categoria === "listas_vinculantes" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Categoría</label>
                    <select
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={categoriaLesiva}
                      onChange={(e) => { setCategoriaLesiva(e.target.value); setSubcategoriaLesiva(""); }}
                    >
                      <option value="">Seleccionar categoría...</option>
                      {Object.entries(CATEGORIAS_LESIVAS).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                  {categoriaLesiva && (
                    <div>
                      <label className="text-xs font-semibold text-muted-foreground mb-1 block">Subcategoría</label>
                      <select
                        className="w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={subcategoriaLesiva}
                        onChange={(e) => setSubcategoriaLesiva(e.target.value)}
                      >
                        <option value="">Seleccionar subcategoría...</option>
                        {(CATEGORIAS_LESIVAS[categoriaLesiva as CategoriaLesiva]?.subcategorias ?? []).map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground mb-1 block">Dirección</label>
                    <input
                      className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Dirección del remitente/destinatario"
                      value={direccion}
                      onChange={(e) => setDireccion(e.target.value)}
                    />
                    <p className="text-[10px] text-muted-foreground mt-1">Aplica para Remitentes / Destinatarios</p>
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
                  {categoria === "dineros" || categoria === "unidades" || categoria === "eventos_criticos" ? (
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Categoría:</span>
                      <span className="font-medium">{CATEGORIAS.find(c => c.id === categoria)?.label}</span>
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">{tipoEvento}</span>
                      <span className="text-muted-foreground">Terminal:</span>
                      <span className="font-medium">{terminal}</span>
                      <span className="text-muted-foreground">Fecha:</span>
                      <span className="font-medium">{fecha}</span>
                      {guiaInputs.some((x) => x.trim()) && (<>
                        <span className="text-muted-foreground">Guía(s):</span>
                        <span className="font-medium font-mono">{guiaInputs.filter((x) => x.trim()).join(", ")}</span>
                      </>)}
                      {valorAfectacion && (<>
                        <span className="text-muted-foreground">{categoria === "dineros" ? "Valor del dinero:" : categoria === "unidades" ? "Valor declarado de unidades:" : "Valor de afectación:"}</span>
                        <span className="font-medium">{formatCurrency(Number(valorAfectacion), getMonedaPorTerminal(terminal).currency, getMonedaPorTerminal(terminal).locale)}</span>
                      </>)}
                      <span className="text-muted-foreground">Fuente:</span>
                      <span className="font-medium">{FUENTES[categoria]}</span>
                      <span className="text-muted-foreground">Asignado a:</span>
                      <span className="font-medium">{usuarioLogueado.nombre}</span>
                      <span className="text-muted-foreground">Estado:</span>
                      <span className="font-medium">Abierto</span>
                    </div>
                  ) : (
                    <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Categoría:</span>
                      <span className="font-medium">{CATEGORIAS.find(c => c.id === categoria)?.label}</span>
                      <span className="text-muted-foreground">Tipo:</span>
                      <span className="font-medium">{tipoEvento}</span>
                      {tipoEntidad && (<>
                      <span className="text-muted-foreground">Entidad:</span>
                      <span className="font-medium">{tipoEntidad}</span>
                      </>)}
                      <span className="text-muted-foreground">{categoria === "pqr" ? "Fecha radicación:" : "Fecha:"}</span>
                      <span className="font-medium">{fecha}</span>
                      {categoria === "pqr" && esPqrRecogida && pqrIdRecogida && (<>
                        <span className="text-muted-foreground">N° I.D recogida:</span>
                        <span className="font-medium font-mono">{pqrIdRecogida}</span>
                      </>)}
                      {((categoria === "pqr" && !esPqrRecogida) || categoria !== "pqr") && guiaInputs[0] && (<>
                        <span className="text-muted-foreground">Guía:</span>
                        <span className="font-medium font-mono">{guiaInputs[0]}</span>
                      </>)}
                      <span className="text-muted-foreground">{categoria === "pqr" ? "Terminal origen:" : "Terminal:"}</span>
                      <span className="font-medium">{terminal}</span>
                      {categoria === "pqr" && ciudadOrigen && (<>
                        <span className="text-muted-foreground">Ciudad origen:</span>
                        <span className="font-medium">{ciudadOrigen}</span>
                      </>)}
                      {categoria === "pqr" && rolSolicitante && (<>
                        <span className="text-muted-foreground">Rol solicitante:</span>
                        <span className="font-medium capitalize">{rolSolicitante}</span>
                      </>)}
                      {adjuntos.length > 0 && (<>
                        <span className="text-muted-foreground">Adjuntos:</span>
                        <span className="font-medium">{adjuntos.length} archivo{adjuntos.length > 1 ? "s" : ""}</span>
                      </>)}
                      {esVehiculo && placaData && (<>
                        <span className="text-muted-foreground">Vehículo:</span>
                        <span className="font-medium">{placaData.placa} ({placaData.tipo})</span>
                      </>)}
                      {primerPersona && (<>
                        <span className="text-muted-foreground">{categoria === "dineros" ? "Persona presente:" : categoria === "pqr" ? "Persona relacionada:" : "Persona responsable:"}</span>
                        <span className="font-medium">
                          {primerPersona.nombre} (ID {primerPersona.cedula}){Object.keys(cedulasPersona).length > 1 ? ` +${Object.keys(cedulasPersona).length - 1} más` : ""}
                        </span>
                      </>)}
                      {placaAdicionalData && (<>
                        <span className="text-muted-foreground">Vehículo asociado:</span>
                        <span className="font-medium">{placaAdicionalData.placa} ({placaAdicionalData.tipo})</span>
                      </>)}
                      {valorAfectacion && (<>
                        <span className="text-muted-foreground">{categoria === "dineros" ? "Valor dinero:" : "Valor afectación:"}</span>
                        <span className="font-medium">{formatCurrency(Number(valorAfectacion), getMonedaPorTerminal(terminal).currency, getMonedaPorTerminal(terminal).locale)}</span>
                      </>)}
                      {categoria === "pqr" && terminalDestino && (<>
                        <span className="text-muted-foreground">Destino:</span>
                        <span className="font-medium">{terminalDestino}{ciudadDestino ? ` — ${ciudadDestino}` : ""}</span>
                      </>)}
                      {categoria === "pqr" && equipoRecogida && (<>
                        <span className="text-muted-foreground">Equipo recogida:</span>
                        <span className="font-medium">{equipoRecogida}</span>
                      </>)}
                      <span className="text-muted-foreground">Fuente:</span>
                      <span className="font-medium">{FUENTES[categoria]}</span>
                      {categoria !== "pqr" && (<>
                        <span className="text-muted-foreground">Asignado a:</span>
                        <span className="font-medium">{usuarioLogueado.nombre}</span>
                      </>)}
                      {categoria === "pqr" && (<>
                        <span className="text-muted-foreground">Asignación:</span>
                        <span className="font-medium text-amber-600">Sin asignar — pendiente de Agente de SPL</span>
                      </>)}
                      <span className="text-muted-foreground">Estado:</span>
                      <span className="font-medium">Abierto</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Post-create actions */}
          {eventoCreado && (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center text-2xl">✅</div>
              <p className="text-sm text-center text-muted-foreground">
                El evento <span className="font-bold text-foreground">{eventoCreado}</span> fue creado exitosamente{categoria === "pqr" ? " y está disponible para asignación." : <> y asignado a <span className="font-semibold">{usuarioLogueado.nombre}</span>.</>}
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
          <div className="border-t border-border px-6 py-4 flex-shrink-0 space-y-2">
            {intentoCrear && camposFaltantes.length > 0 && (
              <div className="p-2.5 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-xs font-semibold text-red-700 mb-1">Campos requeridos faltantes:</p>
                <p className="text-xs text-red-600">{camposFaltantes.join(" · ")}</p>
              </div>
            )}
            <div className="flex justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 border border-border rounded-lg text-sm hover:bg-muted transition-colors">Cancelar</button>
              <button
                onClick={() => { setIntentoCrear(true); if (puedeCrear) crear(); }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${puedeCrear ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-muted text-muted-foreground cursor-not-allowed"}`}
              >
                Registrar evento
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
