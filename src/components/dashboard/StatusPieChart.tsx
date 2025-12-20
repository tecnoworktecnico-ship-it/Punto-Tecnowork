"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend, Label } from 'recharts';
import { Loader2 } from 'lucide-react';

interface Stat {
  name: string;
  value: number;
}

interface StatusPieChartProps {
  data: Stat[];
  loading: boolean;
}

const COLORS = ['#4285F4', '#FBBC05', '#34A853', '#EA4335', '#9CA3AF']; // Blue, Yellow, Green, Red, Gray

const StatusPieChart: React.FC<StatusPieChartProps> = ({ data, loading }) => {
  if (loading) {
    return (
      <Card className="h-80 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary-blue" />
      </Card>
    );
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);

  if (total === 0) {
    return (
      <Card className="h-80 flex items-center justify-center">
        <p className="text-gray-500">No hay datos de pedidos para mostrar.</p>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-text-carbon">Distribución por Estado</CardTitle>
      </CardHeader>
      <CardContent className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              paddingAngle={3} // Añadir padding para el efecto de borde redondeado
              dataKey="value"
              labelLine={false}
              cornerRadius={5} // Bordes redondeados
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
              <Label 
                value={`Total: ${total}`} 
                position="center" 
                className="font-bold text-text-carbon" 
                style={{ fontSize: '16px', fill: 'var(--text-carbon)' }}
              />
            </Pie>
            <Tooltip 
              contentStyle={{ backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px' }}
              formatter={(value, name, props) => [`${value} (${((value / total) * 100).toFixed(1)}%)`, props.payload.name]}
            />
            <Legend layout="vertical" verticalAlign="middle" align="right" />
          </PieChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
};

export default StatusPieChart;