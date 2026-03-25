import React, { useState, useMemo } from "react";
import { personas, eventos, actividadesLesivas, estudiosSeguridad } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { AvatarInicial, formatCurrency } from "@/lib/utils-app";
import { Search, ChevronUp, ChevronDown, Filter } from "lucide-react";
import type { CategoriaEvento } from "@/types";

const CATEGORIAS: { key: CategoriaEvento; label: string; icon: string }[] = [
  { key: "dineros", label: "Dineros", icon: "💰" },
  { key: "unidades", label: "Unidades", icon: "📦" },
  { key: "listas_vinculantes", label: "Listas", icon: "📋" },
  { key: "pqr", label: "PQR", icon: "📞" },
  { key: "disciplinarios", label: "Disc.", icon: "⚖️" },
];

type SortKey = "nombre" | "totalEventos" | "riesgo" | "dinero";
type SortDir = "asc" | "desc";

export default function CuadroContactoPage() {
  const { abrirPersona } = useApp();
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "en_seguimiento" | "bloqueado" | "con_eventos">("todos");
  const [filtroTerminal, setFiltroTerminal] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("riesgo");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const terminales = useMemo(() => [...new Set(personas.map((p) => p.terminal))].sort(), []);

  const personasConDatos = useMemo(() => {
    return personas.map((p) => {
      const evs = eventos.filter((e) =>
        e.personasResponsables.some((pv) => pv.personaId === p.id) ||
        e.personasParticipantes.some((pv) => pv.personaId === p.id)
      );
      const evAbiertos = evs.filter((e) => e.estado === "abierto").length;
      const evCerrados = evs.filter((e) => e.estado === "cerrado").length;
      const evCerradosConHallazgo = evs.filter((e) => e.estado === "cerrado" && e.resolucionFinal && e.resolucionFinal !== "sin_hallazgos" && e.resolucionFinal !== "caso_insuficiente").length;
      const estudios = estudiosSeguridad.filter((e) => e.personaId === p.id);
      const estudiosConHallazgo = estudios.filter((e) => e.resultado === "hallazgos_encontrados").length;
      const riesgo = (evAbiertos * 2) + (evCerradosConHallazgo * 1) + (estudiosConHallazgo * 3);

      const porCategoria: Record<CategoriaEvento, number> = { dineros: 0, unidades: 0, listas_vinculantes: 0, pqr: 0, disciplinarios: 0 };
      let dineroTotal = 0;
      evs.forEach((e) => {
        porCategoria[e.categoria] = (porCategoria[e.categoria] || 0) + 1;
        if (e.valorAfectacion) dineroTotal += e.valorAfectacion;
        if (e.valorDinero) dineroTotal += e.valorDinero;
      });

      const lesivas = actividadesLesivas.filter((a) => a.personaId === p.id);
      const esResponsable = evs.some((e) => e.personasResponsables.some((pv) => pv.personaId === p.id));

      return {
        ...p,
        totalEventos: evs.length,
        evAbiertos,
        evCerrados,
        porCategoria,
        dineroTotal,
        riesgo,
        lesivas: lesivas.length,
        esResponsable,
        rolPrincipal: esResponsable ? "Responsable" : evs.length > 0 ? "Participante" : "—",
      };
    });
  }, []);

  const personasFiltradas = useMemo(() => {
    let result = personasConDatos;

    if (filtroEstado === "en_seguimiento") result = result.filter((p) => p.estado === "en_seguimiento");
    else if (filtroEstado === "bloqueado") result = result.filter((p) => p.estado === "bloqueado");
    else if (filtroEstado === "con_eventos") result = result.filter((p) => p.totalEventos > 0);

    if (filtroTerminal) result = result.filter((p) => p.terminal === filtroTerminal);

    if (busqueda) {
      const q = busqueda.toLowerCase();
      result = result.filter((p) =>
        p.nombre.toLowerCase().includes(q) ||
        p.cedula.toLowerCase().includes(q) ||
        p.terminal.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let va: number | string, vb: number | string;
      if (sortKey === "nombre") { va = a.nombre; vb = b.nombre; }
      else if (sortKey === "totalEventos") { va = a.totalEventos; vb = b.totalEventos; }
      else if (sortKey === "dinero") { va = a.dineroTotal; vb = b.dineroTotal; }
      else { va = a.riesgo; vb = b.riesgo; }
      if (va < vb) return sortDir === "asc" ? -1 : 1;
      if (va > vb) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [personasConDatos, filtroEstado, filtroTerminal, busqueda, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return <ChevronDown className="w-3 h-3 opacity-30" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  };

  const totalSeguimiento = personasConDatos.filter((p) => p.estado === "en_seguimiento").length;
  const totalBloqueados = personasConDatos.filter((p) => p.estado === "bloqueado").length;
  const totalConEventos = personasConDatos.filter((p) => p.totalEventos > 0).length;

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 px-6 pt-6 pb-4 border-b border-border">
        <h1 className="text-2xl font-bold">Cuadro de Contacto</h1>
        <p className="text-sm text-muted-foreground mt-1">Control de entidades con eventos vinculados — seguimiento y actividades lesivas</p>

        {/* KPI strip */}
        <div className="flex gap-3 mt-4">
          <button onClick={() => setFiltroEstado("con_eventos")} className={`flex-1 rounded-xl border p-3 text-left transition-colors ${filtroEstado === "con_eventos" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
            <div className="text-xs font-medium text-muted-foreground">Con eventos</div>
            <div className="text-xl font-black">{totalConEventos}</div>
          </button>
          <button onClick={() => setFiltroEstado("en_seguimiento")} className={`flex-1 rounded-xl border p-3 text-left transition-colors ${filtroEstado === "en_seguimiento" ? "border-amber-400 bg-amber-50" : "border-border hover:bg-muted/50"}`}>
            <div className="text-xs font-medium text-amber-700">En seguimiento</div>
            <div className="text-xl font-black text-amber-700">{totalSeguimiento}</div>
          </button>
          <button onClick={() => setFiltroEstado("bloqueado")} className={`flex-1 rounded-xl border p-3 text-left transition-colors ${filtroEstado === "bloqueado" ? "border-red-400 bg-red-50" : "border-border hover:bg-muted/50"}`}>
            <div className="text-xs font-medium text-red-700">Bloqueados</div>
            <div className="text-xl font-black text-red-700">{totalBloqueados}</div>
          </button>
          <button onClick={() => setFiltroEstado("todos")} className={`flex-1 rounded-xl border p-3 text-left transition-colors ${filtroEstado === "todos" ? "border-primary bg-primary/5" : "border-border hover:bg-muted/50"}`}>
            <div className="text-xs font-medium text-muted-foreground">Todas</div>
            <div className="text-xl font-black">{personasConDatos.length}</div>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mt-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm bg-background focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Buscar por nombre, cédula o terminal..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <select
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
              value={filtroTerminal}
              onChange={(e) => setFiltroTerminal(e.target.value)}
            >
              <option value="">Todas las terminales</option>
              {terminales.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-xs">
          <thead className="bg-muted/30 sticky top-0 z-10">
            <tr>
              <th className="text-left px-4 py-3 font-semibold text-muted-foreground">
                <button className="flex items-center gap-1" onClick={() => toggleSort("nombre")}>Persona <SortIcon col="nombre" /></button>
              </th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Tipo</th>
              <th className="text-left px-3 py-3 font-semibold text-muted-foreground">Terminal</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Estado</th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">
                <button className="flex items-center gap-1 mx-auto" onClick={() => toggleSort("totalEventos")}>Eventos <SortIcon col="totalEventos" /></button>
              </th>
              {CATEGORIAS.map((c) => (
                <th key={c.key} className="text-center px-2 py-3 font-semibold text-muted-foreground" title={c.label}>{c.icon}</th>
              ))}
              <th className="text-right px-3 py-3 font-semibold text-muted-foreground">
                <button className="flex items-center gap-1 ml-auto" onClick={() => toggleSort("dinero")}>Dinero <SortIcon col="dinero" /></button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">
                <button className="flex items-center gap-1 mx-auto" onClick={() => toggleSort("riesgo")}>Riesgo <SortIcon col="riesgo" /></button>
              </th>
              <th className="text-center px-3 py-3 font-semibold text-muted-foreground">Rol</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {personasFiltradas.map((p) => {
              const riskColor = p.riesgo >= 13 ? "bg-red-500" : p.riesgo >= 8 ? "bg-orange-500" : p.riesgo >= 4 ? "bg-amber-400" : "bg-green-500";
              return (
                <tr key={p.id} className="hover:bg-muted/30 cursor-pointer transition-colors" onClick={() => abrirPersona(p.id)}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <AvatarInicial nombre={p.nombre} size="sm" />
                      <div>
                        <div className="font-medium text-sm">{p.nombre}</div>
                        <div className="text-muted-foreground">{p.cedula} · {p.cargo}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <span className="capitalize">{p.tipo}</span>
                  </td>
                  <td className="px-3 py-3">{p.terminal}</td>
                  <td className="px-3 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium ${
                      p.estado === "bloqueado" ? "bg-red-100 text-red-700"
                      : p.estado === "en_seguimiento" ? "bg-amber-100 text-amber-700"
                      : "bg-green-100 text-green-700"
                    }`}>
                      {p.estado === "bloqueado" ? "Bloqueado" : p.estado === "en_seguimiento" ? "Seguimiento" : "Normal"}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-center">
                    {p.totalEventos > 0 ? (
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-sm">{p.totalEventos}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  {CATEGORIAS.map((c) => (
                    <td key={c.key} className="px-2 py-3 text-center">
                      {p.porCategoria[c.key] > 0 ? (
                        <span className="font-semibold">{p.porCategoria[c.key]}</span>
                      ) : (
                        <span className="text-muted-foreground/30">·</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right font-mono">
                    {p.dineroTotal > 0 ? formatCurrency(p.dineroTotal) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-3 py-3 text-center">
                    {p.riesgo > 0 ? (
                      <div className="flex items-center justify-center gap-1.5">
                        <div className={`w-2.5 h-2.5 rounded-full ${riskColor}`} />
                        <span className="font-bold">{p.riesgo}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      p.esResponsable ? "bg-red-50 text-red-600 border border-red-200" : p.totalEventos > 0 ? "bg-blue-50 text-blue-600 border border-blue-200" : "text-muted-foreground"
                    }`}>
                      {p.rolPrincipal}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {personasFiltradas.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <span className="text-4xl block mb-2">👥</span>
            <p className="text-sm">No se encontraron personas con los filtros aplicados.</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex-shrink-0 px-6 py-3 border-t border-border bg-muted/20 flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{personasFiltradas.length} personas</span>
        <span className="text-xs text-muted-foreground">Click en cualquier fila para ver el perfil 360</span>
      </div>
    </div>
  );
}
