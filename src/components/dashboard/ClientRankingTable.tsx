"use client";

import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trophy, Loader2, Star, AlertCircle, RefreshCw } from 'lucide-react';
import { showError } from '@/utils/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface RankingEntry {
  client_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  points: number;
  rank: number; // Rank provided by the RPC function
}

interface ClientRankingTableProps {
  localId?: string; 
  title: string;
  description: string;
}

const ClientRankingTable: React.FC<ClientRankingTableProps> = ({ localId, title, description }) => {
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRanking = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Utilizamos la función RPC 'get_client_points_ranking' que ya está optimizada
      // en la base de datos para ordenar por puntos (DESC) y limitar a 10.
      const { data, error } = await supabase.rpc('get_client_points_ranking', {
        target_local_id: localId || null
      });

      if (error) {
        console.error('Ranking fetch error:', error);
        if (error.message.includes('No tienes permisos')) {
             setError('No tienes permisos para acceder a este ranking.');
        } else {
             setError(error.message || 'Error al cargar el ranking');
        }
        setRanking([]);
      } else {
        // La data ya viene ordenada y limitada a 10 por la función RPC.
        setRanking(data || []);
      }
    } catch (err) {
      console.error('Unexpected ranking error:', err);
      setError('Error inesperado al cargar el ranking');
      setRanking([]);
    } finally {
      setLoading(false);
    }
  }, [localId]);

  useEffect(() => {
    fetchRanking();
  }, [fetchRanking]);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return <Badge className="bg-secondary-yellow hover:bg-secondary-yellow text-text-carbon">#1 Oro</Badge>;
    if (rank === 2) return <Badge variant="secondary">#2 Plata</Badge>;
    if (rank === 3) return <Badge variant="outline">#3 Bronce</Badge>;
    return <span className="text-gray-500">{rank}</span>;
  };

  if (loading) {
    return (
      <Card className="h-64 flex items-center justify-center shadow-md">
        <Loader2 className="h-6 w-6 animate-spin text-primary-blue" />
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="shadow-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-text-carbon flex items-center gap-2">
            <Trophy className="h-6 w-6 text-secondary-yellow" />
            {title}
          </CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
          <AlertCircle className="h-12 w-12 text-emphasis-red" />
          <p className="text-center text-emphasis-red font-medium">{error}</p>
          <Button 
            variant="outline" 
            onClick={fetchRanking}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-text-carbon flex items-center gap-2">
          <Trophy className="h-6 w-6 text-secondary-yellow" />
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {ranking.length === 0 ? (
          <p className="text-center text-gray-500 py-8">
            No hay clientes con puntos registrados {localId ? 'en este local' : 'aún'}.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">Posición</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Puntos</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((entry) => (
                <TableRow key={entry.client_id}>
                  <TableCell className="font-bold">{getRankBadge(entry.rank)}</TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {entry.first_name || entry.last_name 
                          ? `${entry.first_name || ''} ${entry.last_name || ''}`.trim()
                          : 'Cliente sin nombre'}
                      </span>
                      <span className="text-xs text-gray-500">{entry.email}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-bold text-secondary-yellow flex items-center justify-end gap-1">
                    {entry.points} <Star className="h-4 w-4" />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default ClientRankingTable;