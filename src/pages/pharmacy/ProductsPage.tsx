// src/pages/pharmacy/ProductsPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { DataTable, DataTableColumn } from '@/components/DataTable';
import { ProductSideDrawer } from '@/components/pharmacy/ProductSideDrawer';
import { CategorySideDrawer } from '@/components/pharmacy/CategorySideDrawer';
import { PharmacyProductCard } from '@/components/pharmacy/PharmacyProductCard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Package,
  AlertTriangle,
  Tag,
  FolderTree,
  LayoutGrid,
  List,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { PharmacyProduct, ProductCategory } from '@/types/pharmacy.types';
import { pharmacyProductService, productCategoryService, cartService } from '@/services/pharmacy.service';
import { toast } from 'sonner';
import { DrawerMode } from '@/components/SideDrawer';

export default function ProductsPage() {
  const [products, setProducts] = useState<PharmacyProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<PharmacyProduct | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);
  const [activeView, setActiveView] = useState<'table' | 'grid'>('table');

  // Drawer states
  const [productDrawerOpen, setProductDrawerOpen] = useState(false);
  const [productDrawerMode, setProductDrawerMode] = useState<DrawerMode>('view');
  const [categoryDrawerOpen, setCategoryDrawerOpen] = useState(false);
  const [categoryDrawerMode, setCategoryDrawerMode] = useState<DrawerMode>('view');

  // Load products
  const loadProducts = async () => {
    setIsLoading(true);
    try {
      const response = await pharmacyProductService.list();
      setProducts(response.results || []);
    } catch (error) {
      console.error('Failed to load products:', error);
      toast.error('Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
  }, []);

  // Product CRUD handlers
  const handleViewProduct = (product: PharmacyProduct) => {
    setSelectedProduct(product);
    setProductDrawerMode('view');
    setProductDrawerOpen(true);
  };

  const handleEditProduct = (product: PharmacyProduct) => {
    setSelectedProduct(product);
    setProductDrawerMode('edit');
    setProductDrawerOpen(true);
  };

  const handleCreateProduct = () => {
    setSelectedProduct(null);
    setProductDrawerMode('create');
    setProductDrawerOpen(true);
  };

  const handleDeleteProduct = async (product: PharmacyProduct) => {
    try {
      await pharmacyProductService.destroy(product.id);
      toast.success('Product deleted successfully');
      loadProducts();
    } catch (error: any) {
      console.error('Failed to delete product:', error);
      toast.error(error?.response?.data?.message || 'Failed to delete product');
    }
  };

  // Category handlers
  const handleManageCategories = () => {
    setSelectedCategory(null);
    setCategoryDrawerMode('create');
    setCategoryDrawerOpen(true);
  };

  // Cart handler for grid view
  const handleAddToCart = async (product: PharmacyProduct, quantity: number) => {
    try {
      await cartService.addItem({
        product_id: product.id,
        quantity,
      });
      toast.success(`${product.product_name} added to cart`);
    } catch (error: any) {
      console.error('Failed to add to cart:', error);
      toast.error(error?.response?.data?.error || 'Failed to add to cart');
    }
  };

  // Table columns configuration
  const columns: DataTableColumn<PharmacyProduct>[] = [
    {
      header: 'Product Name',
      key: 'product_name',
      sortable: true,
      filterable: true,
      accessor: (row) => row.product_name,
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">{row.product_name}</span>
          {row.company && (
            <span className="text-xs text-muted-foreground">{row.company}</span>
          )}
        </div>
      ),
    },
    {
      header: 'Category',
      key: 'category',
      sortable: true,
      filterable: true,
      accessor: (row) => row.category?.name || 'Uncategorized',
      cell: (row) => (
        <Badge variant="outline" className="font-normal">
          {row.category?.name || 'Uncategorized'}
        </Badge>
      ),
    },
    {
      header: 'Batch No',
      key: 'batch_no',
      filterable: true,
      accessor: (row) => row.batch_no || '',
      cell: (row) => (
        <span className="text-sm text-muted-foreground">
          {row.batch_no || '-'}
        </span>
      ),
    },
    {
      header: 'MRP',
      key: 'mrp',
      sortable: true,
      accessor: (row) => Number(row.mrp),
      cell: (row) => (
        <div className="flex flex-col">
          <span className="font-medium">₹{Number(row.mrp).toFixed(2)}</span>
          {row.selling_price && Number(row.selling_price) < Number(row.mrp) && (
            <span className="text-xs text-green-600">
              SP: ₹{Number(row.selling_price).toFixed(2)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Stock',
      key: 'quantity',
      sortable: true,
      accessor: (row) => row.quantity,
      cell: (row) => {
        const isLowStock = row.quantity <= row.minimum_stock_level;
        const isOutOfStock = row.quantity === 0;

        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={isOutOfStock ? 'destructive' : isLowStock ? 'outline' : 'default'}
              className={isLowStock && !isOutOfStock ? 'border-orange-500 text-orange-500' : ''}
            >
              {row.quantity}
            </Badge>
            {isLowStock && !isOutOfStock && (
              <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
            )}
          </div>
        );
      },
      className: 'w-28',
    },
    {
      header: 'Expiry',
      key: 'expiry_date',
      sortable: true,
      accessor: (row) => row.expiry_date || '',
      cell: (row) => {
        if (!row.expiry_date) return <span className="text-sm text-muted-foreground">-</span>;

        const expiryDate = new Date(row.expiry_date);
        const today = new Date();
        const daysToExpiry = Math.floor(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );
        const isExpired = daysToExpiry < 0;
        const isNearExpiry = daysToExpiry >= 0 && daysToExpiry <= 90;

        return (
          <div className="flex items-center gap-2">
            <span
              className={`text-sm ${
                isExpired
                  ? 'text-destructive font-medium'
                  : isNearExpiry
                  ? 'text-orange-500'
                  : 'text-muted-foreground'
              }`}
            >
              {expiryDate.toLocaleDateString()}
            </span>
            {(isExpired || isNearExpiry) && (
              <AlertTriangle
                className={`h-3.5 w-3.5 ${isExpired ? 'text-destructive' : 'text-orange-500'}`}
              />
            )}
          </div>
        );
      },
    },
    {
      header: 'Status',
      key: 'is_active',
      sortable: true,
      accessor: (row) => (row.is_active ? 'active' : 'inactive'),
      cell: (row) => (
        <Badge variant={row.is_active ? 'default' : 'secondary'}>
          {row.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
      className: 'w-24',
    },
  ];

  const stats = useMemo(() => {
    const total = products.length;
    const active = products.filter(p => p.is_active).length;
    const lowStock = products.filter(p => p.quantity > 0 && p.quantity <= p.minimum_stock_level).length;
    const outOfStock = products.filter(p => p.quantity === 0).length;
    return { total, active, lowStock, outOfStock };
  }, [products]);

  return (
    <div className="p-4 md:p-5 w-full space-y-3">
      {/* Row 1: Title + inline stats + actions */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-wrap">
          <h1 className="text-lg font-bold leading-none">Pharmacy Products</h1>
          <div className="hidden sm:flex items-center gap-3 text-[12px] text-muted-foreground">
            <span className="flex items-center gap-1"><Package className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.total}</span> Total</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.active}</span> Active</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.lowStock}</span> Low Stock</span>
            <span className="text-border">|</span>
            <span className="flex items-center gap-1"><XCircle className="h-3 w-3" /> <span className="font-semibold text-foreground">{stats.outOfStock}</span> Out of Stock</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-7 text-[12px] hidden sm:flex" onClick={handleManageCategories}>
            <FolderTree className="h-3.5 w-3.5 mr-1" /> Categories
          </Button>
          <Button size="sm" className="w-full sm:w-auto h-7 text-[12px]" onClick={handleCreateProduct}>
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Product
          </Button>
        </div>
      </div>

      {/* Mobile-only stats */}
      <div className="flex sm:hidden items-center gap-3 text-[11px] text-muted-foreground flex-wrap">
        <span><span className="font-semibold text-foreground">{stats.total}</span> Total</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.active}</span> Active</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.lowStock}</span> Low Stock</span>
        <span className="text-border">|</span>
        <span><span className="font-semibold text-foreground">{stats.outOfStock}</span> Out</span>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'table' | 'grid')}>
        <TabsList className="bg-transparent h-auto p-0 border-b w-full justify-start rounded-none">
          <TabsTrigger
            value="table"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-1.5 text-[12px] h-8"
          >
            <List className="h-3.5 w-3.5 mr-1.5" />
            Table
          </TabsTrigger>
          <TabsTrigger
            value="grid"
            className="data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-3 py-1.5 text-[12px] h-8"
          >
            <LayoutGrid className="h-3.5 w-3.5 mr-1.5" />
            Grid
          </TabsTrigger>
        </TabsList>

        {/* Table View */}
        <TabsContent value="table" className="mt-3">
          <Card>
            <CardContent className="p-0">
              <DataTable
                rows={products}
                columns={columns}
                isLoading={isLoading}
                getRowId={(row) => row.id}
                getRowLabel={(row) => row.product_name}
                onRowClick={handleViewProduct}
                onView={handleViewProduct}
                onEdit={handleEditProduct}
                onDelete={handleDeleteProduct}
                extraActions={(row) => (
                  <>
                    <DropdownMenuItem onClick={() => handleViewProduct(row)}>
                      <Tag className="h-4 w-4 mr-2" />
                      View Details
                    </DropdownMenuItem>
                  </>
                )}
                renderMobileCard={(row, actions) => (
                  <>
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{row.product_name}</h3>
                        {row.company && (
                          <p className="text-xs text-muted-foreground mt-0.5">{row.company}</p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1 ml-2">
                        <Badge variant={row.is_active ? 'default' : 'secondary'} className="text-xs">
                          {row.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {row.category && (
                          <Badge variant="outline" className="text-xs font-normal">
                            {row.category.name}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">MRP</p>
                        <p className="font-semibold">₹{Number(row.mrp).toFixed(2)}</p>
                        {row.selling_price && Number(row.selling_price) < Number(row.mrp) && (
                          <p className="text-xs text-green-600">SP: ₹{Number(row.selling_price).toFixed(2)}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Stock</p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              row.quantity === 0
                                ? 'destructive'
                                : row.quantity <= row.minimum_stock_level
                                ? 'outline'
                                : 'default'
                            }
                            className={
                              row.quantity > 0 && row.quantity <= row.minimum_stock_level
                                ? 'border-orange-500 text-orange-500'
                                : ''
                            }
                          >
                            {row.quantity}
                          </Badge>
                          {row.quantity > 0 && row.quantity <= row.minimum_stock_level && (
                            <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                          )}
                        </div>
                      </div>

                      {row.batch_no && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Batch No</p>
                          <p className="text-sm">{row.batch_no}</p>
                        </div>
                      )}

                      {row.expiry_date && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Expiry</p>
                          <div className="flex items-center gap-1">
                            <p className="text-sm">
                              {new Date(row.expiry_date).toLocaleDateString()}
                            </p>
                            {new Date(row.expiry_date) < new Date() && (
                              <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mt-3">
                      {actions.view && (
                        <Button variant="outline" size="sm" onClick={actions.view} className="flex-1">
                          View
                        </Button>
                      )}
                      {actions.edit && (
                        <Button variant="outline" size="sm" onClick={actions.edit} className="flex-1">
                          Edit
                        </Button>
                      )}
                    </div>
                  </>
                )}
                emptyTitle="No products found"
                emptySubtitle="Get started by adding your first product"
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Grid View */}
        <TabsContent value="grid" className="mt-3">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-56 bg-muted animate-pulse rounded-lg" />
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-3" />
              <h3 className="text-sm font-semibold mb-1">No products found</h3>
              <p className="text-xs text-muted-foreground mb-3">
                Get started by adding your first product
              </p>
              <Button size="sm" className="h-7 text-[12px]" onClick={handleCreateProduct}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Product
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {products.map((product) => (
                <PharmacyProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onViewDetails={handleViewProduct}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Product Drawer */}
      <ProductSideDrawer
        open={productDrawerOpen}
        onOpenChange={setProductDrawerOpen}
        mode={productDrawerMode}
        product={selectedProduct}
        onSuccess={loadProducts}
      />

      {/* Category Drawer */}
      <CategorySideDrawer
        open={categoryDrawerOpen}
        onOpenChange={setCategoryDrawerOpen}
        mode={categoryDrawerMode}
        category={selectedCategory}
        onSuccess={() => {
          loadProducts();
        }}
      />
    </div>
  );
}
