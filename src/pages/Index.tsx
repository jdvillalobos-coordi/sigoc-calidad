import React, { useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import InicioPage from "@/pages/InicioPage";
import RegistrosPage from "@/pages/RegistrosPage";
import EvidenciasPage from "@/pages/EvidenciasPage";
import IAPage from "@/pages/IAPage";
import ConfiguracionPage from "@/pages/ConfiguracionPage";
import BandejaPage from "@/pages/BandejaPage";
import CuadroContactoPage from "@/pages/CuadroContactoPage";
import { RecordDetailDrawer, Persona360Drawer, Vehiculo360Drawer, Guia360Drawer, Terminal360Drawer, ResolucionAcumulativaPanel } from "@/components/drawers/Drawers";
import NewRecordForm from "@/components/forms/NewRecordForm";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/LoginPage";

function AppContent() {
  const { paginaActiva, drawer, nuevaRegistroAbierto, setNuevaRegistroAbierto, formPrefill, setFormPrefill } = useApp();

  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        {paginaActiva === "bandeja"        && <BandejaPage />}
        {paginaActiva === "inicio"         && <InicioPage />}
        {paginaActiva === "registros"      && <RegistrosPage />}
        {paginaActiva === "evidencias"     && <EvidenciasPage />}
        {paginaActiva === "ia"             && <IAPage />}
        {paginaActiva === "cuadro_contacto" && <CuadroContactoPage />}
        {paginaActiva === "configuracion"  && <ConfiguracionPage />}
      </div>

      {drawer.tipo === "registro"    && <RecordDetailDrawer />}
      {drawer.tipo === "persona360"  && <Persona360Drawer />}
      {drawer.tipo === "vehiculo360" && <Vehiculo360Drawer />}
      {drawer.tipo === "guia360"     && <Guia360Drawer />}
      {drawer.tipo === "terminal360" && <Terminal360Drawer />}
      {drawer.tipo === "resolucion_acumulativa" && <ResolucionAcumulativaPanel />}

      {nuevaRegistroAbierto && (
        <NewRecordForm
          onClose={() => { setNuevaRegistroAbierto(false); setFormPrefill(null); }}
          prefill={formPrefill ?? undefined}
        />
      )}
    </AppLayout>
  );
}

export default function Index() {
  const [loggedIn, setLoggedIn] = useState(false);

  if (!loggedIn) {
    return (
      <>
        <LoginPage onLogin={() => setLoggedIn(true)} />
        <Toaster />
      </>
    );
  }

  return (
    <AppProvider>
      <AppContent />
      <Toaster />
    </AppProvider>
  );
}
