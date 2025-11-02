/**
 * @file RequestSubmissionDialog.jsx
 * @description Dialog for submitting new resource requests
 * @module components/resources/RequestSubmissionDialog
 */

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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
  const [formData, setFormData] = useState({
    request_type: "",
    resource_category: "",
    item_description: "",
    quantity: "",
    unit: "",
    unit_cost: "",
    justification: "",
    priority: "medium",
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      quantity: parseFloat(formData.quantity),
      unit_cost: parseFloat(formData.unit_cost),
      total_amount: parseFloat(formData.quantity) * parseFloat(formData.unit_cost),
    });
    setFormData({
      request_type: "",
      resource_category: "",
      item_description: "",
      quantity: "",
      unit: "",
      unit_cost: "",
      justification: "",
      priority: "medium",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Resource Request</DialogTitle>
          <DialogDescription>
            Fill out the form below to submit a new resource request
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Request Type</Label>
              <Select value={formData.request_type} onValueChange={(value) => setFormData({ ...formData, request_type: value })}>
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
              <Select value={formData.priority} onValueChange={(value) => setFormData({ ...formData, priority: value })}>
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

          <div className="space-y-2">
            <Label>Resource Category</Label>
            <Input
              value={formData.resource_category}
              onChange={(e) => setFormData({ ...formData, resource_category: e.target.value })}
              placeholder="e.g., Educational Assistance, Medical Supplies"
            />
          </div>

          <div className="space-y-2">
            <Label>Item Description</Label>
            <Textarea
              value={formData.item_description}
              onChange={(e) => setFormData({ ...formData, item_description: e.target.value })}
              placeholder="Detailed description of the requested resource"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label>Unit</Label>
              <Input
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                placeholder="e.g., sets, kits"
              />
            </div>

            <div className="space-y-2">
              <Label>Unit Cost (₱)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          {formData.quantity && formData.unit_cost && (
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm font-medium">
                Total Amount: ₱{(parseFloat(formData.quantity) * parseFloat(formData.unit_cost)).toLocaleString()}
              </p>
            </div>
          )}

          <div className="space-y-2">
            <Label>Justification</Label>
            <Textarea
              value={formData.justification}
              onChange={(e) => setFormData({ ...formData, justification: e.target.value })}
              placeholder="Explain why this resource is needed and how it will be used"
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Submit Request</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
