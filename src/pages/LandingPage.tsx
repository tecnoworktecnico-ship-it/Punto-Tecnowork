"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BrandingDisplay from "@/components/BrandingDisplay";

const LandingPage = () => {
  const { loading, session } = useSession();

  // Si está cargando o si ya hay una sesión activa, mostramos un indicador de carga.
  // La redirección a los dashboards se manejará en SessionContext.
  if (loading || session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  // Solo renderizamos el contenido de la página de aterrizaje si no hay sesión y no está cargando.
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <div className="mb-6">
          <BrandingDisplay type="main" className="h-20 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-text-carbon">Bienvenido a Punto Tecnowork</h1>
        </div>
        <p className="text-xl text-gray-600 mb-6">Tu solución integral para gestión de pedidos y recompensas.</p>
        <Link to="/login">
          <Button className="bg-primary-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
            Iniciar Sesión / Registrarse
          </Button>
        </Link>
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default LandingPage;