import React, { useState } from "react";
import { useApp } from "@/context/AppContext";
import { registros, alertasIA, personas, vehiculos } from "@/data/mockData";
import { TipoBadge, EstadoBadge, SeveridadBadge, AvatarInicial, formatDateTime, descripcionCorta } from "@/lib/utils-app";
import { Plus } from "lucide-react";

const TIPOS = ["todos", "faltante", "evento", "rce", "posventa", "lesiva", "contacto", "evidencia"] as const;

export default function InicioPage() {
  const { abrirRegistro, abrirPersona, abrirVehiculo, setPaginaActiva, setNuevaRegistroAbierto } = useApp();
  const [filtroTipo, setFiltroTipo] = useState<string>("todos");

  const feed = [...registros]
    .filter((r) => filtroTipo === "todos" || r.tipo === filtroTipo)
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 20);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">Buenos días, Sandra 👋</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {new Date().toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>
          <button
            onClick={() => setNuevaRegistroAbierto(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Nuevo registro
          </button>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Feed actividad */}
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {TIPOS.map((t) => (
                <button
                  key={t}
                  onClick={() => setFiltroTipo(t)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors border ${
                    filtroTipo === t
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border text-muted-foreground hover:bg-muted"
                  }`}
                >
                  {t === "todos" ? "Todos" : t === "faltante" ? "Faltantes" : t === "evento" ? "Eventos" : t === "rce" ? "RCE" : t === "posventa" ? "Posventa" : t === "lesiva" ? "Lesivas" : t === "contacto" ? "Contacto" : "Evidencias"}
                </button>
              ))}
            </div>

            <div className="space-y-2">
              {feed.map((r) => (
                <button
                  key={r.id}
                  onClick={() => abrirRegistro(r.id)}
                  className="w-full bg-card border border-border rounded-xl p-4 text-left hover:shadow-card-hover hover:border-ring/30 transition-all group"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <TipoBadge tipo={r.tipo} />
                        <span className="text-xs font-mono text-muted-foreground">{r.id}</span>
                        <EstadoBadge estado={r.estado} />
                      </div>
                      <p className="text-sm font-medium text-foreground truncate">{descripcionCorta(r)}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <span>📍 {r.terminal}</span>
                        <span>🗓 {r.fecha}</span>
                        <span>👤 {r.responsableNombre}</span>
                        {r.diasAbierto > 0 && <span className={r.diasAbierto > 30 ? "text-red-500 font-medium" : ""}>{r.diasAbierto}d abierto</span>}
                      </div>
                    </div>
                    <div className="text-muted-foreground group-hover:text-foreground transition-colors text-xs">→</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Panel IA */}
          <div>
            <div className="sticky top-0">
              <h2 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                Alertas IA activas
              </h2>
              <div className="space-y-3">
                {alertasIA.map((a) => (
                  <div
                    key={a.id}
                    className={`border rounded-xl p-3 ${
                      a.severidad === "critica" ? "bg-red-50 border-red-200" :
                      a.severidad === "alta" ? "bg-amber-50 border-amber-200" :
                      "bg-blue-50 border-blue-200"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <SeveridadBadge severidad={a.severidad} />
                    </div>
                    <p className="text-xs font-semibold text-foreground leading-snug mb-1">{a.titulo}</p>
                    <p className="text-xs text-muted-foreground leading-snug mb-2">{a.descripcion.slice(0, 100)}...</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {a.entidadesInvolucradas.map((e) => (
                        <button
                          key={e.id}
                          className="text-xs text-coordinadora-blue underline hover:no-underline"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            if (e.tipo === "persona") abrirPersona(e.id);
                            else if (e.tipo === "vehiculo") abrirVehiculo(e.id);
                          }}
                        >
                          {e.nombre}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setPaginaActiva("ia")}
                      className="text-xs font-medium text-coordinadora-blue hover:underline"
                    >
                      Ver detalle →
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
