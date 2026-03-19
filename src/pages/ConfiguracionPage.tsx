import React, { useState } from "react";
import { Toggle } from "@/components/ui/toggle";

export default function ConfiguracionPage() {
  const [notifIA, setNotifIA] = useState(true);
  const [notifAsignados, setNotifAsignados] = useState(true);
  const [notifVencidos, setNotifVencidos] = useState(true);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto p-6">
        <h1 className="text-xl font-bold mb-6">Configuración</h1>

        {/* Mi perfil */}
        <section className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Mi perfil</h2>
          <div className="flex items-center gap-4 mb-5">
            <div className="w-14 h-14 rounded-full bg-coordinadora-blue text-white font-bold text-lg flex items-center justify-center">SH</div>
            <div>
              <div className="font-bold text-base">Sandra Herrera</div>
              <div className="text-sm text-muted-foreground">Coordinadora Nacional de Calidad</div>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[
              ["Nombre completo", "Sandra Herrera Ospina"],
              ["Cargo", "Coordinadora Nacional de Calidad"],
              ["Terminal asignada", "Bogotá"],
              ["Correo electrónico", "s.herrera@coordinadora.com"],
            ].map(([label, value]) => (
              <div key={label}>
                <div className="text-xs text-muted-foreground mb-1">{label}</div>
                <div className="text-sm font-medium bg-muted rounded-lg px-3 py-2">{value}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Notificaciones */}
        <section className="bg-card border border-border rounded-xl p-6 mb-6">
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Preferencias de notificaciones</h2>
          <div className="space-y-4">
            {[
              { label: "Alertas IA críticas", desc: "Notificaciones cuando el sistema detecte patrones de riesgo crítico", value: notifIA, set: setNotifIA },
              { label: "Casos asignados a mí", desc: "Cuando un caso sea asignado a mi usuario", value: notifAsignados, set: setNotifAsignados },
              { label: "Casos vencidos", desc: "Recordatorios de casos que llevan más de 30 días sin gestión", value: notifVencidos, set: setNotifVencidos },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-sm">{item.label}</div>
                  <div className="text-xs text-muted-foreground">{item.desc}</div>
                </div>
                <button
                  onClick={() => item.set(!item.value)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${item.value ? "bg-coordinadora-blue" : "bg-muted-foreground/30"}`}
                >
                  <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${item.value ? "translate-x-5" : "translate-x-0"}`} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Acerca de */}
        <section className="bg-card border border-border rounded-xl p-6">
          <h2 className="font-semibold mb-4 text-sm uppercase tracking-wide text-muted-foreground">Acerca de</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between"><span>Versión</span><span className="font-mono">1.0 — Prototipo MVP</span></div>
            <div className="flex justify-between"><span>Entorno</span><span>Desarrollo interno</span></div>
            <div className="pt-3 border-t border-border text-center text-xs">
              Sigo Calidad © 2026 Coordinadora Mercantil S.A.<br />
              <span className="text-muted-foreground/60">Todos los derechos reservados</span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
