import React, { useState } from "react";
import { toast } from "@/hooks/use-toast";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [loading, setLoading] = useState(false);

  function handleGoogle() {
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast({ title: "✅ Bienvenida, Sandra Herrera", description: "Sesión iniciada correctamente." });
      onLogin();
    }, 500);
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
      {/* Logo */}
      <div className="flex flex-col items-center mb-10 select-none">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-lg mb-5">
          <span className="text-primary-foreground font-extrabold text-2xl tracking-tight">SC</span>
        </div>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Sigo Calidad</h1>
        <p className="text-muted-foreground text-sm mt-2 text-center max-w-xs">
          Plataforma de calidad y seguridad operativa
        </p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm space-y-5">
        {/* Botón Google */}
        <button
          onClick={handleGoogle}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-5 py-3.5 rounded-xl border border-border bg-card hover:bg-muted/60 transition-colors text-sm font-medium shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-muted-foreground">Verificando cuenta...</span>
            </>
          ) : (
            <>
              {/* Google SVG oficial */}
              <svg width="20" height="20" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M47.532 24.552c0-1.636-.147-3.2-.406-4.695H24.48v9.01h12.91c-.563 2.958-2.23 5.464-4.734 7.149v5.935h7.664c4.48-4.127 7.212-10.205 7.212-17.4z" fill="#4285F4"/>
                <path d="M24.48 48c6.483 0 11.926-2.147 15.9-5.838l-7.663-5.935c-2.126 1.425-4.844 2.27-8.237 2.27-6.33 0-11.694-4.273-13.602-10.017H3.01v6.126C6.966 42.812 15.138 48 24.48 48z" fill="#34A853"/>
                <path d="M10.878 28.48A14.4 14.4 0 0 1 9.84 24c0-1.563.27-3.08.738-4.48v-6.126H3.01A23.94 23.94 0 0 0 .48 24c0 3.874.93 7.538 2.53 10.606l7.868-6.126z" fill="#FBBC05"/>
                <path d="M24.48 9.503c3.565 0 6.757 1.226 9.275 3.63l6.943-6.943C36.397 2.388 30.958 0 24.48 0 15.138 0 6.966 5.188 3.01 13.394l7.868 6.126c1.908-5.744 7.272-10.017 13.602-10.017z" fill="#EA4335"/>
              </svg>
              <span className="text-foreground">Iniciar sesión con Google</span>
            </>
          )}
        </button>

        <p className="text-center text-xs text-muted-foreground">
          Usa tu cuenta <span className="font-medium text-foreground">@coordinadora.com</span>
        </p>
      </div>

      {/* Footer */}
      <p className="absolute bottom-6 text-xs text-muted-foreground/60">
        Coordinadora Mercantil © 2026
      </p>
    </div>
  );
}
