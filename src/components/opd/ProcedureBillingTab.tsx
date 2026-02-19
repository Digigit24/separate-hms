// src/components/opd/ProcedureBillingTab.tsx
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Package, Search, Trash2, Check } from 'lucide-react';
import type { ProcedureMaster } from '@/types/procedureMaster.types';
import type { OPDBillItem } from '@/types/opdBill.types';

export interface ProcedureItem {
  id: string;
  procedure_id: number;
  procedure_name: string;
  procedure_code?: string;
  quantity: number;
  unit_price: string;
  total_price: string;
  notes: string;
}

interface ProcedureBillingTabProps {
  billItems: OPDBillItem[];
  proceduresData: any;
  packagesData: any;
  proceduresLoading: boolean;
  packagesLoading: boolean;
  onAddProcedure: (procedure: ProcedureMaster) => void;
  onAddPackage: (packageId: number, packageName: string) => Promise<void>;
  onUpdateBillItem: (index: number, field: 'quantity' | 'unit_price', value: string) => void;
  onRemoveBillItem: (index: number) => void;
}

export const ProcedureBillingTab: React.FC<ProcedureBillingTabProps> = ({
  billItems,
  proceduresData,
  packagesData,
  proceduresLoading,
  packagesLoading,
  onAddProcedure,
  onAddPackage,
  onUpdateBillItem,
  onRemoveBillItem,
}) => {
  const [activeView, setActiveView] = useState<'procedures' | 'packages'>('procedures');
  const [search, setSearch] = useState('');
  const [loadingPackageId, setLoadingPackageId] = useState<number | null>(null);

  // Already added procedure/package names for "added" indicator
  const addedItemNames = useMemo(() => {
    const names = new Set<string>();
    billItems.forEach(item => {
      if (item.source === 'Procedure' || item.source === 'Package') {
        names.add(item.item_name.toLowerCase());
      }
    });
    return names;
  }, [billItems]);

  const procedureAndPackageItems = useMemo(() =>
    billItems.filter(item => item.source === 'Procedure' || item.source === 'Package'),
    [billItems]
  );

  const filteredProcedures = useMemo(() => {
    const all = proceduresData?.results || [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((p: ProcedureMaster) =>
      p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q)
    );
  }, [proceduresData, search]);

  const filteredPackages = useMemo(() => {
    const all = packagesData?.results || [];
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter((p: any) =>
      p.name.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)
    );
  }, [packagesData, search]);

  const handleAddPackage = async (packageId: number, packageName: string) => {
    setLoadingPackageId(packageId);
    try {
      await onAddPackage(packageId, packageName);
    } catch (error) {
      console.error('Error adding package:', error);
    } finally {
      setLoadingPackageId(null);
    }
  };

  const procedureTotal = procedureAndPackageItems.reduce(
    (sum, item) => sum + parseFloat(item.total_price || '0'), 0
  );

  return (
    <div className="space-y-3">
      {/* Search + View toggle */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search procedures or packages..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
            autoFocus
          />
        </div>
        <div className="flex items-center border rounded overflow-hidden shrink-0">
          <button
            onClick={() => setActiveView('procedures')}
            className={`h-8 px-3 text-xs font-medium transition-colors ${
              activeView === 'procedures'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            Procedures
          </button>
          <button
            onClick={() => setActiveView('packages')}
            className={`h-8 px-3 text-xs font-medium border-l transition-colors ${
              activeView === 'packages'
                ? 'bg-foreground text-background'
                : 'text-muted-foreground hover:bg-muted'
            }`}
          >
            <Package className="h-3 w-3 inline mr-1" />
            Packages
          </button>
        </div>
      </div>

      {/* Items list - directly clickable */}
      <div className="border rounded-md max-h-[45vh] overflow-y-auto">
        {activeView === 'procedures' ? (
          proceduresLoading ? (
            <div className="text-center py-6 text-xs text-muted-foreground">Loading procedures...</div>
          ) : filteredProcedures.length > 0 ? (
            <div className="divide-y">
              {filteredProcedures.map((procedure: ProcedureMaster) => {
                const isAdded = addedItemNames.has(procedure.name.toLowerCase());
                return (
                  <div
                    key={procedure.id}
                    onClick={() => !isAdded && onAddProcedure(procedure)}
                    className={`flex items-center justify-between px-3 py-2 transition-colors ${
                      isAdded
                        ? 'bg-muted/30 cursor-default'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{procedure.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {procedure.code}{procedure.category ? ` · ${procedure.category}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      <span className="text-xs font-semibold">₹{parseFloat(procedure.default_charge).toFixed(0)}</span>
                      {isAdded ? (
                        <span className="h-6 w-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : (
                        <span className="h-6 w-6 rounded-full border border-dashed text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center transition-colors">
                          <Plus className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              {search ? 'No procedures match your search' : 'No procedures available'}
            </div>
          )
        ) : (
          // Packages view
          packagesLoading ? (
            <div className="text-center py-6 text-xs text-muted-foreground">Loading packages...</div>
          ) : filteredPackages.length > 0 ? (
            <div className="divide-y">
              {filteredPackages.map((pkg: any) => {
                const isAdded = addedItemNames.has(pkg.name.toLowerCase());
                const isLoading = loadingPackageId === pkg.id;
                const procedureCount = pkg.procedures?.length ?? pkg.procedure_count ?? 0;

                return (
                  <div
                    key={pkg.id}
                    onClick={() => !isAdded && !isLoading && handleAddPackage(pkg.id, pkg.name)}
                    className={`flex items-center justify-between px-3 py-2.5 transition-colors ${
                      isAdded || isLoading
                        ? 'bg-muted/30 cursor-default'
                        : 'hover:bg-muted/50 cursor-pointer'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{pkg.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {pkg.code} · {procedureCount} procedure{procedureCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 shrink-0 ml-3">
                      <div className="text-right">
                        {pkg.discount_percent && (
                          <span className="text-[10px] text-muted-foreground line-through mr-1.5">
                            ₹{parseFloat(pkg.total_charge).toFixed(0)}
                          </span>
                        )}
                        <span className="text-xs font-semibold text-emerald-600">
                          ₹{parseFloat(pkg.discounted_charge).toFixed(0)}
                        </span>
                        {pkg.discount_percent && (
                          <span className="text-[10px] text-emerald-600 ml-1">-{pkg.discount_percent}%</span>
                        )}
                      </div>
                      {isAdded ? (
                        <span className="h-6 w-6 rounded-full bg-emerald-500/15 text-emerald-600 flex items-center justify-center">
                          <Check className="h-3 w-3" />
                        </span>
                      ) : isLoading ? (
                        <span className="h-6 w-6 rounded-full border text-muted-foreground flex items-center justify-center animate-pulse">
                          ...
                        </span>
                      ) : (
                        <span className="h-6 w-6 rounded-full border border-dashed text-muted-foreground hover:text-foreground hover:border-foreground flex items-center justify-center transition-colors">
                          <Plus className="h-3 w-3" />
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-muted-foreground">
              {search ? 'No packages match your search' : 'No packages available'}
            </div>
          )
        )}
      </div>

      {/* Added items summary */}
      {procedureAndPackageItems.length > 0 && (
        <div className="border rounded-md">
          <div className="flex items-center justify-between px-3 py-1.5 border-b bg-muted/20">
            <span className="text-[11px] font-medium text-muted-foreground">Added ({procedureAndPackageItems.length})</span>
            <span className="text-xs font-semibold">₹{procedureTotal.toFixed(2)}</span>
          </div>
          <div className="divide-y">
            {procedureAndPackageItems.map((item) => {
              const billItemIndex = billItems.findIndex(
                bi => bi.id === item.id || (bi.item_name === item.item_name && bi.source === item.source)
              );
              return (
                <div key={item.id || `${item.item_name}-${item.source}`} className="flex items-center gap-2 px-3 py-1.5">
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-medium truncate block">{item.item_name}</span>
                    <span className="text-[10px] text-muted-foreground">{item.source}</span>
                  </div>
                  <Input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => billItemIndex >= 0 && onUpdateBillItem(billItemIndex, 'quantity', e.target.value)}
                    className="w-14 h-6 text-[11px] text-center"
                    min="1"
                  />
                  <Input
                    type="number"
                    value={item.unit_price}
                    onChange={(e) => billItemIndex >= 0 && onUpdateBillItem(billItemIndex, 'unit_price', e.target.value)}
                    className="w-20 h-6 text-[11px] text-right"
                    min="0"
                    step="0.01"
                  />
                  <span className="text-xs font-semibold w-16 text-right shrink-0">
                    ₹{parseFloat(item.total_price || '0').toFixed(2)}
                  </span>
                  <button
                    onClick={() => billItemIndex >= 0 && onRemoveBillItem(billItemIndex)}
                    className="h-6 w-6 shrink-0 text-destructive hover:bg-destructive/10 rounded flex items-center justify-center transition-colors"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
