/**
 * @file InventoryTable.jsx
 * @description Table component for displaying inventory items
 * @module components/resources/InventoryTable
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Package } from "lucide-react";

/**
 * Inventory Table Component
 * 
 * @param {Object} props
 * @param {Array} props.items - Array of inventory items
 * @param {boolean} props.loading - Loading state
 * @param {Function} props.onUpdateStock - Stock update handler
 * @param {Function} props.getStockStatus - Get stock status function
 * @returns {JSX.Element}
 */
export default function InventoryTable({ 
  items = [], 
  loading,
  onUpdateStock,
  getStockStatus 
}) {
  const getStatusBadge = (item) => {
    const status = getStockStatus(item);
    const variants = {
      depleted: "destructive",
      critical: "destructive",
      low: "secondary",
      sufficient: "default",
    };
    return <Badge variant={variants[status.status] || "default"}>{status.status}</Badge>;
  };

  if (loading) {
    return <div className="text-center py-8">Loading inventory...</div>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Inventory Items</CardTitle>
        <CardDescription>
          {items.length} item{items.length !== 1 ? "s" : ""} in inventory
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item Code</TableHead>
              <TableHead>Item Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Current Stock</TableHead>
              <TableHead>Min. Stock</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Value</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">{item.item_code}</TableCell>
                <TableCell>{item.item_name}</TableCell>
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-sm">{item.category}</span>
                    <span className="text-xs text-muted-foreground">{item.subcategory}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={item.current_stock <= item.minimum_stock ? "text-red-600 font-bold" : ""}>
                    {item.current_stock} {item.unit_of_measure}
                  </span>
                </TableCell>
                <TableCell>{item.minimum_stock} {item.unit_of_measure}</TableCell>
                <TableCell>{getStatusBadge(item)}</TableCell>
                <TableCell>{item.location}</TableCell>
                <TableCell>₱{(item.current_stock * item.unit_cost).toLocaleString()}</TableCell>
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateStock(item)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No inventory items found</p>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
