import React, { useState } from "react";
import { alertasIA, registros } from "@/data/mockData";
import { SeveridadBadge, TipoBadge, EstadoBadge, descripcionCorta } from "@/lib/utils-app";
import { useApp } from "@/context/AppContext";
import type { AlertaIA } from "@/types";

const METRICAS = [
  { label: "5 personas en más de 2 registros este mes", tipo: "reincidencia_persona" },
  { label: "2 terminales con incremento >30% en faltantes", tipo: "terminal_anomala" },
  { label: "3 clientes con más de 3 reclamaciones en 30 días", tipo: "cliente_sospechoso" },
];

export default function IAPage() {
  const { abrirPersona, abrirVehiculo, abrirRegistro, abrirTerminal } = useApp();
  const [filtroSeveridad, setFiltroSeveridad] = useState("todos");
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [alertas, setAlertas] = useState<AlertaIA[]>(alertasIA);
  const [metricaFiltro, setMetricaFiltro] = useState<string | null>(null);

  const filtradas = alertas
    .filter((a) => filtroSeveridad === "todos" || a.severidad === filtroSeveridad)
    .filter((a) => filtroTipo === "todos" || a.tipo === filtroTipo || (metricaFiltro && a.tipo === metricaFiltro))
    .filter((a) => filtroEstado === "todos" || a.estado === filtroEstado)
    .filter((a) => !metricaFiltro || a.tipo === metricaFiltro);

  function cambiarEstado(id: string, nuevoEstado: AlertaIA["estado"]) {
    setAlertas((prev) => prev.map((a) => (a.id === id ? { ...a, estado: nuevoEstado } : a)));
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-6">
        <h1 className="text-xl font-bold mb-1">Asistente IA</h1>
        <p className="text-sm text-muted-foreground mb-6">Patrones detectados automáticamente en los registros</p>

        {/* Resumen de patrones */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {METRICAS.map((m) => (
            <button
              key={m.tipo}
              onClick={() => setMetricaFiltro(metricaFiltro === m.tipo ? null : m.tipo)}
              className={`p-4 rounded-xl border text-left transition-all ${
                metricaFiltro === m.tipo
                  ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                  : "border-border bg-card hover:shadow-card-hover"
              }`}
            >
              <div className="text-2xl mb-2">🤖</div>
              <p className="text-sm font-medium">{m.label}</p>
              <p className="text-xs text-muted-foreground mt-1">Click para filtrar alertas</p>
            </button>
          ))}
        </div>

        {/* Filtros alertas */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <h2 className="text-base font-semibold flex-1">Alertas activas</h2>
          <select className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none" value={filtroSeveridad} onChange={(e) => setFiltroSeveridad(e.target.value)}>
            <option value="todos">Todas las severidades</option>
            <option value="critica">🔴 Crítica</option>
            <option value="alta">🟡 Alta</option>
            <option value="media">🔵 Media</option>
            <option value="baja">🟢 Baja</option>
          </select>
          <select className="text-xs border border-border rounded-lg px-2 py-1.5 bg-background focus:outline-none" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="todos">Todos los estados</option>
            <option value="nueva">Nueva</option>
            <option value="revisada">Revisada</option>
            <option value="descartada">Descartada</option>
          </select>
          {metricaFiltro && (
            <button onClick={() => setMetricaFiltro(null)} className="text-xs text-coordinadora-blue underline">Limpiar filtro</button>
          )}
        </div>

        <div className="space-y-4">
          {filtradas.map((a) => (
            <div
              key={a.id}
              className={`border rounded-xl p-5 ${
                a.severidad === "critica" ? "bg-red-50 border-red-200" :
                a.severidad === "alta" ? "bg-amber-50 border-amber-200" :
                "bg-blue-50 border-blue-200"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <SeveridadBadge severidad={a.severidad} />
                    <span className="text-xs text-muted-foreground">Detectado: {a.fechaDeteccion}</span>
                    <select
                      value={a.estado}
                      onChange={(e) => cambiarEstado(a.id, e.target.value as AlertaIA["estado"])}
                      className="text-xs border border-border rounded px-2 py-0.5 bg-white focus:outline-none"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="nueva">🔔 Nueva</option>
                      <option value="revisada">👁 Revisada</option>
                      <option value="descartada">✓ Descartada</option>
                    </select>
                  </div>
                  <h3 className="font-semibold text-sm mb-2">{a.titulo}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed mb-3">{a.descripcion}</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    <span className="text-xs text-muted-foreground font-medium">Entidades:</span>
                    {a.entidadesInvolucradas.map((e) => (
                      <button
                        key={e.id}
                        className="text-xs text-coordinadora-blue font-medium underline hover:no-underline"
                        onClick={() => {
                          if (e.tipo === "persona") abrirPersona(e.id);
                          else if (e.tipo === "vehiculo") abrirVehiculo(e.id);
                          else if (e.tipo === "terminal") abrirTerminal(e.nombre);
                        }}
                      >
                        {e.nombre}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Fuentes:</span>
                    {a.fuentesCruzadas.map((f) => (
                      <button
                        key={f}
                        onClick={() => abrirRegistro(f)}
                        className="text-xs px-2 py-0.5 rounded-full bg-white border border-border hover:bg-muted transition-colors font-mono"
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filtradas.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <span className="text-4xl">🤖</span>
              <p className="mt-3 font-medium">No hay alertas con los filtros seleccionados</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
