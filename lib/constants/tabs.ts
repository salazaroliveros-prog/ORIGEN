/**
 * DEFINICIONES CENTRALIZADAS DE TABS
 * Archivo único de verdad para todas las definiciones de tabs de navegación
 * Evita duplicidad y garantiza consistencia en toda la aplicación
 */

import {
  LayoutDashboard,
  HardHat,
  Calculator,
  FileText,
  FileCheck2,
  CalendarDays,
  Truck,
  Users,
  Banknote,
  Receipt,
  PieChart,
  Mail,
  Sparkles,
  UserPlus,
  Boxes,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface TabDefinition {
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: string;
  group: 'operativo' | 'financiero' | 'personal' | 'admin';
}

/**
 * DEFINICIÓN MAESTRA DE TABS
 * Esta es la única fuente de verdad para todos los tabs de la aplicación
 * Usada por: Sidebar, TabsGrouped, MainApp
 */
export const TAB_DEFINITIONS: TabDefinition[] = [
  // ========== OPERATIVO (4 tabs) ==========
  {
    id: 'dashboard',
    label: 'Tablero',
    icon: LayoutDashboard,
    group: 'operativo',
  },
  {
    id: 'proyectos',
    label: 'Proyectos & Firmas',
    icon: HardHat,
    badge: 'Firma',
    group: 'operativo',
  },
  {
    id: 'cronograma_gantt',
    label: 'Seguimiento & Hitos',
    icon: CalendarDays,
    badge: 'Avance',
    group: 'operativo',
  },
  {
    id: 'maquinaria',
    label: 'Maquinaria',
    icon: Truck,
    group: 'operativo',
  },

  // ========== FINANCIERO (5 tabs) ==========
  {
    id: 'apu_presupuestos',
    label: 'Presupuestos APU',
    icon: Calculator,
    group: 'financiero',
  },
  {
    id: 'cotizaciones',
    label: 'Cotizaciones',
    icon: FileText,
    group: 'financiero',
  },
  {
    id: 'gastos',
    label: 'Gastos & Facturas',
    icon: Receipt,
    group: 'financiero',
  },
  {
    id: 'fel_invoices',
    label: 'Facturas FEL',
    icon: FileCheck2,
    group: 'financiero',
  },
  {
    id: 'reportes',
    label: 'Reportes Finales',
    icon: PieChart,
    group: 'financiero',
  },

  // ========== PERSONAL (2 tabs) ==========
  {
    id: 'personal',
    label: 'Personal & IGSS',
    icon: Users,
    group: 'personal',
  },
  {
    id: 'planillas',
    label: 'Planillas Guate',
    icon: Banknote,
    group: 'personal',
  },

  // ========== ADMIN (3 tabs) ==========
  {
    id: 'inventario',
    label: 'Inventario & Compras',
    icon: Boxes,
    group: 'admin',
  },
  {
    id: 'gmail',
    label: 'Correo & Avisos',
    icon: Mail,
    group: 'admin',
  },
  {
    id: 'ai',
    label: 'Asistente IA',
    icon: Sparkles,
    group: 'admin',
  },
];

/**
 * HELPER: Obtener grupo de un tab por ID
 * Válido para cualquier tab ID
 */
export function getTabGroup(tabId: string): 'operativo' | 'financiero' | 'personal' | 'admin' {
  const tab = TAB_DEFINITIONS.find((t) => t.id === tabId);
  return tab?.group ?? 'operativo';
}

/**
 * HELPER: Obtener definición completa de un tab por ID
 */
export function getTabDefinition(tabId: string): TabDefinition | undefined {
  return TAB_DEFINITIONS.find((t) => t.id === tabId);
}

/**
 * HELPER: Filtrar tabs según permisos
 */
export function filterTabsByPermissions(
  permissions: {
    canViewPersonnel: boolean;
    canViewPayroll: boolean;
    canViewExpenses: boolean;
    canViewSupplyChain: boolean;
    canManageCompany: boolean;
  }
): TabDefinition[] {
  return TAB_DEFINITIONS.filter((tab) => {
    if (tab.id === 'personal') return permissions.canViewPersonnel;
    if (tab.id === 'planillas') return permissions.canViewPayroll;
    if (tab.id === 'gastos') return permissions.canViewExpenses;
    if (tab.id === 'inventario') return permissions.canViewSupplyChain;
    if (tab.id === 'equipo') return permissions.canManageCompany;
    return true;
  });
}

/**
 * HELPER: Obtener tabs agrupados por categoría
 */
export function getTabsByGroup(
  group: 'operativo' | 'financiero' | 'personal' | 'admin'
): TabDefinition[] {
  return TAB_DEFINITIONS.filter((tab) => tab.group === group);
}

/**
 * HELPER: Validar si un ID es un tab válido
 */
export function isValidTabId(tabId: string): boolean {
  return TAB_DEFINITIONS.some((tab) => tab.id === tabId);
}
