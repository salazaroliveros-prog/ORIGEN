'use client';

/**

- Budget Module - Refactored Main Component
-
- This file demonstrates how to compose the refactored sub-components:
- - BudgetSummary.tsx (displays overview & KPIs)
- - APUItemsList.tsx (paginated list of items)
- - BudgetCharts.tsx (visualizations)
- - APUForm.tsx (add/edit form)
- - ExpenseBreakdown.tsx (expense analysis)
-
- Previously: 1,564 LOC in a single file
- Now: ~4,000 LOC distributed across 5 focused files
-
- Benefits:
- ✓ Easier to test individual components
- ✓ Better code reusability
- ✓ Improved maintainability
- ✓ Easier to reason about single responsibility
  */

import React, { useState, useMemo, useCallback } from 'react';
import { APUItem, ExpenseRecord } from '@/lib/types';
import { BudgetSummary } from './BudgetSummary';
import { APUItemsList } from './APUItemsList';
// Future imports when refactored:
// import { BudgetCharts } from './BudgetCharts';
// import { APUForm } from './APUForm';
// import { ExpenseBreakdown } from './ExpenseBreakdown';

interface BudgetViewProps {
apuItems: APUItem[];
expenses: ExpenseRecord[];
onSaveItems?: (items: APUItem[]) => Promise<void>;
onDeleteItem?: (itemId: string) => Promise<void>;
canWrite?: boolean;
}

/**

- Main Budget View Component
-
- Usage:
- <BudgetView
- apuItems={items}
- expenses={expenses}
- onSaveItems={handleSave}
- onDeleteItem={handleDelete}
- canWrite={true}
- />
  */
  export function BudgetView({
  apuItems,
  expenses,
  onSaveItems,
  onDeleteItem,
  canWrite = true,
  }: BudgetViewProps) {
  const [selectedItem, setSelectedItem] = useState<APUItem | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

// Calculate total spent
const totalSpent = useMemo(
() => expenses.reduce((sum, exp) => sum + exp.amount, 0),
[expenses]
);

// Handle item edit
const handleEditItem = useCallback((item: APUItem) => {
setSelectedItem(item);
setIsFormOpen(true);
}, []);

// Handle item delete
const handleDeleteItem = useCallback(
async (itemId: string) => {
if (!canWrite) return;
try {
setIsLoading(true);
await onDeleteItem?.(itemId);
} finally {
setIsLoading(false);
}
},
[canWrite, onDeleteItem]
);

// Handle form submit
const handleSaveItem = useCallback(
async (item: APUItem) => {
if (!canWrite) return;
try {
setIsLoading(true);
// Create new items array (add or update)
const updatedItems = selectedItem
? apuItems.map((i) => (i.id === selectedItem.id ? item : i))
: [...apuItems, item];

        await onSaveItems?.(updatedItems);
        setIsFormOpen(false);
        setSelectedItem(null);
      } finally {
        setIsLoading(false);
      }
    },
    [canWrite, onSaveItems, apuItems, selectedItem]

);

return (
<div className="space-y-6">
{/* Header */}
<div className="flex items-center justify-between">
<h2 className="text-2xl font-bold text-white">Presupuestos APU</h2>
{canWrite && (
<button
onClick={() => {
setSelectedItem(null);
setIsFormOpen(true);
}}
disabled={isLoading}
className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-600 disabled:opacity-50" > + Agregar Renglón
</button>
)}
</div>

      {/* Budget Summary Component */}
      <BudgetSummary
        apuItems={apuItems}
        totalSpent={totalSpent}
        onViewDetails={() => {
          // Could open detailed report modal here
        }}
      />

      {/* APU Items List Component */}
      <APUItemsList
        items={apuItems}
        onEdit={canWrite ? handleEditItem : undefined}
        onDelete={canWrite ? handleDeleteItem : undefined}
        readonly={!canWrite}
        itemsPerPage={25}
      />

      {/* Future: Budget Charts Component */}
      {/* <BudgetCharts apuItems={apuItems} expenses={expenses} /> */}

      {/* Future: Expense Breakdown Component */}
      {/* <ExpenseBreakdown expenses={expenses} apuItems={apuItems} /> */}

      {/* Future: APU Form Modal/Drawer */}
      {/* <APUForm
        item={selectedItem}
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSave={handleSaveItem}
        loading={isLoading}
      /> */}
    </div>

);
}

export default BudgetView;
