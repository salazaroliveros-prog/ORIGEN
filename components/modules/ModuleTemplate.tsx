/**
 * MODULE TEMPLATE - Usar como base para cada módulo
 *
 * Estructura estándar para todos los módulos (Proyectos, Presupuestos, Personal, etc)
 *
 * Features:
 * - List view (tabla + filtros)
 * - Detail view (panel lateral)
 * - Create/Edit (modal)
 * - Delete confirmation
 * - Quick actions
 * - Mobile responsive
 * - Accesibilidad WCAG AA
 */

'use client';

import React, { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Filter, Search } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Table, Column } from '@/components/ui/Table';
import { FormField, Form } from '@/components/ui/FormField';
import { Button } from '@/components/ui/Button';
import toast from 'react-hot-toast';

/**
 * ============================================================
 * TYPES
 * ============================================================
 */

interface ModuleItem {
  id: string;
  // Agregar campos específicos del módulo
}

interface ModuleState {
  items: ModuleItem[];
  loading: boolean;
  error?: string;
}

/**
 * ============================================================
 * MAIN COMPONENT
 * ============================================================
 */

export function ModuleTemplate() {
  // State
  const [state, setState] = useState<ModuleState>({
    items: [],
    loading: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<ModuleItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [filters, setFilters] = useState({ status: 'all' });

  // Filtered items
  const filteredItems = useMemo(() => {
    return state.items.filter((item) => {
      // Aplicar filtros de búsqueda
      if (searchTerm && !JSON.stringify(item).toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }

      // Aplicar filtros adicionales
      if (filters.status !== 'all') {
        // Implementar lógica de filtro específica
      }

      return true;
    });
  }, [state.items, searchTerm, filters]);

  /**
   * ============================================================
   * HANDLERS
   * ============================================================
   */

  const handleCreate = async (data: Partial<ModuleItem>) => {
    try {
      // TODO: Llamar API para crear
      toast.success('Creado exitosamente');
      setIsCreateModalOpen(false);
    } catch (error) {
      toast.error('Error al crear');
    }
  };

  const handleUpdate = async (id: string, data: Partial<ModuleItem>) => {
    try {
      // TODO: Llamar API para actualizar
      toast.success('Actualizado exitosamente');
    } catch (error) {
      toast.error('Error al actualizar');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Estás seguro que deseas eliminar?')) return;

    try {
      // TODO: Llamar API para eliminar
      toast.success('Eliminado exitosamente');
    } catch (error) {
      toast.error('Error al eliminar');
    }
  };

  /**
   * ============================================================
   * RENDER
   * ============================================================
   */

  return (
    <div className="min-h-screen space-y-6 bg-slate-950 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white sm:text-3xl">Módulo Name</h1>
          <p className="mt-1 text-sm text-slate-400">Descripción del módulo y qué hace</p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2"
        >
          <Plus className="h-5 w-5" />
          Crear Nuevo
        </Button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/[0.05] py-2 pl-10 pr-4 text-sm text-white placeholder-slate-500 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/30"
          />
        </div>

        {/* Filter Button */}
        <Button variant="ghost" size="sm" className="flex items-center gap-2">
          <Filter className="h-5 w-5" />
          Filtros
        </Button>
      </div>

      {/* Main Table/List */}
      <Card variant="default">
        <Table<ModuleItem>
          data={filteredItems}
          columns={[
            {
              key: 'id',
              label: 'ID',
              sortable: true,
            },
            // TODO: Agregar más columnas específicas del módulo
            {
              key: 'id', // Dummy
              label: 'Acciones',
              render: (_, row) => (
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedItem(row)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(row.id)}>
                    <Trash2 className="h-4 w-4 text-danger-500" />
                  </Button>
                </div>
              ),
            },
          ]}
          loading={state.loading}
          onRowClick={(row) => setSelectedItem(row)}
        />
      </Card>

      {/* Detail Panel / Modal (Mobile Sheet) */}
      {selectedItem && (
        <Card
          variant="elevated"
          padding="lg"
          className="fixed inset-0 z-50 overflow-y-auto sm:static"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Editar</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)}>
              ✕
            </Button>
          </div>

          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate(selectedItem.id, {});
            }}
          >
            {/* TODO: Agregar FormFields específicos */}

            <div className="flex gap-2">
              <Button variant="primary" type="submit">
                Guardar
              </Button>
              <Button variant="ghost" onClick={() => setSelectedItem(null)}>
                Cancelar
              </Button>
            </div>
          </Form>
        </Card>
      )}

      {/* Create Modal */}
      {isCreateModalOpen && (
        <Card
          variant="elevated"
          padding="lg"
          className="fixed inset-0 z-50 overflow-y-auto sm:static"
        >
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Crear Nuevo</h2>
            <Button variant="ghost" size="sm" onClick={() => setIsCreateModalOpen(false)}>
              ✕
            </Button>
          </div>

          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate({});
            }}
          >
            {/* TODO: Agregar FormFields específicos */}

            <div className="flex gap-2">
              <Button variant="primary" type="submit">
                Crear
              </Button>
              <Button variant="ghost" onClick={() => setIsCreateModalOpen(false)}>
                Cancelar
              </Button>
            </div>
          </Form>
        </Card>
      )}
    </div>
  );
}

export default ModuleTemplate;

/**
 * ============================================================
 * INSTRUCCIONES DE USO
 * ============================================================
 *
 * 1. Copiar este archivo a: components/modules/[ModuleName]/index.tsx
 *
 * 2. Reemplazar "ModuleTemplate" con nombre real (ProjectsModule, BudgetModule, etc)
 *
 * 3. Definir interface ModuleItem específica con campos reales
 *
 * 4. Agregar columnas específicas en Table.columns
 *
 * 5. Agregar FormFields específicos en Form components
 *
 * 6. Implementar handlers (handleCreate, handleUpdate, handleDelete)
 *    - Conectar con API real
 *    - Manejar errores
 *    - Actualizar state
 *
 * 7. Importar en MainApp.tsx y renderizar según activeTab
 *
 * 8. Testear:
 *    - Create/Read/Update/Delete
 *    - Search/Filter
 *    - Mobile responsive
 *    - Accesibilidad
 *    - Performance
 *
 * ============================================================
 */
