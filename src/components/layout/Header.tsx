import React, { useState, useRef, useEffect } from "react";
import { Search, Bell, ChevronDown } from "lucide-react";
import { useApp } from "@/context/AppContext";
import { personas, vehiculos, guias, eventos, notificaciones } from "@/data/mockData";
import { categoriaConfig, descripcionCorta, AvatarInicial } from "@/lib/utils-app";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

// ---- Barra de búsqueda universal ----
function SearchBar() {
  const { setBusquedaQuery, setPaginaActiva, abrirRegistro, abrirPersona, abrirVehiculo, abrirGuia } = useApp();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const q = query.toLowerCase().trim();

  const personasRes = q.length > 1 ? personas.filter((p) =>
    p.nombre.toLowerCase().includes(q) || p.cedula.includes(q) || (p.nit && p.nit.includes(q))
  ).slice(0, 4) : [];

  const vehiculosRes = q.length > 1 ? vehiculos.filter((v) =>
    v.placa.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const guiasRes = q.length > 1 ? guias.filter((g) =>
    g.numero.includes(q) || g.nombreCliente.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const registrosRes = q.length > 1 ? registros.filter((r) =>
    r.id.toLowerCase().includes(q) || descripcionCorta(r).toLowerCase().includes(q)
  ).slice(0, 4) : [];

  const hasResults = personasRes.length + vehiculosRes.length + guiasRes.length + registrosRes.length > 0;

  return (
    <div ref={ref} className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          className="w-full pl-9 pr-4 py-2 rounded-lg border border-border bg-card text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent placeholder:text-muted-foreground"
          placeholder="Buscar por guía, cédula, placa, NIT o nombre..."
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(e.target.value.length > 1); }}
          onFocus={() => query.length > 1 && setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              setBusquedaQuery(query);
              setPaginaActiva("registros");
              setOpen(false);
            }
          }}
        />
      </div>

      {open && (
        <div className="absolute top-full mt-1 w-full bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden fade-in">
          {!hasResults && q.length > 1 && (
            <div className="px-4 py-6 text-center text-sm text-muted-foreground">
              No se encontraron resultados para "{query}"
            </div>
          )}

          {personasRes.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 border-b border-border">
                👤 Personas
              </div>
              {personasRes.map((p) => (
                <button
                  key={p.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left text-sm transition-colors"
                  onClick={() => { abrirPersona(p.id); setOpen(false); setQuery(""); }}
                >
                  <AvatarInicial nombre={p.nombre} size="sm" />
                  <div>
                    <div className="font-medium">{p.nombre}</div>
                    <div className="text-xs text-muted-foreground">
                      CC {p.cedula || p.nit} · {p.tipo === "cliente" ? "Cliente" : p.cargo} · {p.terminal}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {vehiculosRes.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 border-b border-border">
                🚛 Vehículos
              </div>
              {vehiculosRes.map((v) => (
                <button
                  key={v.id}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left text-sm transition-colors"
                  onClick={() => { abrirVehiculo(v.id); setOpen(false); setQuery(""); }}
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-base">🚛</div>
                  <div>
                    <div className="font-medium">{v.placa}</div>
                    <div className="text-xs text-muted-foreground">{v.tipo} · {v.estado === "bloqueado" ? "🔴 Bloqueado" : "🟢 Activo"}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {guiasRes.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 border-b border-border">
                📦 Guías
              </div>
              {guiasRes.map((g) => (
                <button
                  key={g.numero}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left text-sm transition-colors"
                  onClick={() => { abrirGuia(g.numero); setOpen(false); setQuery(""); }}
                >
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-base">📦</div>
                  <div>
                    <div className="font-medium font-mono">{g.numero}</div>
                    <div className="text-xs text-muted-foreground">{g.nombreCliente} · {g.terminalOrigen} → {g.terminalDestino}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {registrosRes.length > 0 && (
            <div>
              <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/40 border-b border-border">
                📋 Registros
              </div>
              {registrosRes.map((r) => {
                const cfg = tipoConfig[r.tipo];
                return (
                  <button
                    key={r.id}
                    className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted text-left text-sm transition-colors"
                    onClick={() => { abrirRegistro(r.id); setOpen(false); setQuery(""); }}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs ${cfg.dot} bg-opacity-20`}>
                      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    </div>
                    <div>
                      <div className="font-medium">{r.id}</div>
                      <div className="text-xs text-muted-foreground truncate max-w-[300px]">{descripcionCorta(r)}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          <button
            className="w-full px-3 py-2 text-xs text-coordinadora-blue hover:bg-muted text-center border-t border-border transition-colors"
            onClick={() => { setBusquedaQuery(query); setPaginaActiva("registros"); setOpen(false); }}
          >
            Ver todos los resultados para "{query}" →
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Notificaciones ----
function NotificacionesPopover() {
  const { abrirRegistro, setPaginaActiva } = useApp();
  const [open, setOpen] = useState(false);
  const [notifs, setNotifs] = useState(notificaciones);
  const ref = useRef<HTMLDivElement>(null);

  const noLeidas = notifs.filter((n) => !n.leida).length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleClick(n: typeof notifs[0]) {
    setNotifs((prev) => prev.map((x) => (x.id === n.id ? { ...x, leida: true } : x)));
    setOpen(false);
    if (n.linkTipo === "registro" && n.linkRegistroId) {
      abrirRegistro(n.linkRegistroId);
    } else if (n.tipo === "alerta_ia") {
      setPaginaActiva("ia");
    }
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative p-2 rounded-lg hover:bg-muted transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground" />
        {noLeidas > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-white text-[10px] rounded-full flex items-center justify-center font-bold">
            {noLeidas}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden fade-in">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-sm">Notificaciones</h3>
            {noLeidas > 0 && (
              <span className="text-xs text-coordinadora-blue font-medium">{noLeidas} sin leer</span>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto divide-y divide-border">
            {notifs.map((n) => (
              <button
                key={n.id}
                className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors flex gap-3 ${!n.leida ? "bg-blue-50/60" : ""}`}
                onClick={() => handleClick(n)}
              >
                <div className="flex-1 min-w-0">
                  <p className={`text-sm leading-snug ${!n.leida ? "font-medium" : "text-muted-foreground"}`}>
                    {n.texto}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{n.tiempo}</p>
                </div>
                {!n.leida && <div className="w-2 h-2 rounded-full bg-coordinadora-blue flex-shrink-0 mt-1.5" />}
              </button>
            ))}
          </div>
          <button
            className="w-full px-4 py-2.5 text-xs text-coordinadora-blue hover:bg-muted text-center border-t border-border transition-colors font-medium"
            onClick={() => { setPaginaActiva("ia"); setOpen(false); }}
          >
            Ver todas las alertas →
          </button>
        </div>
      )}
    </div>
  );
}

// ---- Header principal ----
export function Header() {
  return (
    <header className="h-14 border-b border-border bg-card flex items-center gap-4 px-4 flex-shrink-0 z-40">
      {/* Logo */}
      <div className="flex items-center gap-2 flex-shrink-0 w-[52px]">
        <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
          <span className="text-white font-bold text-xs">SC</span>
        </div>
      </div>

      {/* Nombre */}
      <div className="hidden md:block flex-shrink-0">
        <span className="font-bold text-sm text-primary">Sigo Calidad</span>
        <span className="text-xs text-muted-foreground ml-1">| Coordinadora</span>
      </div>

      {/* Search */}
      <div className="flex-1 flex justify-center px-4">
        <SearchBar />
      </div>

      {/* Acciones */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <NotificacionesPopover />
        <div className="flex items-center gap-2 pl-2 border-l border-border cursor-pointer hover:bg-muted rounded-lg px-2 py-1 transition-colors">
          <AvatarInicial nombre="Sandra Herrera" size="sm" />
          <div className="hidden md:block text-right">
            <div className="text-xs font-semibold">Sandra Herrera</div>
            <div className="text-[10px] text-muted-foreground">Coordinadora Nacional</div>
          </div>
          <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
        </div>
      </div>
    </header>
  );
}
