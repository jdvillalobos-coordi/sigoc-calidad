import React, { useState } from "react";
import { registros, alertasIA, personas, vehiculos, PAISES_REGIONALES, TODAS_TERMINALES, REGIONALES_FLAT } from "@/data/mockData";
import { useApp } from "@/context/AppContext";
import { TipoBadge, EstadoBadge, descripcionCorta } from "@/lib/utils-app";
import { FolderOpen, Clock, Search, Bot, ChevronRight, Users, Truck } from "lucide-react";
import { format, parseISO, isWithinInterval, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { AlertaIA } from "@/types";
import type { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon, X, ChevronDown } from "lucide-react";

// ── KPI card ──────────────────────────────────────────────────────────────────

function KPICard({
  label, value, sub, color = "default", icon: Icon, onClick,
}: {
  label: string; value: number | string; sub?: string;
  color?: "default" | "red" | "amber" | "blue";
  icon: React.ElementType; onClick?: () => void;
}) {
  const iconColor = {
    default: "bg-primary/10 text-primary",
    red:     "bg-destructive/10 text-destructive",
    amber:   "bg-amber-100 text-amber-600",
    blue:    "bg-blue-100 text-blue-600",
  }[color];

  const valueColor = {
    default: "text-foreground",
    red:     "text-destructive",
    amber:   "text-amber-600",
    blue:    "text-blue-600",
  }[color];

  return (
    <button
      onClick={onClick}
      className={`bg-card border border-border rounded-xl p-5 flex flex-col gap-3 text-left transition-all ${onClick ? "hover:shadow-md hover:border-primary/30 cursor-pointer" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div>
        <div className={`text-3xl font-bold ${valueColor}`}>{value}</div>
        {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
      </div>
    </button>
  );
}

// ── Alerta card (reutilizable) ────────────────────────────────────────────────

function AlertaCard({
  alerta, onPersona, onTerminal, onMarcar,
}: {
  alerta: AlertaIA;
  onPersona: (id: string) => void;
  onTerminal: (nombre: string) => void;
  onMarcar: (id: string) => void;
}) {
  const dotColor = {
    critica: "bg-destructive",
    alta:    "bg-orange-500",
    media:   "bg-amber-400",
    baja:    "bg-green-500",
  }[alerta.severidad];

  const bgColor = {
    critica: "border-destructive/20 bg-destructive/5",
    alta:    "border-orange-200 bg-orange-50",
    media:   "border-amber-200 bg-amber-50",
    baja:    "border-green-200 bg-green-50",
  }[alerta.severidad];

  return (
    <div className={`rounded-xl border p-4 ${bgColor}`}>
      <div className="flex items-start gap-3">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${dotColor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-snug">{alerta.titulo}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">{alerta.descripcion}</p>
          {alerta.entidadesInvolucradas.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {alerta.entidadesInvolucradas.map((e) => (
                <button
                  key={e.id}
                  onClick={() => e.tipo === "persona" ? onPersona(e.id) : onTerminal(e.nombre)}
                  className="text-[11px] font-medium text-primary underline hover:no-underline"
                >
                  {e.nombre}
                </button>
              ))}
            </div>
          )}
        </div>
        {alerta.estado === "nueva" && (
          <button
            onClick={() => onMarcar(alerta.id)}
            className="flex-shrink-0 text-[10px] px-2 py-1 rounded-full border border-border bg-card text-muted-foreground hover:text-foreground transition-colors"
          >
            Marcar revisada
          </button>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function InicioPage() {
  const { setPaginaActiva, abrirRegistro, abrirPersona, abrirTerminal } = useApp();
  const [alertas, setAlertas] = React.useState<AlertaIA[]>(alertasIA);

  // ── KPI calculations ──────────────────────────────────────────────────────
  const abiertos   = registros.filter((r) => r.estado !== "cerrado");
  const vencidos   = registros.filter((r) => r.diasAbierto > 30 && r.estado !== "cerrado");
  const enVerif    = registros.filter((r) => r.tipo === "faltante" && r.stepper?.etapaActiva === "verificacion");
  const alertasNew = alertas.filter((a) => a.estado === "nueva");
  const criticas   = alertasNew.filter((a) => a.severidad === "critica");

  // ── Top 5 alertas sorted by severity ─────────────────────────────────────
  const sevOrder: Record<string, number> = { critica: 0, alta: 1, media: 2, baja: 3 };
  const topAlertas = [...alertas]
    .filter((a) => a.estado !== "descartada")
    .sort((a, b) => sevOrder[a.severidad] - sevOrder[b.severidad])
    .slice(0, 5);

  // ── Latest 10 records ─────────────────────────────────────────────────────
  const ultimos10 = [...registros]
    .sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime())
    .slice(0, 10);

  function marcarRevisada(id: string) {
    setAlertas((prev) => prev.map((a) => a.id === id ? { ...a, estado: "revisada" } : a));
  }

  const fechaHoy = format(new Date(), "EEEE d 'de' MMMM, yyyy", { locale: es });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6 space-y-8">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-foreground">Dashboard de Calidad</h1>
          <p className="text-sm text-muted-foreground capitalize mt-0.5">{fechaHoy}</p>
        </div>

        {/* Sección 1 — 4 KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPICard
            label="Casos abiertos"
            value={abiertos.length}
            sub={`de ${registros.length} totales`}
            icon={FolderOpen}
            onClick={() => setPaginaActiva("registros")}
          />
          <KPICard
            label="Vencidos >30d"
            value={vencidos.length}
            sub={vencidos.length > 0 ? "requieren cierre urgente" : "sin vencidos"}
            color={vencidos.length > 0 ? "red" : "default"}
            icon={Clock}
            onClick={() => setPaginaActiva("registros")}
          />
          <KPICard
            label="Esperando verificación"
            value={enVerif.length}
            sub="faltantes en campo"
            color="amber"
            icon={Search}
            onClick={() => setPaginaActiva("registros")}
          />
          <KPICard
            label="Alertas IA activas"
            value={alertasNew.length}
            sub={criticas.length > 0 ? `${criticas.length} críticas` : "sin críticas"}
            color={criticas.length > 0 ? "red" : "blue"}
            icon={Bot}
            onClick={() => setPaginaActiva("ia")}
          />
        </div>

        {/* Sección 2 — Alertas IA */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
              <Bot className="w-4 h-4 text-primary" />
              Alertas IA
            </h2>
            <button
              onClick={() => setPaginaActiva("ia")}
              className="text-xs text-primary font-medium flex items-center gap-0.5 hover:underline"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="space-y-3">
            {topAlertas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground bg-card border border-border rounded-xl">
                <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Sin alertas activas</p>
              </div>
            ) : topAlertas.map((a) => (
              <AlertaCard
                key={a.id}
                alerta={a}
                onPersona={abrirPersona}
                onTerminal={abrirTerminal}
                onMarcar={marcarRevisada}
              />
            ))}
          </div>
        </div>

        {/* Sección 3 — Últimos registros */}
        <div>
          <h2 className="text-base font-semibold text-foreground mb-3">📋 Últimos registros</h2>
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            {ultimos10.map((r, i) => {
              let tiempoRelativo = "";
              try {
                tiempoRelativo = formatDistanceToNow(parseISO(r.fecha), { addSuffix: true, locale: es });
              } catch {
                tiempoRelativo = r.fecha;
              }
              return (
                <button
                  key={r.id}
                  onClick={() => abrirRegistro(r.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted transition-colors ${i > 0 ? "border-t border-border" : ""}`}
                >
                  <TipoBadge tipo={r.tipo} className="flex-shrink-0" />
                  <span className="text-xs font-mono text-muted-foreground flex-shrink-0 w-16">{r.id}</span>
                  <span className="flex-1 text-xs text-foreground truncate min-w-0">{descripcionCorta(r)}</span>
                  <span className="text-xs text-muted-foreground flex-shrink-0 hidden sm:block w-20 truncate">{r.terminal}</span>
                  <EstadoBadge estado={r.estado} className="flex-shrink-0" />
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 w-16 text-right hidden md:block">{tiempoRelativo}</span>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
