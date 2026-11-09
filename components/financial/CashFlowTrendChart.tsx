'use client';

import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';

interface CashFlowMonth {
  month: string;
  ingresos: number;
  gastos: number;
  neto: number;
}

/****
 * CashFlowTrendChart - Gráfica de líneas para tendencia de flujo de caja
 * Muestra ingresos, gastos y balance neto a lo largo del tiempo
 *****/

interface CashFlowTrendChartProps {
  data: CashFlowMonth[];
  showBrush?: boolean;
}

export function CashFlowTrendChart({ data, showBrush = false }: CashFlowTrendChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500 text-sm py-8">No hay datos para la gráfica</p>;
  }

  const formattedData = data.map((item) => ({
    month: item.month,
    ingresos: item.ingresos,
    gastos: item.gastos,
    neto: item.neto,
  }));

  return (
    <ResponsiveContainer width="100%" height={400}>
      <LineChart
        data={formattedData}
        margin={{ top: 20, right: 30, left: 0, bottom: 5}}
        dataKey="neto"
      >
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="month" fontSize={12} stroke="#8884d8" />
        <YAxis
          fontSize={12}
          stroke="#8884d8"
          tickFormatter={(value: number) => `Q${value.toLocaleString()}`}
        />
        <Tooltip />
        <CartesianGrid strokeDasharray="3 3" />

        <Line type="monotone" dataKey="ingresos" stroke="#10b981" strokeWidth={2} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="gastos" stroke="#f87171" strokeWidth={2} activeDot={{ r: 8 }} />
        <Line type="monotone" dataKey="neto" stroke="#3b82f6" strokeWidth={3} activeDot={{ r: 8 }} strokeDasharray="5 5" />

        {showBrush && <></>}
      </LineChart>
    </ResponsiveContainer>
  );
}