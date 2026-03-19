import React from "react";
import { Home, FileText, Search, Bot, Settings } from "lucide-react";
import { useApp } from "@/context/AppContext";
import type { PaginaActiva } from "@/types";

const items: { id: PaginaActiva; icon: React.ElementType; label: string }[] = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "registros", icon: FileText, label: "Registros" },
  { id: "busqueda", icon: Search, label: "Búsqueda avanzada" },
  { id: "ia", icon: Bot, label: "Asistente IA" },
  { id: "configuracion", icon: Settings, label: "Configuración" },
];

export function Sidebar() {
  const { paginaActiva, setPaginaActiva } = useApp();

  return (
    <aside className="w-[52px] h-full bg-sidebar flex flex-col items-center py-3 gap-1 border-r border-sidebar-border flex-shrink-0">
      {/* Logo mark */}
      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center mb-3">
        <span className="text-white font-bold text-xs">SC</span>
      </div>

      <div className="flex flex-col gap-1 w-full px-2">
        {items.map(({ id, icon: Icon, label }) => (
          <div key={id} className="relative group">
            <button
              onClick={() => setPaginaActiva(id)}
              className={`sidebar-btn w-full ${paginaActiva === id ? "active" : ""}`}
              title={label}
            >
              <Icon className="w-5 h-5" />
            </button>
            {/* Tooltip */}
            <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-foreground text-background text-xs font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
              {label}
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
}
