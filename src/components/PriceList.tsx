"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Loader2, ImageIcon, FileText } from 'lucide-react';

export interface PriceItem {
  service_name: string;
  price: number;
  is_photo_print: boolean;
  is_custom: boolean; // true si es precio personalizado del local
}

interface PriceListProps {
  prices: PriceItem[];
  loading: boolean;
  title?: string;
  description?: string;
  showCustomBadge?: boolean;
  compact?: boolean;
}

const PriceList: React.FC<PriceListProps> = ({ 
  prices, 
  loading, 
  title = "Lista de Precios",
  description,
  showCustomBadge = true,
  compact = false
}) => {
  if (loading) {
    return (
      <Card className="shadow-md">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary-blue mr-2" />
          <span className="text-gray-500">Cargando precios...</span>
        </CardContent>
      </Card>
    );
  }

  if (prices.length === 0) {
    return (
      <Card className="shadow-md">
        <CardContent className="text-center py-8 text-gray-500">
          No hay precios disponibles.
        </CardContent>
      </Card>
    );
  }

  if (compact) {
    return (
      <Card className="shadow-md">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-bold text-text-carbon flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-success-green" />
            {title}
          </CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {prices.map((price, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-2 bg-gray-50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  {price.is_photo_print ? (
                    <ImageIcon className="h-4 w-4 text-secondary-yellow" />
                  ) : (
                    <FileText className="h-4 w-4 text-primary-blue" />
                  )}
                  <span className="text-sm font-medium text-text-carbon truncate max-w-[150px]">
                    {price.service_name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="font-bold text-success-green">
                    ${price.price.toFixed(2)}
                  </span>
                  {showCustomBadge && price.is_custom && (
                    <Badge variant="outline" className="text-xs ml-1">
                      Local
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-md">
      <CardHeader>
        <CardTitle className="text-xl font-bold text-text-carbon flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-success-green" />
          {title}
        </CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Servicio</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Precio</TableHead>
              {showCustomBadge && <TableHead className="text-right">Origen</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {prices.map((price, index) => (
              <TableRow key={index}>
                <TableCell className="font-medium">{price.service_name}</TableCell>
                <TableCell>
                  {price.is_photo_print ? (
                    <div className="flex items-center gap-1 text-secondary-yellow">
                      <ImageIcon className="h-4 w-4" />
                      <span>Foto</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-1 text-primary-blue">
                      <FileText className="h-4 w-4" />
                      <span>Documento</span>
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right font-bold text-success-green">
                  ${price.price.toFixed(2)}
                </TableCell>
                {showCustomBadge && (
                  <TableCell className="text-right">
                    {price.is_custom ? (
                      <Badge className="bg-primary-blue">Personalizado</Badge>
                    ) : (
                      <Badge variant="secondary">Global</Badge>
                    )}
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default PriceList;