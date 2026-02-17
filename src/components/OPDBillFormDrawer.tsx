// src/components/OPDBillFormDrawer.tsx
import React, { useState, useMemo } from 'react';
import { SideDrawer } from '@/components/SideDrawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IndianRupee, Plus, X, Package, FileText, Loader2, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
import { useOPDBill } from '@/hooks/useOPDBill';
import { useVisit } from '@/hooks/useVisit';
import { useProcedureMaster } from '@/hooks/useProcedureMaster';
import { useProcedurePackage } from '@/hooks/useProcedurePackage';
import { opdBillService } from '@/services/opdBill.service';
import { cn } from '@/lib/utils';
import type { OPDType, ChargeType, PaymentMode, OPDBillItemCreateData } from '@/types/opdBill.types';

interface BillItem {
  id: string;
  type: 'procedure' | 'package';
  itemId: number;
  name: string;
  code: string;
  quantity: number;
  rate: number;
  amount: number;
}

interface OPDBillFormDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  mode: 'create' | 'edit' | 'view';
  billId?: number | null;
  onSuccess?: () => void;
}

export const OPDBillFormDrawer: React.FC<OPDBillFormDrawerProps> = ({
  isOpen,
  onClose,
  mode,
  billId,
  onSuccess,
}) => {
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [procedureOpen, setProcedureOpen] = useState(false);
  const [packageOpen, setPackageOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [selectedVisitId, setSelectedVisitId] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<PaymentMode>('cash');
  const [discountPercent, setDiscountPercent] = useState('0');
  const [receivedAmount, setReceivedAmount] = useState('0');

  // Hooks
  const { createBill } = useOPDBill();
  const { useVisits } = useVisit();
  const { useActiveProcedureMasters } = useProcedureMaster();
  const { useActiveProcedurePackages } = useProcedurePackage();

  // Fetch recent visits (for selection)
  const { data: visitsData, isLoading: visitsLoading } = useVisits({ page_size: 50, ordering: '-visit_date' });
  const visits = visitsData?.results || [];

  const { data: proceduresData, isLoading: proceduresLoading } = useActiveProcedureMasters();
  const { data: packagesData, isLoading: packagesLoading } = useActiveProcedurePackages();

  const procedures = proceduresData?.results || [];
  const packages = packagesData?.results || [];

  // Selected visit details
  const selectedVisit = visits.find(v => String(v.id) === selectedVisitId);

  // Calculate totals
  const subtotal = useMemo(() => {
    return billItems.reduce((sum, item) => sum + item.amount, 0);
  }, [billItems]);

  const discountAmount = useMemo(() => {
    const pct = parseFloat(discountPercent) || 0;
    return (subtotal * pct) / 100;
  }, [subtotal, discountPercent]);

  const totalAmount = Math.max(0, subtotal - discountAmount);
  const balanceAmount = Math.max(0, totalAmount - (parseFloat(receivedAmount) || 0));

  const getTitle = () => {
    if (mode === 'create') return 'Create OPD Bill';
    if (mode === 'edit') return 'Edit OPD Bill';
    return 'OPD Bill Details';
  };

  const resetForm = () => {
    setBillItems([]);
    setSelectedVisitId('');
    setPaymentMode('cash');
    setDiscountPercent('0');
    setReceivedAmount('0');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  // Add procedure to bill
  const handleAddProcedure = (procedureId: number) => {
    const procedure = procedures.find(p => p.id === procedureId);
    if (!procedure) return;

    const alreadyAdded = billItems.some(item => item.type === 'procedure' && item.itemId === procedureId);
    if (alreadyAdded) {
      toast.error('This procedure is already added to the bill');
      return;
    }

    const newItem: BillItem = {
      id: `proc-${Date.now()}`,
      type: 'procedure',
      itemId: procedure.id,
      name: procedure.name,
      code: procedure.code,
      quantity: 1,
      rate: parseFloat(procedure.default_charge),
      amount: parseFloat(procedure.default_charge),
    };

    setBillItems([...billItems, newItem]);
    setProcedureOpen(false);
    toast.success(`Added ${procedure.name} to bill`);
  };

  // Add package to bill
  const handleAddPackage = (packageId: number) => {
    const pkg = packages.find(p => p.id === packageId);
    if (!pkg) return;

    const alreadyAdded = billItems.some(item => item.type === 'package' && item.itemId === packageId);
    if (alreadyAdded) {
      toast.error('This package is already added to the bill');
      return;
    }

    const newItem: BillItem = {
      id: `pkg-${Date.now()}`,
      type: 'package',
      itemId: pkg.id,
      name: pkg.name,
      code: pkg.code,
      quantity: 1,
      rate: parseFloat(pkg.discounted_charge),
      amount: parseFloat(pkg.discounted_charge),
    };

    setBillItems([...billItems, newItem]);
    setPackageOpen(false);
    toast.success(`Added ${pkg.name} package to bill`);
  };

  // Update item quantity
  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    if (quantity < 1) return;
    setBillItems(billItems.map(item => {
      if (item.id === itemId) {
        const newAmount = item.rate * quantity;
        return { ...item, quantity, amount: newAmount };
      }
      return item;
    }));
  };

  // Remove item from bill
  const handleRemoveItem = (itemId: string) => {
    setBillItems(billItems.filter(item => item.id !== itemId));
    toast.success('Item removed from bill');
  };

  // Create the bill
  const handleCreateBill = async () => {
    if (!selectedVisitId) {
      toast.error('Please select a visit');
      return;
    }
    if (billItems.length === 0) {
      toast.error('Add at least one procedure or package');
      return;
    }

    setIsSaving(true);
    try {
      // Determine OPD type and charge type from visit
      const visit = selectedVisit;
      const opdType: OPDType = visit?.is_follow_up ? 'follow_up' : 'consultation';
      const chargeType: ChargeType = visit?.is_follow_up ? 'revisit' : 'first_visit';

      // Step 1: Create the bill (without received_amount to avoid payable validation)
      const newBill = await createBill({
        visit: parseInt(selectedVisitId),
        doctor: visit?.doctor || 0,
        opd_type: opdType,
        charge_type: chargeType,
        discount_percent: discountPercent || '0',
        discount_amount: discountAmount.toFixed(2),
        payment_mode: paymentMode,
        received_amount: '0',
        bill_date: new Date().toISOString().split('T')[0],
      });

      if (!newBill) {
        throw new Error('Failed to create bill');
      }

      // Step 2: Create all bill items
      for (const item of billItems) {
        const itemData: OPDBillItemCreateData = {
          bill: newBill.id,
          item_name: item.name,
          source: item.type === 'package' ? 'Package' : 'Procedure',
          quantity: item.quantity,
          unit_price: item.rate.toFixed(2),
          system_calculated_price: item.rate.toFixed(2),
          notes: item.code,
        };
        await opdBillService.createBillItem(itemData);
      }

      // Step 3: Update with received amount now that items exist
      const recv = parseFloat(receivedAmount) || 0;
      if (recv > 0) {
        await opdBillService.updateOPDBill(newBill.id, {
          received_amount: receivedAmount,
        });
      }

      toast.success('Bill created successfully');
      resetForm();
      onSuccess?.();
      onClose();
    } catch (error: any) {
      console.error('Failed to create bill:', error);
      toast.error(error?.message || 'Failed to create bill');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SideDrawer
      open={isOpen}
      onOpenChange={(open) => { if (!open) handleClose(); }}
      title={getTitle()}
      description="Manage OPD billing and procedures"
    >
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="basic">Visit</TabsTrigger>
          <TabsTrigger value="procedures">
            Procedures
            {billItems.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {billItems.length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
        </TabsList>

        {/* Visit Selection Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Select Visit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Visit</Label>
                {visitsLoading ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading visits...
                  </div>
                ) : (
                  <Select value={selectedVisitId} onValueChange={setSelectedVisitId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a visit..." />
                    </SelectTrigger>
                    <SelectContent>
                      {visits.map((visit) => (
                        <SelectItem key={visit.id} value={String(visit.id)}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs">{visit.visit_number}</span>
                            <span className="font-medium">{visit.patient_name || `Patient #${visit.patient}`}</span>
                            <span className="text-xs text-muted-foreground">{visit.visit_date}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {selectedVisit && (
                <div className="rounded-lg border p-3 space-y-1.5 text-sm bg-muted/30">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Patient</span>
                    <span className="font-medium">{selectedVisit.patient_name || `#${selectedVisit.patient}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Doctor</span>
                    <span className="font-medium">{selectedVisit.doctor_name || `#${selectedVisit.doctor}`}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <Badge variant="outline" className="text-xs capitalize">{selectedVisit.visit_type}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{selectedVisit.visit_date}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Procedures Tab */}
        <TabsContent value="procedures" className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Popover open={procedureOpen} onOpenChange={setProcedureOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="lg"
                  variant="default"
                  className="w-full h-auto py-4 flex flex-col gap-2"
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-semibold">Add Procedure</span>
                  <span className="text-xs opacity-80">Search from {procedures.length} procedures</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search procedures by name or code..." />
                  <CommandList>
                    <CommandEmpty>No procedure found.</CommandEmpty>
                    <CommandGroup heading="Available Procedures">
                      {proceduresLoading ? (
                        <CommandItem disabled>Loading procedures...</CommandItem>
                      ) : (
                        procedures.map((procedure) => (
                          <CommandItem
                            key={procedure.id}
                            value={`${procedure.name} ${procedure.code}`}
                            onSelect={() => handleAddProcedure(procedure.id)}
                            className="flex items-start gap-3 py-3"
                          >
                            <FileText className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex flex-col flex-1 gap-1">
                              <span className="font-medium">{procedure.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">{procedure.code}</Badge>
                                <span>{procedure.category}</span>
                                <span className="font-semibold text-foreground">₹{procedure.default_charge}</span>
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Popover open={packageOpen} onOpenChange={setPackageOpen}>
              <PopoverTrigger asChild>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2 border-2 border-dashed hover:border-solid hover:border-primary"
                >
                  <Package className="h-5 w-5" />
                  <span className="font-semibold">Add Package</span>
                  <span className="text-xs opacity-80">Search from {packages.length} packages</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[400px] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search packages by name or code..." />
                  <CommandList>
                    <CommandEmpty>No package found.</CommandEmpty>
                    <CommandGroup heading="Available Packages">
                      {packagesLoading ? (
                        <CommandItem disabled>Loading packages...</CommandItem>
                      ) : (
                        packages.map((pkg) => (
                          <CommandItem
                            key={pkg.id}
                            value={`${pkg.name} ${pkg.code}`}
                            onSelect={() => handleAddPackage(pkg.id)}
                            className="flex items-start gap-3 py-3"
                          >
                            <Package className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div className="flex flex-col flex-1 gap-1">
                              <span className="font-medium">{pkg.name}</span>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Badge variant="outline" className="text-xs">{pkg.code}</Badge>
                                <span className="font-semibold text-foreground">₹{pkg.discounted_charge}</span>
                                {pkg.discount_percent && (
                                  <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs">
                                    {parseFloat(pkg.discount_percent).toFixed(0)}% OFF
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <Plus className="h-4 w-4 text-muted-foreground" />
                          </CommandItem>
                        ))
                      )}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Bill Items List */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Bill Items ({billItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {billItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p className="text-sm">No items added yet</p>
                  <p className="text-xs">Add procedures or packages above to create a bill</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {billItems.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.type === 'package' ? (
                            <Package className="h-4 w-4 text-blue-600 flex-shrink-0" />
                          ) : (
                            <FileText className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-sm truncate">{item.name}</p>
                            <p className="text-xs text-muted-foreground">{item.code}</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                          >
                            -
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">{item.quantity}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 w-7 p-0"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="text-sm font-semibold">₹{item.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">@₹{item.rate}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                          onClick={() => handleRemoveItem(item.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}

                  {/* Total */}
                  <div className="border-t pt-3 mt-3">
                    <div className="flex items-center justify-between py-2 px-3 bg-muted rounded-lg">
                      <span className="font-semibold">Subtotal</span>
                      <span className="text-lg font-bold">₹{subtotal.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Payment Tab */}
        <TabsContent value="payment" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Payment Mode</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(['cash', 'card', 'upi'] as PaymentMode[]).map((m) => (
                    <Button
                      key={m}
                      variant={paymentMode === m ? 'default' : 'outline'}
                      size="sm"
                      className="w-full capitalize"
                      onClick={() => setPaymentMode(m)}
                    >
                      {m === 'cash' && <IndianRupee className="h-3.5 w-3.5 mr-1" />}
                      {(m === 'card' || m === 'upi') && <CreditCard className="h-3.5 w-3.5 mr-1" />}
                      {m}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="received">Received Amount</Label>
                <Input
                  id="received"
                  type="number"
                  min="0"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>

              {/* Summary */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Discount ({discountPercent}%)</span>
                    <span className="font-medium text-green-600">-₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold">
                  <span>Total Amount</span>
                  <span>₹{totalAmount.toFixed(2)}</span>
                </div>
                {parseFloat(receivedAmount) > 0 && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Received</span>
                      <span className="font-medium text-blue-600">₹{parseFloat(receivedAmount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Balance</span>
                      <span className={cn("font-medium", balanceAmount > 0 ? "text-orange-600" : "text-green-600")}>
                        ₹{balanceAmount.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex gap-3 pt-4 mt-6 border-t">
        <Button variant="outline" onClick={handleClose} className="flex-1" disabled={isSaving}>
          Cancel
        </Button>
        <Button className="flex-1" onClick={handleCreateBill} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <IndianRupee className="h-4 w-4 mr-2" />
          )}
          {isSaving ? 'Creating...' : mode === 'create' ? 'Create Bill' : 'Update Bill'}
        </Button>
      </div>
    </SideDrawer>
  );
};
