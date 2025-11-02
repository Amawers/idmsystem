/**
 * @file StockUpdateDialog.jsx
 * @description Dialog for updating inventory stock levels
 * @module components/resources/StockUpdateDialog
 */

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Stock Update Dialog Component
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog state change handler
 * @param {Object} props.item - Selected inventory item
 * @param {Function} props.onUpdate - Update handler
 * @returns {JSX.Element}
 */
export default function StockUpdateDialog({ open, onOpenChange, item, onUpdate }) {
  const [formData, setFormData] = useState({
    transaction_type: "restock",
    quantity: "",
    notes: "",
  });

  useEffect(() => {
    if (!open) {
      setFormData({
        transaction_type: "restock",
        quantity: "",
        notes: "",
      });
    }
  }, [open]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const quantity = parseFloat(formData.quantity);
    const newStock = formData.transaction_type === "restock" 
      ? (item?.current_stock || 0) + quantity
      : (item?.current_stock || 0) - quantity;

    onUpdate(item?.id, {
      ...formData,
      quantity,
      new_stock: newStock,
    });
  };

  const currentStock = item?.current_stock || 0;
  const quantity = parseFloat(formData.quantity) || 0;
  const newStock = formData.transaction_type === "restock" 
    ? currentStock + quantity
    : currentStock - quantity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Update Stock</DialogTitle>
          <DialogDescription>
            {item ? `Update stock for ${item.item_name}` : "Update inventory stock levels"}
          </DialogDescription>
        </DialogHeader>
        
        {item && (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Item Code</p>
                <p className="font-medium">{item.item_code}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Current Stock</p>
                <p className="font-medium">{item.current_stock} {item.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Minimum Stock</p>
                <p className="font-medium">{item.minimum_stock} {item.unit}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">{item.location}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Transaction Type</Label>
                <Select 
                  value={formData.transaction_type} 
                  onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="restock">Restock (Add)</SelectItem>
                    <SelectItem value="allocation">Allocation (Remove)</SelectItem>
                    <SelectItem value="adjustment">Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantity</Label>
                <Input
                  type="number"
                  step="1"
                  min="0"
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                  placeholder={`Enter quantity in ${item.unit}`}
                  required
                />
              </div>

              {formData.quantity && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm">
                    <span className="text-muted-foreground">New Stock Level: </span>
                    <span className={`font-bold ${newStock < item.minimum_stock ? 'text-red-600' : 'text-green-600'}`}>
                      {newStock} {item.unit}
                    </span>
                  </p>
                  {newStock < item.minimum_stock && (
                    <p className="text-xs text-red-600 mt-1">
                      Warning: Below minimum stock level
                    </p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label>Notes</Label>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add notes about this transaction (optional)"
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit">Update Stock</Button>
              </div>
            </form>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
