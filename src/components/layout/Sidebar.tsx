import React from "react";
import { Home, FileText, Bot, ChevronRight, ChevronLeft, Camera, Inbox, Settings, Users } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { useSidebarState } from "@/context/SidebarContext";
import type { PaginaActiva } from "@/types";

const items: { id: PaginaActiva; icon: React.ElementType; label: string }[] = [
  { id: "inicio", icon: Home, label: "Inicio" },
  { id: "bandeja", icon: Inbox, label: "Bandeja" },
  { id: "registros", icon: FileText, label: "Eventos" },
  { id: "cuadro_contacto", icon: Users, label: "Cuadro de Contacto" },
  { id: "evidencias", icon: Camera, label: "Evidencias" },
  { id: "ia", icon: Bot, label: "Asistente IA" },
];

const bottomItems: { id: PaginaActiva; icon: React.ElementType; label: string }[] = [
  { id: "configuracion", icon: Settings, label: "Configuración" },
];

export function Sidebar() {
  const { paginaActiva, setPaginaActiva } = useApp();
  const { expanded, toggleExpanded } = useSidebarState();

  return (
    <aside
      className={`
        h-full bg-sidebar flex flex-col items-start py-3 border-r border-sidebar-border flex-shrink-0
        transition-all duration-300 ease-in-out overflow-hidden
        ${expanded ? "w-52" : "w-[52px]"}
      `}
    >
      {/* Logo mark */}
      <div className={`flex items-center gap-2.5 mb-3 px-2.5 w-full`}>
        <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
          <span className="text-white font-bold text-xs">SC</span>
        </div>
        {expanded && (
          <div className="overflow-hidden">
            <div className="text-white font-semibold text-sm leading-tight whitespace-nowrap">Sigo Calidad</div>
            <div className="text-white/50 text-[10px] whitespace-nowrap">Coordinadora</div>
          </div>
        )}
      </div>

      {/* Nav items */}
      <div className="flex flex-col gap-0.5 w-full px-2 flex-1">
        {items.map(({ id, icon: Icon, label }) => (
          <div key={id} className="relative group">
            <button
              onClick={() => setPaginaActiva(id)}
              className={`
                flex items-center gap-3 w-full rounded-md px-2 py-2 transition-colors text-left
                ${paginaActiva === id
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              `}
              title={!expanded ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {expanded && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {label}
                </span>
              )}
            </button>
            {/* Tooltip solo cuando está colapsado */}
            {!expanded && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-foreground text-background text-xs font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Bottom nav items (Configuración) */}
      <div className="flex flex-col gap-0.5 w-full px-2 pb-1">
        {bottomItems.map(({ id, icon: Icon, label }) => (
          <div key={id} className="relative group">
            <button
              onClick={() => setPaginaActiva(id)}
              className={`
                flex items-center gap-3 w-full rounded-md px-2 py-2 transition-colors text-left
                ${paginaActiva === id
                  ? "bg-white/20 text-white"
                  : "text-white/70 hover:bg-white/10 hover:text-white"
                }
              `}
              title={!expanded ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {expanded && (
                <span className="text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                  {label}
                </span>
              )}
            </button>
            {!expanded && (
              <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 bg-foreground text-background text-xs font-medium px-2 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                {label}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toggle button */}
      <div className="w-full px-2 mt-2 pt-2 border-t border-white/10">
        <button
          onClick={toggleExpanded}
          className="flex items-center gap-3 w-full rounded-md px-2 py-2 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
          title={expanded ? "Colapsar menú" : "Expandir menú"}
        >
          {expanded ? (
            <>
              <ChevronLeft className="w-5 h-5 flex-shrink-0" />
              <span className="text-xs font-medium whitespace-nowrap">Colapsar</span>
            </>
          ) : (
            <ChevronRight className="w-5 h-5 flex-shrink-0" />
          )}
        </button>
      </div>
    </aside>
  );
}
