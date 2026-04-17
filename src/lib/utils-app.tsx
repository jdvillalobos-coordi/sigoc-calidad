import React from "react";
import type { CategoriaEvento, EstadoEvento, SeveridadIA, Evento } from "@/types";

// ---- Colores por categoría ----
export const categoriaConfig: Record<CategoriaEvento, { label: string; color: string; dot: string; icon: string; bgColor: string }> = {
  dineros:             { label: "Dineros",            color: "badge-dineros",    dot: "bg-green-600",  icon: "💰", bgColor: "bg-green-600" },
  unidades:            { label: "Unidades",           color: "badge-unidades",   dot: "bg-blue-600",   icon: "📦", bgColor: "bg-blue-600" },
  listas_vinculantes:  { label: "Listas Vinculantes", color: "badge-listas",     dot: "bg-gray-500",   icon: "📋", bgColor: "bg-gray-500" },
  pqr:                 { label: "Solicitudes Postventa", color: "badge-pqr",        dot: "bg-purple-600", icon: "📞", bgColor: "bg-purple-600" },
  disciplinarios:      { label: "Disciplinarios",     color: "badge-disciplinarios", dot: "bg-red-600",    icon: "⚖️", bgColor: "bg-red-600" },
  evidencias:          { label: "Evidencias",         color: "badge-evidencias",     dot: "bg-orange-500", icon: "📸", bgColor: "bg-orange-500" },
  eventos_seguridad:   { label: "Eventos Seguridad", color: "badge-seguridad",      dot: "bg-amber-600",  icon: "🛡️", bgColor: "bg-amber-600" },
};

export const estadoConfig: Record<EstadoEvento, { label: string; color: string }> = {
  abierto: { label: "Abierto", color: "estado-abierto" },
  cerrado: { label: "Cerrado", color: "estado-cerrado" },
};

export const severidadConfig: Record<SeveridadIA, { label: string; color: string; icon: string; bg: string }> = {
  critica: { label: "Crítica", color: "text-red-600",   icon: "🔴", bg: "bg-red-50 border-red-200" },
  alta:    { label: "Alta",    color: "text-amber-600", icon: "🟠", bg: "bg-amber-50 border-amber-200" },
  media:   { label: "Media",   color: "text-blue-600",  icon: "🟡", bg: "bg-blue-50 border-blue-200" },
  baja:    { label: "Baja",    color: "text-green-600", icon: "🟢", bg: "bg-green-50 border-green-200" },
};


export function formatCurrency(value: number, currency = "COP", locale = "es-CO"): string {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function descripcionCorta(evento: Evento): string {
  if (evento.tipoEvento) return evento.tipoEvento;
  return evento.id;
}

// Badge components
export function CategoriaBadge({ categoria, className = "" }: { categoria: CategoriaEvento; className?: string }) {
  const cfg = categoriaConfig[categoria];
  // Inline colors to avoid Tailwind purge issues
  const colorMap: Record<CategoriaEvento, string> = {
    dineros:            "bg-green-100 text-green-800 border border-green-200",
    unidades:           "bg-blue-100 text-blue-800 border border-blue-200",
    listas_vinculantes: "bg-gray-100 text-gray-700 border border-gray-200",
    pqr:                "bg-purple-100 text-purple-800 border border-purple-200",
    disciplinarios:     "bg-red-100 text-red-800 border border-red-200",
    evidencias:          "bg-orange-100 text-orange-800 border border-orange-200",
    eventos_seguridad:   "bg-amber-100 text-amber-800 border border-amber-200",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[categoria]} ${className}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
      {cfg.label}
    </span>
  );
}

export function EstadoBadge({ estado, className = "" }: { estado: EstadoEvento; className?: string }) {
  const colorMap: Record<EstadoEvento, string> = {
    abierto: "bg-amber-100 text-amber-700 border border-amber-200",
    cerrado: "bg-gray-100 text-gray-600 border border-gray-200",
  };
  const label = estado === "abierto" ? "Abierto" : "Cerrado";
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${colorMap[estado]} ${className}`}>
      {label}
    </span>
  );
}

export function SeveridadBadge({ severidad }: { severidad: SeveridadIA }) {
  const cfg = severidadConfig[severidad];
  return (
    <span className={`inline-flex items-center gap-1 text-sm font-semibold ${cfg.color}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}


// Avatar inicial
export function AvatarInicial({ nombre, size = "sm" }: { nombre: string; size?: "sm" | "md" | "lg" }) {
  const initials = nombre
    .split(" ")
    .slice(0, 2)
    .map((n) => n[0])
    .join("")
    .toUpperCase();
  const sizes = { sm: "w-7 h-7 text-xs", md: "w-9 h-9 text-sm", lg: "w-12 h-12 text-base" };
  return (
    <div className={`${sizes[size]} rounded-full bg-coordinadora-blue text-white font-semibold flex items-center justify-center flex-shrink-0`}>
      {initials}
    </div>
  );
}
