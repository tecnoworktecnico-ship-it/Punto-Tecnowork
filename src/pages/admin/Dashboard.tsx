"use client";

import React from 'react';
import { useSession } from '@/contexts/SessionContext';
import { Button } from '@/components/ui/button';

const AdminDashboard = () => {
  const { user, profile, signOut } = useSession();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move text-text-on-color">
      <div className="text-center bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-4xl font-bold mb-4 text-text-carbon">Dashboard de Administrador</h1>
        <p className="text-xl text-gray-600 mb-6">Bienvenido, {profile?.first_name || user?.email}! Tienes control total.</p>
        <Button onClick={signOut} className="bg-primary-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded">
          Cerrar Sesión
        </Button>
      </div>
    </div>
  );
};

export default AdminDashboard;