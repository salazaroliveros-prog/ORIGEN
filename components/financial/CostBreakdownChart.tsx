'use client';

import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface CostBreakdownItem {
  name: string;
  cost: number;
  label?: string;
}

/****
 * CostBreakdownChart - Gráfica de barras para desglose de costos
 * Muestra el desglose de costos por categoría (materiales, mano de obra, etc.)
 *****/

interface CostBreakdownChartProps {
  data: CostBreakdownItem[];
  showLegend?: boolean;
  showXAxis?: boolean;
  showYAxis?: boolean;
}

export function CostBreakdownChart({
  data,
  showLegend = true,
  showXAxis = true,
  showYAxis = true,
}: CostBreakdownChartProps) {
  if (!data || data.length === 0) {
    return <p className="text-slate-500 text-sm py-8">No hay datos para la gráfica</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart
        data={data}
        margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
        dataKey="cost"
      >
        <XAxis
          dataKey="name"
          stroke="#8884d8"
          strokeDasharray="5 5"
          fill="#8884d8"
          fontSize={12}
          show={showXAxis}
        />
        <YAxis
          fill="#8884d8"
          fontSize={12}
          show={showYAxis}
          tickFormatter: (value: number) => `Q${value.toLocaleString()}`
        />
        <Tooltip />
        <Legend
          verticalAlign="bottom"
          height={36}
          fontSize={12}
          show={showLegend}
        />
        <Bar
          dataKey="cost"
          name="Costo GTQ"
          fill="#1e3a8a"
          stroke="#1e3a8a"
          strokeWidth={2}
          radius={{ x: 3, y: 0 }}
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

/****
 * CostBreakdownChart - Versión simplificada para uso rápido
 *****/

export function SimpleCostBreakdown({
  categories,
  amounts,
  title = 'Desglose de Costos',
}: {
  categories: string[];
  amounts: number[];
  title?: string;
}) {
  const data = categories.map((cat, i) => ({
    name: cat,
    cost: amounts[i],
    label: cat,
  }));

  return <CostBreakdownChart data={data} />;
}