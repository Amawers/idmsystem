/**
 * @file RequestSubmissionDialog.jsx
 * @description Dialog for submitting new resource requests
 * @module components/resources/RequestSubmissionDialog
 */

import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useInventory } from "@/hooks/useInventory";

/**
 * Request Submission Dialog Component
 * 
 * @param {Object} props
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Dialog state change handler
 * @param {Function} props.onSubmit - Submit handler
 * @returns {JSX.Element}
 */
export default function RequestSubmissionDialog({ open, onOpenChange, onSubmit }) {
  // Fetch inventory items
  const { items: inventoryItems, loading: inventoryLoading } = useInventory({ autoFetch: true });

  const [formData, setFormData] = useState({
    request_type: "",
    category: "",
    item_id: "",
    item_name: "",
    unit_of_measure: "",
    unit_cost: "",
    quantity: "",
    current_stock: "",
    description: "",
    justification: "",
    priority: "medium",
  });

  // Extract unique categories from inventory
  const categories = useMemo(() => {
    const uniqueCategories = [...new Set(inventoryItems.map(item => item.category))];
    return uniqueCategories.filter(Boolean).sort();
  }, [inventoryItems]);

  // Filter items by selected category
  const filteredItems = useMemo(() => {
    if (!formData.category) return [];
    return inventoryItems.filter(item => item.category === formData.category);
  }, [formData.category, inventoryItems]);

  // Get selected item details
  const selectedItem = useMemo(() => {
    if (!formData.item_id) return null;
    return inventoryItems.find(item => item.id === formData.item_id);
  }, [formData.item_id, inventoryItems]);

  // Update form when item is selected
  useEffect(() => {
    if (selectedItem) {
      setFormData(prev => ({
        ...prev,
        item_name: selectedItem.item_name,
        unit_of_measure: selectedItem.unit_of_measure,
        unit_cost: selectedItem.unit_cost.toString(),
        current_stock: selectedItem.current_stock.toString(),
        description: selectedItem.description || "",
      }));
    }
  }, [selectedItem]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantity: parseFloat(formData.quantity),
      unit_cost: parseFloat(formData.unit_cost),
      total_amount: parseFloat(formData.quantity) * parseFloat(formData.unit_cost),
      resource_category: formData.category,
      item_description: formData.item_name,
    });
    // Reset form
    setFormData({
      request_type: "",
      category: "",
      item_id: "",
      item_name: "",
      unit_of_measure: "",
      unit_cost: "",
      quantity: "",
      current_stock: "",
      description: "",
      justification: "",
      priority: "medium",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Resource Request</DialogTitle>
          <DialogDescription>
            Fill out the form below to submit a new resource request
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Two Column Layout */}
          <div className="grid grid-cols-2 gap-6">
            {/* Left Column - Form Inputs */}
            <div className="space-y-4">
              {/* Request Type and Priority */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Request Type</Label>
                  <Select 
                    value={formData.request_type} 
                    onValueChange={(value) => setFormData({ ...formData, request_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="financial">Financial</SelectItem>
                      <SelectItem value="material">Material</SelectItem>
                      <SelectItem value="human_resource">Human Resource</SelectItem>
                      <SelectItem value="equipment">Equipment</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select 
                    value={formData.priority} 
                    onValueChange={(value) => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Category and Item Name */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Select 
                    value={formData.category} 
                    onValueChange={(value) => {
                      setFormData({ 
                        ...formData, 
                        category: value,
                        item_id: "",
                        item_name: "",
                        unit_of_measure: "",
                        unit_cost: "",
                        current_stock: "",
                        description: "",
                      });
                    }}
                    disabled={inventoryLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={inventoryLoading ? "Loading categories..." : "Select category"} />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Item Name</Label>
                  <Select 
                    value={formData.item_id} 
                    onValueChange={(value) => setFormData({ ...formData, item_id: value })}
                    disabled={!formData.category || filteredItems.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={
                        !formData.category 
                          ? "Select a category first" 
                          : filteredItems.length === 0 
                          ? "No items available" 
                          : "Select item"
                      } />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredItems.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.item_name} ({item.item_code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Unit Cost and Unit Measure */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Unit Cost (₱)</Label>
                  <Input
                    value={formData.unit_cost ? `₱${parseFloat(formData.unit_cost).toLocaleString()}` : ""}
                    disabled
                    className="bg-muted"
                    placeholder="Select item first"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Unit Measure</Label>
                  <Input
                    value={formData.unit_of_measure}
                    disabled
                    className="bg-muted"
                    placeholder="Select item first"
                  />
                </div>
              </div>

              {/* Total Amount Display */}
              {formData.quantity && formData.unit_cost && (
                <div className="p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium">
                    Total Amount: ₱{(parseFloat(formData.quantity) * parseFloat(formData.unit_cost)).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              )}
            </div>

            {/* Right Column - Quantity, Stocks, Description, Justification */}
            <div className="space-y-4">
              {/* Quantity and Available Stocks */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Quantity</Label>
                  <Input
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                    placeholder="Enter quantity"
                    min="1"
                    step="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Available Stocks</Label>
                  <Input
                    value={formData.current_stock ? parseFloat(formData.current_stock).toLocaleString() : ""}
                    disabled
                    className="bg-muted"
                    placeholder="Select item first"
                  />
                </div>
              </div>

              {/* Description (Display Only) */}
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  value={formData.description}
                  disabled
                  className="bg-muted"
                  placeholder="Item description will appear here"
                  rows={4}
                />
              </div>

              {/* Justification */}
              <div className="space-y-2">
                <Label>Justification</Label>
                <Textarea
                  value={formData.justification}
                  onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
                  placeholder="Explain why this resource is needed and how it will be used"
                  rows={7}
                  required
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={!formData.item_id || !formData.quantity || !formData.justification}>
              Submit Request
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
