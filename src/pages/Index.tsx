import React, { useState } from "react";
import { AppProvider, useApp } from "@/context/AppContext";
import { AppLayout } from "@/components/layout/AppLayout";
import InicioPage from "@/pages/InicioPage";
import RegistrosPage from "@/pages/RegistrosPage";
import BusquedaPage from "@/pages/BusquedaPage";
import IAPage from "@/pages/IAPage";
import ConfiguracionPage from "@/pages/ConfiguracionPage";
import { RecordDetailDrawer, Persona360Drawer, Vehiculo360Drawer, Guia360Drawer } from "@/components/drawers/Drawers";
import NewRecordForm from "@/components/forms/NewRecordForm";
import { Toaster } from "@/components/ui/toaster";
import LoginPage from "@/pages/LoginPage";

function AppContent() {
  const { paginaActiva, drawer, nuevaRegistroAbierto, setNuevaRegistroAbierto } = useApp();

  return (
    <AppLayout>
      <div className="h-full overflow-hidden">
        {paginaActiva === "inicio" && <InicioPage />}
        {paginaActiva === "registros" && <RegistrosPage />}
        {paginaActiva === "busqueda" && <BusquedaPage />}
        {paginaActiva === "ia" && <IAPage />}
        {paginaActiva === "configuracion" && <ConfiguracionPage />}
      </div>

      {/* Drawers */}
      {drawer.tipo === "registro" && <RecordDetailDrawer />}
      {drawer.tipo === "persona360" && <Persona360Drawer />}
      {drawer.tipo === "vehiculo360" && <Vehiculo360Drawer />}
      {drawer.tipo === "guia360" && <Guia360Drawer />}

      {/* Formulario nuevo registro */}
      {nuevaRegistroAbierto && <NewRecordForm onClose={() => setNuevaRegistroAbierto(false)} />}
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
