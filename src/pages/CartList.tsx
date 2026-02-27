// src/pages/CartList.tsx
import React, { useState, useMemo } from 'react';
import { usePharmacy } from '@/hooks/usePharmacy';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { DrawerMode } from '@/components/SideDrawer';
import { CartItem, PharmacyOrder } from '@/types/pharmacy.types';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Plus, Minus, Trash2, ShoppingCart, ClipboardList, Package, CheckCircle, XCircle } from 'lucide-react';
import { OrderDetailsDrawer } from '@/components/pharmacy/OrderDetailsDrawer';
import { CreateOrderDrawer } from '@/components/pharmacy/CreateOrderDrawer';

export const CartListPage: React.FC = () => {
  const {
    useCart,
    usePharmacyOrders,
    updateCartItem,
    removeItemFromCart,
    clearCart,
  } = usePharmacy();

  const { data: cart, isLoading: cartLoading, mutate: refreshCart } = useCart();
  const { data: ordersData, isLoading: ordersLoading, mutate: refreshOrders } = usePharmacyOrders();

  const [orderDetailsDrawerOpen, setOrderDetailsDrawerOpen] = useState(false);
  const [createOrderDrawerOpen, setCreateOrderDrawerOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PharmacyOrder | undefined>(undefined);

  const handleViewOrder = (order: PharmacyOrder) => {
    setSelectedOrder(order);
    setOrderDetailsDrawerOpen(true);
  };

  const cartItems = cart?.cart_items || [];
  const orders = ordersData?.results || [];

  const orderStats = useMemo(() => {
    const total = orders.length;
    const completed = orders.filter(o => o.status === 'completed').length;
    const cancelled = orders.filter(o => o.status === 'cancelled').length;
    const pending = total - completed - cancelled;
    return { total, completed, cancelled, pending };
  }, [orders]);

  const cartColumns = useMemo((): DataTableColumn<CartItem>[] => [
    {
      header: 'Product',
      key: 'product',
      cell: (item) => item.product.product_name,
    },
    {
      header: 'Price',
      key: 'price',
      cell: (item) => `₹${Number(item.price_at_time).toFixed(2)}`,
    },
    {
      header: 'Quantity',
      key: 'quantity',
      cell: (item) => (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => updateCartItem.mutate({ cart_item_id: item.id, quantity: item.quantity - 1 })}
            disabled={item.quantity <= 1}
          >
            <Minus className="h-3 w-3" />
          </Button>
          <span>{item.quantity}</span>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6"
            onClick={() => updateCartItem.mutate({ cart_item_id: item.id, quantity: item.quantity + 1 })}
          >
            <Plus className="h-3 w-3" />
          </Button>
        </div>
      ),
    },
    {
      header: 'Total',
      key: 'total',
      cell: (item) => `₹${Number(item.total_price).toFixed(2)}`,
    },
  ], [updateCartItem]);

  const ordersColumns = useMemo((): DataTableColumn<PharmacyOrder>[] => [
    {
      header: 'Order ID',
      key: 'id',
      cell: (order) => <div className="font-mono">#{order.id}</div>,
    },
    {
      header: 'Status',
      key: 'status',
      cell: (order) => <Badge variant={order.status === 'completed' ? 'default' : order.status === 'cancelled' ? 'destructive' : 'secondary'}>{order.status_display || order.status}</Badge>,
    },
    {
      header: 'Payment',
      key: 'payment_status',
      cell: (order) => <Badge variant="outline">{order.payment_status_display || order.payment_status}</Badge>,
    },
    {
      header: 'Total',
      key: 'total',
      cell: (order) => `₹${Number(order.total_amount).toFixed(2)}`,
    },
    {
      header: 'Date',
      key: 'date',
      cell: (order) => format(new Date(order.created_at), 'PPpp'),
    },
  ], []);

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Cart & Orders</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><ShoppingCart className="h-3 w-3" /> <span className="font-semibold text-foreground">{cartItems.length}</span> Cart Items</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><ClipboardList className="h-3 w-3" /> <span className="font-semibold text-foreground">{orderStats.total}</span> Orders</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{orderStats.completed}</span> Completed</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[12px]" onClick={() => clearCart.mutate()} disabled={cartItems.length === 0}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear Cart
          </Button>
          <Button size="sm" className="h-7 text-[12px]" onClick={() => setCreateOrderDrawerOpen(true)} disabled={cartItems.length === 0}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1" /> Create Order
          </Button>
        </div>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{cartItems.length}</span> Cart Items</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{orderStats.total}</span> Orders</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{orderStats.completed}</span> Done</span>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="cart">
        <TabsList className="bg-transparent h-auto p-0 border-b w-full justify-start rounded-none">
          <TabsTrigger
            value="cart"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-1.5 text-[12px] h-8"
          >
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" />
            Cart ({cartItems.length})
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-1.5 text-[12px] h-8"
          >
            <ClipboardList className="h-3.5 w-3.5 mr-1.5" />
            Orders ({orders.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cart" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                rows={cartItems}
                columns={cartColumns}
                isLoading={cartLoading}
                getRowId={(row) => row.id}
                getRowLabel={(row) => row.product.product_name}
                onDelete={(row) => removeItemFromCart.mutate({ cart_item_id: row.id })}
                emptyTitle="Your cart is empty"
                emptySubtitle="Add products to your cart to get started."
                renderMobileCard={(row) => <div>{row.product.product_name}</div>}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                rows={orders}
                columns={ordersColumns}
                isLoading={ordersLoading}
                getRowId={(row) => row.id}
                getRowLabel={(row) => `#${row.id}`}
                onView={handleViewOrder}
                emptyTitle="No orders found"
                emptySubtitle="You haven't placed any orders yet."
                renderMobileCard={(row) => <div>{row.order_id}</div>}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <OrderDetailsDrawer
            open={orderDetailsDrawerOpen}
            onOpenChange={setOrderDetailsDrawerOpen}
            order={selectedOrder}
        />
      )}

      <CreateOrderDrawer
        open={createOrderDrawerOpen}
        onOpenChange={setCreateOrderDrawerOpen}
        cart={cart}
      />
    </div>
  );
};

export default CartListPage;
