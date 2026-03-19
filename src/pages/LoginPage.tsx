import React, { useState } from "react";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false);

  function handleGoogle() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      onLogin();
    }, 1400);
  }

  return (
    <div className="min-h-screen flex bg-background">
      {/* Panel izquierdo — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[45%] bg-primary text-primary-foreground p-12 relative overflow-hidden">
        {/* Patrón decorativo */}
        <div className="absolute inset-0 opacity-5">
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Círculos decorativos */}
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full border border-white/10" />
        <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full border border-white/10" />
        <div className="absolute top-1/3 -right-20 w-80 h-80 rounded-full border border-white/10" />

        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <span className="text-white font-bold text-sm">SC</span>
            </div>
            <div>
              <div className="font-bold text-lg leading-tight">Sigo Calidad</div>
              <div className="text-white/60 text-xs">Coordinadora Mercantil</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 space-y-6">
          <blockquote className="space-y-3">
            <p className="text-2xl font-semibold leading-snug text-white/90">
              "La plataforma centralizada que reemplaza tus hojas de cálculo y te da control total sobre las investigaciones de calidad."
            </p>
          </blockquote>

          <div className="flex gap-6 pt-2">
            {[
              { value: "45+", label: "Registros activos" },
              { value: "7", label: "Terminales" },
              { value: "5", label: "Alertas IA" },
            ].map(({ value, label }) => (
              <div key={label}>
                <div className="text-2xl font-bold">{value}</div>
                <div className="text-white/60 text-xs mt-0.5">{label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 text-white/40 text-xs">
          Versión 1.0 — MVP Prototipo © 2026
        </div>
      </div>

      {/* Panel derecho — login */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        <div className="w-full max-w-sm space-y-8">
          {/* Logo mobile */}
          <div className="lg:hidden flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SC</span>
            </div>
            <div>
              <div className="font-bold text-base">Sigo Calidad</div>
              <div className="text-muted-foreground text-xs">Coordinadora Mercantil</div>
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-foreground">Bienvenido</h1>
            <p className="text-muted-foreground text-sm">
              Inicia sesión con tu cuenta corporativa de Google para continuar.
            </p>
          </div>

          <div className="space-y-4">
            {/* Botón Google */}
            <button
              onClick={handleGoogle}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border border-border bg-card hover:bg-muted transition-colors text-sm font-medium disabled:opacity-60 disabled:cursor-not-allowed shadow-sm"
            >
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  <span className="text-muted-foreground">Verificando cuenta...</span>
                </>
              ) : (
                <>
                  {/* Google icon SVG */}
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
                    <path d="M9 18c2.43 0 4.467-.806 5.956-2.185l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                    <path d="M3.964 10.706A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
                    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                  </svg>
                  <span>Continuar con Google</span>
                </>
              )}
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-background px-3 text-muted-foreground">Solo cuentas @coordinadora.com</span>
              </div>
            </div>

            {/* Info card */}
            <div className="rounded-lg bg-muted/50 border border-border p-4 text-xs text-muted-foreground space-y-1.5">
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span>Acceso restringido a personal autorizado de Coordinadora Mercantil.</span>
              </div>
              <div className="flex items-start gap-2">
                <svg className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>Si no tienes acceso, contacta al equipo de Seguridad y Calidad.</span>
              </div>
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Sigo Calidad © 2026 · Coordinadora Mercantil
          </p>
        </div>
      </div>
    </div>
  );
}
