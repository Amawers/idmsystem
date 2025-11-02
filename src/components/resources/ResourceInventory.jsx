/**
 * @file ResourceInventory.jsx
 * @description Main inventory dashboard component with stock tracking and alerts
 * @module components/resources/ResourceInventory
 * 
 * Features:
 * - Real-time stock level monitoring
 * - Low stock and critical stock alerts
 * - Expiration tracking
 * - Inventory value calculation
 * - Category-based filtering
 * - Location tracking
 */

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, TrendingDown, DollarSign, Plus } from "lucide-react";
import { useInventory } from "@/hooks/useInventory";
import InventoryTable from "./InventoryTable";
import InventoryAlerts from "./InventoryAlerts";
import InventoryByCategory from "./InventoryByCategory";
import StockUpdateDialog from "./StockUpdateDialog";

/**
 * Resource Inventory Dashboard Component
 * 
 * Provides centralized visibility into:
 * - Current stock levels
 * - Low/critical stock items
 * - Expiring items
 * - Inventory value
 * - Category distribution
 * 
 * @returns {JSX.Element} Inventory dashboard interface
 */
export default function ResourceInventory() {
  const [showStockUpdateDialog, setShowStockUpdateDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [initialized, setInitialized] = useState(false);

  // Fetch inventory data
  const {
    items,
    itemsByCategory,
    itemsNeedingAttention,
    expiringSoon,
    statistics,
    totalValue,
    loading,
    updateStock,
    allocateResource,
    refresh,
    getStockStatus,
  } = useInventory({ autoFetch: !initialized });

  // Initialize on mount
  useEffect(() => {
    if (!initialized) {
      refresh();
      setInitialized(true);
    }
  }, [initialized, refresh]);

  /**
   * Handle stock update
   */
  const handleUpdateStock = async (itemId, updateData) => {
    try {
      await updateStock(itemId, updateData);
      setShowStockUpdateDialog(false);
      setSelectedItem(null);
      refresh();
    } catch (error) {
      console.error("Failed to update stock:", error);
    }
  };

  /**
   * Handle resource allocation
   */
  const handleAllocateResource = async (itemId, allocationData) => {
    try {
      await allocateResource(itemId, allocationData);
      refresh();
    } catch (error) {
      console.error("Failed to allocate resource:", error);
    }
  };

  /**
   * Open stock update dialog
   */
  const handleOpenStockUpdate = (item) => {
    setSelectedItem(item);
    setShowStockUpdateDialog(true);
  };

  // Count items by status
  const lowStockCount = items?.filter(i => i.status === 'low_stock').length || 0;
  const criticalStockCount = items?.filter(i => i.status === 'critical_stock').length || 0;
  const expiringCount = expiringSoon?.length || 0;

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Inventory Management</h3>
          <p className="text-sm text-muted-foreground">
            Monitor stock levels, track usage, and manage resources
          </p>
        </div>
        <Button onClick={() => setShowStockUpdateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Update Stock
        </Button>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics?.total_items || 0}</div>
            <p className="text-xs text-muted-foreground">
              {statistics?.active_items || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lowStockCount}</div>
            <p className="text-xs text-muted-foreground">
              {criticalStockCount} critical
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
            <TrendingDown className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringCount}</div>
            <p className="text-xs text-muted-foreground">
              Within 60 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₱{totalValue?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Current stock value
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="all-items">All Items</TabsTrigger>
          <TabsTrigger value="alerts">
            Alerts
            {(lowStockCount + criticalStockCount + expiringCount > 0) && (
              <span className="ml-2 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white">
                {lowStockCount + criticalStockCount + expiringCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="by-category">By Category</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Stock Status Summary</CardTitle>
                <CardDescription>Overview of inventory health</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-green-500"></div>
                      <span className="text-sm">Available</span>
                    </div>
                    <span className="text-sm font-medium">
                      {items?.filter(i => i.status === 'available').length || 0}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
                      <span className="text-sm">Low Stock</span>
                    </div>
                    <span className="text-sm font-medium">{lowStockCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-red-500"></div>
                      <span className="text-sm">Critical Stock</span>
                    </div>
                    <span className="text-sm font-medium">{criticalStockCount}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="h-3 w-3 rounded-full bg-orange-500"></div>
                      <span className="text-sm">Expiring Soon</span>
                    </div>
                    <span className="text-sm font-medium">{expiringCount}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Priority Alerts</CardTitle>
                <CardDescription>Items requiring immediate attention</CardDescription>
              </CardHeader>
              <CardContent>
                <InventoryAlerts
                  items={itemsNeedingAttention?.slice(0, 5) || []}
                  onUpdateStock={handleOpenStockUpdate}
                  compact={true}
                />
              </CardContent>
            </Card>
          </div>

          {/* Category Overview */}
          <InventoryByCategory
            itemsByCategory={itemsByCategory}
            getStockStatus={getStockStatus}
          />
        </TabsContent>

        {/* All Items Tab */}
        <TabsContent value="all-items" className="space-y-4">
          <InventoryTable
            items={items}
            loading={loading}
            onUpdateStock={handleOpenStockUpdate}
            onAllocate={handleAllocateResource}
            getStockStatus={getStockStatus}
          />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Alerts</CardTitle>
              <CardDescription>
                Items with low stock, critical stock, or approaching expiration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <InventoryAlerts
                items={itemsNeedingAttention}
                expiringSoon={expiringSoon}
                onUpdateStock={handleOpenStockUpdate}
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Category Tab */}
        <TabsContent value="by-category" className="space-y-4">
          <InventoryByCategory
            itemsByCategory={itemsByCategory}
            getStockStatus={getStockStatus}
            detailed={true}
          />
        </TabsContent>
      </Tabs>

      {/* Stock Update Dialog */}
      <StockUpdateDialog
        open={showStockUpdateDialog}
        onOpenChange={setShowStockUpdateDialog}
        item={selectedItem}
        onUpdate={handleUpdateStock}
      />
    </div>
  );
}
