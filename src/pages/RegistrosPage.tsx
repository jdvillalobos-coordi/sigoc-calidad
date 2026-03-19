import React, { useState } from "react";
import { registros, terminales, personas } from "@/data/mockData";
import { TipoBadge, EstadoBadge, descripcionCorta, formatDate } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import { Plus, ChevronUp, ChevronDown } from "lucide-react";
import type { TipoRegistro, EstadoRegistro } from "@/types";

const TIPOS: { value: TipoRegistro | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los tipos" },
  { value: "faltante", label: "🔵 Faltante" },
  { value: "evento", label: "🔴 Evento" },
  { value: "rce", label: "🟢 RCE" },
  { value: "posventa", label: "🟣 Posventa" },
  { value: "lesiva", label: "⚫ Act. Lesiva" },
  { value: "contacto", label: "🟡 Cuadro Contacto" },
  { value: "evidencia", label: "🟠 Evidencia" },
];

const ESTADOS: { value: EstadoRegistro | "todos"; label: string }[] = [
  { value: "todos", label: "Todos los estados" },
  { value: "en_investigacion", label: "En investigación" },
  { value: "cerrado", label: "Cerrado" },
  { value: "vencido", label: "Vencido" },
  { value: "pendiente", label: "Pendiente" },
  { value: "bloqueado", label: "Bloqueado" },
];

const REGIONALES: Record<string, string[]> = {
  "Centro":    ["Bogotá"],
  "Sur":       ["Cali", "Pereira"],
  "Oriente":   ["Bucaramanga", "Cartagena"],
  "Occidente": ["Medellín"],
  "México":    ["México"],
};

export default function RegistrosPage() {
  const { abrirRegistro, setNuevaRegistroAbierto } = useApp();
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");
  const [regionalFiltro, setRegionalFiltro] = useState("todos");
  const [terminalFiltro, setTerminalFiltro] = useState("todos");
  const [sortField, setSortField] = useState<"fecha" | "diasAbierto" | "id">("fecha");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const PER_PAGE = 15;

  // Al cambiar regional, resetear terminal si no pertenece
  function handleRegionalChange(val: string) {
    setRegionalFiltro(val);
    setTerminalFiltro("todos");
    setPage(1);
  }

  const terminalesDisponibles =
    regionalFiltro !== "todos"
      ? REGIONALES[regionalFiltro] ?? []
      : terminales;

  const filtered = registros
    .filter((r) => tipoFiltro === "todos" || r.tipo === tipoFiltro)
    .filter((r) => estadoFiltro === "todos" || r.estado === estadoFiltro)
    .filter((r) => {
      if (terminalFiltro !== "todos") return r.terminal === terminalFiltro;
      if (regionalFiltro !== "todos") return (REGIONALES[regionalFiltro] ?? []).includes(r.terminal);
      return true;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortField === "fecha") cmp = new Date(a.fecha).getTime() - new Date(b.fecha).getTime();
      else if (sortField === "diasAbierto") cmp = a.diasAbierto - b.diasAbierto;
      else cmp = a.id.localeCompare(b.id);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const pages = Math.ceil(filtered.length / PER_PAGE);
  const paged = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("desc"); }
  }

  function SortIcon({ field }: { field: typeof sortField }) {
    if (sortField !== field) return <span className="text-muted-foreground/40">↕</span>;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />;
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Filtros */}
      <div className="border-b border-border bg-card px-6 py-3 flex items-center gap-3 flex-wrap flex-shrink-0">
        <select
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={tipoFiltro}
          onChange={(e) => { setTipoFiltro(e.target.value); setPage(1); }}
        >
          {TIPOS.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
        <select
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={estadoFiltro}
          onChange={(e) => { setEstadoFiltro(e.target.value); setPage(1); }}
        >
          {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
        </select>
        {/* Regional */}
        <select
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={regionalFiltro}
          onChange={(e) => handleRegionalChange(e.target.value)}
        >
          <option value="todos">Todas las regionales</option>
          {Object.keys(REGIONALES).map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
        {/* Terminal — se filtra según regional */}
        <select
          className="text-sm border border-border rounded-lg px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          value={terminalFiltro}
          onChange={(e) => { setTerminalFiltro(e.target.value); setPage(1); }}
        >
          <option value="todos">Todas las terminales</option>
          {terminalesDisponibles.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <div className="flex-1" />
        <span className="text-xs text-muted-foreground">{filtered.length} registro{filtered.length !== 1 ? "s" : ""}</span>
        <button
          onClick={() => setNuevaRegistroAbierto(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          <Plus className="w-4 h-4" /> Nuevo registro
        </button>
      </div>

      {/* Tabla */}
      <div className="flex-1 overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-muted/80 backdrop-blur z-10">
            <tr className="border-b border-border">
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32">Tipo</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-24" onClick={() => toggleSort("id")}>
                <span className="flex items-center gap-1">ID <SortIcon field="id" /></span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Descripción</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-28">Terminal</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-36">Estado</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground w-32">Responsable</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-24" onClick={() => toggleSort("fecha")}>
                <span className="flex items-center gap-1">Fecha <SortIcon field="fecha" /></span>
              </th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground cursor-pointer hover:text-foreground w-20" onClick={() => toggleSort("diasAbierto")}>
                <span className="flex items-center gap-1">Días <SortIcon field="diasAbierto" /></span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paged.map((r) => (
              <tr key={r.id} onClick={() => abrirRegistro(r.id)} className="table-row-hover bg-card">
                <td className="px-4 py-3"><TipoBadge tipo={r.tipo} /></td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id}</td>
                <td className="px-4 py-3 max-w-xs">
                  <span className="truncate block text-foreground">{descripcionCorta(r)}</span>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{r.terminal}</td>
                <td className="px-4 py-3"><EstadoBadge estado={r.estado} /></td>
                <td className="px-4 py-3 text-xs text-muted-foreground truncate max-w-[120px]">{r.responsableNombre}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{r.fecha}</td>
                <td className="px-4 py-3 text-xs">
                  <span className={r.diasAbierto > 30 ? "text-red-600 font-semibold" : r.diasAbierto > 14 ? "text-amber-600 font-medium" : "text-muted-foreground"}>
                    {r.diasAbierto}d
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <span className="text-4xl mb-3">📋</span>
            <p className="font-medium">No se encontraron registros</p>
            <p className="text-sm mt-1">Intenta cambiar los filtros de búsqueda</p>
          </div>
        )}
      </div>

      {/* Paginación */}
      {pages > 1 && (
        <div className="border-t border-border bg-card px-6 py-3 flex items-center justify-between flex-shrink-0">
          <span className="text-xs text-muted-foreground">
            Mostrando {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)} de {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-40 transition-colors">Anterior</button>
            {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
              <button key={p} onClick={() => setPage(p)} className={`px-3 py-1 text-sm border rounded transition-colors ${p === page ? "bg-primary text-primary-foreground border-primary" : "border-border hover:bg-muted"}`}>{p}</button>
            ))}
            <button disabled={page === pages} onClick={() => setPage(p => p + 1)} className="px-3 py-1 text-sm border border-border rounded hover:bg-muted disabled:opacity-40 transition-colors">Siguiente</button>
          </div>
        </div>
      )}
    </div>
  );
}
