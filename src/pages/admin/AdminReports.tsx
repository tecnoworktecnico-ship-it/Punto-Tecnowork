"use client";

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowLeft, BarChart, DollarSign, Package, Loader2 } from 'lucide-react';
import { useAdminDashboardData } from '@/hooks/useDashboardData';
import StatusPieChart from '@/components/dashboard/StatusPieChart';
import OrderTrendChart from '@/components/dashboard/OrderTrendChart';
import ClientRankingTable from '@/components/dashboard/ClientRankingTable';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const AdminReports = () => {
  const navigate = useNavigate();
  const { 
    totalOrders, 
    totalRevenue, 
    orderStatusStats, 
    orderTrends, 
    localPerformance, 
    loading, 
    refreshData 
  } = useAdminDashboardData();

  return (
    <div className="min-h-screen p-4 bg-gradient-to-br from-primary-blue to-purple-600 animate-gradient-move">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={() => navigate('/admin/dashboard')}
            className="flex items-center gap-2 text-white hover:text-gray-200"
          >
            <ArrowLeft className="h-5 w-5" />
            Volver al Dashboard
          </Button>
          <Button 
            onClick={refreshData} 
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2 bg-white text-primary-blue hover:bg-gray-100"
          >
            Actualizar Datos
          </Button>
        </div>

        <Card className="bg-white rounded-lg shadow-lg">
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-text-carbon flex items-center gap-2">
              <BarChart className="h-7 w-7 text-primary-blue" />
              Reportes y Estadísticas Generales
            </CardTitle>
            <CardDescription>Análisis detallado del rendimiento de la plataforma.</CardDescription>
          </CardHeader>
        </Card>

        {/* Gráficos de Tendencia y Estado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <OrderTrendChart data={orderTrends} loading={loading} />
          </div>
          <StatusPieChart data={orderStatusStats} loading={loading} />
        </div>

        {/* Rendimiento por Local */}
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle className="text-2xl font-bold text-text-carbon flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-success-green" />
              Rendimiento Financiero por Local
            </CardTitle>
            <CardDescription>Ingresos y pedidos completados por cada local.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary-blue" />
              </div>
            ) : localPerformance.length === 0 ? (
              <p className="text-gray-500">No hay locales registrados.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Local</TableHead>
                    <TableHead>Ingresos Totales</TableHead>
                    <TableHead>Pedidos Completados</TableHead>
                    <TableHead>Total Pedidos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {localPerformance.map((local, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{local.local_name}</TableCell>
                      <TableCell className="font-bold text-success-green">
                        ${local.total_revenue.toFixed(2)}
                      </TableCell>
                      <TableCell>{local.completed_orders}</TableCell>
                      <TableCell>
                        {totalOrders > 0 
                          ? `${((local.completed_orders / totalOrders) * 100).toFixed(1)}%`
                          : '0%'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
        
        {/* Ranking de Clientes General */}
        <ClientRankingTable 
          title="Top 10 Clientes (General)"
          description="Ranking de clientes con más puntos acumulados en toda la plataforma."
        />
      </div>
    </div>
  );
};

export default AdminReports;