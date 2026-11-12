import { DollarSign, Users, BarChart3, Layers, Activity, PieChart, Briefcase } from 'lucide-react';
import type { WidgetMetadata, WidgetId } from './types';
import { DEFAULT_VISIBLE_WIDGETS } from './types';

export const WIDGET_CATALOG: WidgetMetadata[] = [
  {
    id: 'cashFlow',
    title: 'Proyección de Flujo de Caja Semestral',
    description: 'Proyección financiera basada en hitos de entrega y desembolsos programados',
    category: 'financiero',
    priority: 'alta',
    icon: DollarSign,
  },
  {
    id: 'laborCosts',
    title: 'Costos de Mano de Obra Activa & Productividad',
    description: 'Rendimiento y costo diario de cuadrillas en campo con métricas IGSS',
    category: 'mano_obra',
    priority: 'alta',
    icon: Users,
  },
  {
    id: 'progressComparison',
    title: 'Avance Físico vs. Ejecución Financiera (%)',
    description: 'Detección de descalces donde el gasto presupuestario supera al avance real',
    category: 'avance',
    priority: 'alta',
    icon: BarChart3,
  },
  {
    id: 'stackedBudget',
    title: 'Presupuesto Asignado vs. Gasto Real (Barras Apiladas)',
    description: 'Visibiliza saldo disponible presupuestario y sobrecostos excedidos',
    category: 'financiero',
    priority: 'alta',
    icon: Layers,
  },
  {
    id: 'expensesHistogram',
    title: 'Histórico de Gastos Mensuales por Categoría',
    description: 'Evolución cronológica de facturación y rubros operativos',
    category: 'financiero',
    priority: 'media',
    icon: Activity,
  },
  {
    id: 'budgetUtilization',
    title: 'Utilización de Presupuesto APU (Interactivo D3)',
    description: 'Desglose circular y por renglones de la estructura de costos',
    category: 'financiero',
    priority: 'media',
    icon: PieChart,
  },
  {
    id: 'projectBreakdown',
    title: 'Tarjetas Resumen por Proyecto',
    description: 'Monitoreo individualizado de obras con barra de progreso y balance',
    category: 'avance',
    priority: 'media',
    icon: Briefcase,
  },
];

export const HIGH_PRIORITY_WIDGETS: Record<WidgetId, boolean> = {
  cashFlow: true,
  laborCosts: true,
  progressComparison: true,
  stackedBudget: true,
  expensesHistogram: false,
  budgetUtilization: false,
  projectBreakdown: true,
};

export { DEFAULT_VISIBLE_WIDGETS } from './types';