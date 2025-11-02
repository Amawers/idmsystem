/**
 * @file InventoryByCategory.jsx
 * @description Component for displaying inventory grouped by category
 * @module components/resources/InventoryByCategory
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Package } from "lucide-react";

/**
 * Inventory By Category Component
 * 
 * @param {Object} props
 * @param {Object} props.itemsByCategory - Items grouped by category
 * @param {Function} props.getStockStatus - Get stock status function
 * @param {boolean} props.detailed - Show detailed view
 * @returns {JSX.Element}
 */
export default function InventoryByCategory({ 
  itemsByCategory = {}, 
  getStockStatus,
  detailed = false 
}) {
  const categories = Object.entries(itemsByCategory);

  if (categories.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No inventory items available</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {categories.map(([category, items]) => {
        const totalItems = items.length;
        const totalValue = items.reduce((sum, item) => sum + (item.current_stock * item.unit_cost), 0);
        const lowStockItems = items.filter(item => {
          const status = getStockStatus(item);
          return status.status === 'low' || status.status === 'critical';
        });
        const averageStockLevel = items.reduce((sum, item) => {
          const status = getStockStatus(item);
          return sum + status.percentage;
        }, 0) / totalItems;

        return (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="capitalize">{category}</span>
                <Package className="h-5 w-5 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                {totalItems} item{totalItems !== 1 ? "s" : ""}
                {lowStockItems.length > 0 && (
                  <span className="text-orange-600 font-medium ml-2">
                    • {lowStockItems.length} low/critical
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-muted-foreground">Average Stock Level</span>
                  <span className="font-bold">{averageStockLevel.toFixed(0)}%</span>
                </div>
                <Progress 
                  value={averageStockLevel} 
                  className={averageStockLevel < 50 ? "bg-red-100" : averageStockLevel < 80 ? "bg-yellow-100" : ""}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Total Value</p>
                  <p className="text-lg font-bold">₱{totalValue.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Items Count</p>
                  <p className="text-lg font-bold">{totalItems}</p>
                </div>
              </div>

              {detailed && (
                <div className="border-t pt-4 space-y-2">
                  <p className="text-sm font-medium mb-2">Items:</p>
                  {items.slice(0, 5).map(item => {
                    const status = getStockStatus(item);
                    return (
                      <div key={item.id} className="flex items-center justify-between text-xs">
                        <span className="truncate flex-1">{item.item_name}</span>
                        <span className={
                          status.status === 'critical' || status.status === 'depleted' 
                            ? 'text-red-600 font-bold' 
                            : status.status === 'low' 
                            ? 'text-yellow-600 font-medium'
                            : ''
                        }>
                          {item.current_stock} {item.unit}
                        </span>
                      </div>
                    );
                  })}
                  {items.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center pt-1">
                      +{items.length - 5} more items
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
