"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface OrderTrend {
  date: string;
  count: number;
}

interface OrderTrendChartProps {
  data: OrderTrend[];
  loading: boolean;
}

const OrderTrendChart: React.FC<OrderTrendChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card className="h-80 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-text-carbon">Pedidos en los Últimos 7 Días</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
            <XAxis dataKey="date" stroke="#323232" tickFormatter={(tick) => new Date(tick).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })} />
            <YAxis stroke="#323232" allowDecimals={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px' }}
              labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString('es-ES')}`}
              formatter={(value, name) => [`${value} pedidos`, 'Total']}
            />
            <Line type="monotone" dataKey="count" stroke="#4285F4" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default OrderTrendChart;