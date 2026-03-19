import React, { useState } from "react";
import { registros, personas, vehiculos, guias, terminales } from "@/data/mockData";
import { TipoBadge, EstadoBadge, descripcionCorta } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import { Search } from "lucide-react";

type Tab = "todos" | "personas" | "vehiculos" | "guias" | "registros";

export default function BusquedaPage() {
  const { busquedaQuery, abrirRegistro, abrirPersona, abrirVehiculo, abrirGuia } = useApp();
  const [tab, setTab] = useState<Tab>("todos");
  const [q, setQ] = useState(busquedaQuery);
  const [page, setPage] = useState(1);
  const PER = 20;

  const query = q.toLowerCase().trim();

  const personasRes = personas.filter((p) => !query || p.nombre.toLowerCase().includes(query) || p.cedula.includes(query) || (p.nit && p.nit.includes(query)));
  const vehiculosRes = vehiculos.filter((v) => !query || v.placa.toLowerCase().includes(query));
  const guiasRes = guias.filter((g) => !query || g.numero.includes(query) || g.nombreCliente.toLowerCase().includes(query));
  const registrosRes = registros.filter((r) => !query || r.id.toLowerCase().includes(query) || descripcionCorta(r).toLowerCase().includes(query));

  const TABS: { id: Tab; label: string; count: number }[] = [
    { id: "todos", label: "Todos", count: personasRes.length + vehiculosRes.length + guiasRes.length + registrosRes.length },
    { id: "personas", label: "Personas", count: personasRes.length },
    { id: "vehiculos", label: "Vehículos", count: vehiculosRes.length },
    { id: "guias", label: "Guías", count: guiasRes.length },
    { id: "registros", label: "Registros", count: registrosRes.length },
  ];

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-bold mb-4">Búsqueda avanzada</h1>

        {/* Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-5 h-5" />
          <input
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-card text-base focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Buscar por cédula, NIT, placa, guía, nombre o descripción..."
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-border">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPage(1); }}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px ${
                tab === t.id ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label} <span className="ml-1 text-xs opacity-70">({t.count})</span>
            </button>
          ))}
        </div>

        {/* Resultados */}
        <div className="space-y-2">
          {(tab === "todos" || tab === "personas") && personasRes.length > 0 && (
            <div>
              {tab === "todos" && <h3 className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">👤 Personas</h3>}
              {personasRes.slice(0, tab === "todos" ? 3 : 999).map((p) => (
                <button key={p.id} onClick={() => abrirPersona(p.id)} className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:shadow-card-hover transition-all flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-coordinadora-blue text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
                    {p.nombre.split(" ").slice(0, 2).map((n) => n[0]).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">{p.tipo === "cliente" ? `NIT ${p.nit}` : `CC ${p.cedula}`} · {p.cargo} · {p.terminal}</div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.estado === "bloqueado" ? "bg-red-100 text-red-700" : p.estado === "en_seguimiento" ? "bg-amber-100 text-amber-700" : "bg-green-100 text-green-700"}`}>
                    {p.estado === "bloqueado" ? "Bloqueado" : p.estado === "en_seguimiento" ? "En seguimiento" : "Sin novedad"}
                  </span>
                </button>
              ))}
            </div>
          )}

          {(tab === "todos" || tab === "vehiculos") && vehiculosRes.length > 0 && (
            <div>
              {tab === "todos" && <h3 className="text-xs font-semibold text-muted-foreground mt-4 mb-2 uppercase tracking-wide">🚛 Vehículos</h3>}
              {vehiculosRes.slice(0, tab === "todos" ? 3 : 999).map((v) => (
                <button key={v.id} onClick={() => abrirVehiculo(v.id)} className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:shadow-card-hover transition-all flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xl">🚛</div>
                  <div className="flex-1">
                    <div className="font-medium text-sm font-mono">{v.placa}</div>
                    <div className="text-xs text-muted-foreground">{v.tipo} · {v.estado === "bloqueado" ? "🔴 Bloqueado" : "🟢 Activo"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(tab === "todos" || tab === "guias") && guiasRes.length > 0 && (
            <div>
              {tab === "todos" && <h3 className="text-xs font-semibold text-muted-foreground mt-4 mb-2 uppercase tracking-wide">📦 Guías</h3>}
              {guiasRes.slice(0, tab === "todos" ? 3 : 999).map((g) => (
                <button key={g.numero} onClick={() => abrirGuia(g.numero)} className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:shadow-card-hover transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center text-xl">📦</div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm font-mono">{g.numero}</div>
                      <div className="text-xs text-muted-foreground">{g.nombreCliente} · {g.terminalOrigen} → {g.terminalDestino}</div>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.estadoGeneral === "con_novedad" ? "bg-amber-100 text-amber-700" : g.estadoGeneral === "cerrada" ? "bg-gray-100 text-gray-700" : "bg-green-100 text-green-700"}`}>
                      {g.estadoGeneral === "con_novedad" ? "Con novedad" : g.estadoGeneral === "cerrada" ? "Cerrada" : "Sin novedad"}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {(tab === "todos" || tab === "registros") && registrosRes.length > 0 && (
            <div>
              {tab === "todos" && <h3 className="text-xs font-semibold text-muted-foreground mt-4 mb-2 uppercase tracking-wide">📋 Registros</h3>}
              {registrosRes.slice((page - 1) * PER, page * PER).map((r) => (
                <button key={r.id} onClick={() => abrirRegistro(r.id)} className="w-full text-left bg-card border border-border rounded-xl px-4 py-3 hover:shadow-card-hover transition-all flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <TipoBadge tipo={r.tipo} /><span className="font-mono text-xs text-muted-foreground">{r.id}</span>
                      <EstadoBadge estado={r.estado} />
                    </div>
                    <div className="text-sm truncate">{descripcionCorta(r)}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.terminal} · {r.fecha}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {query && personasRes.length === 0 && vehiculosRes.length === 0 && guiasRes.length === 0 && registrosRes.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <span className="text-4xl">🔍</span>
              <p className="mt-3 font-medium">No se encontraron resultados para "{q}"</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
