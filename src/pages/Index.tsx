"use client";

import { MadeWithDyad } from "@/components/made-with-dyad";
import { useSession } from "@/contexts/SessionContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Index = () => {
  const { session, loading, profile } = useSession();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    );
  }

  // SessionContext handles redirection based on role if authenticated
  // This page will only be shown if not authenticated or if the role doesn't match any specific dashboard
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4 text-text-carbon">Bienvenido a Punto Tecnowork</h1>
        <p className="text-xl text-gray-600 mb-6">Tu solución integral para gestión de pedidos y recompensas.</p>
        {!session ? (
          <Link to="/login">
            <Button className="bg-primary-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
              Iniciar Sesión / Registrarse
            </Button>
          </Link>
        ) : (
          <p className="text-lg text-gray-700">Redirigiendo a tu dashboard...</p>
        )}
      </div>
      <MadeWithDyad />
    </div>
  );
};

export default Index;