/**
 * @file StockManagement.jsx
 * @description Inventory stock management component for adding, removing, and adjusting stock levels
 * @module components/resources/StockManagement
 * 
 * Features:
 * - View all inventory items with current stock
 * - Add stock (new shipments/deliveries)
 * - Remove stock (distributions/usage)
 * - Adjust stock (corrections/audits)
 * - Add new inventory items
 * - Transaction history tracking
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Package,
  Plus,
  Minus,
  Edit,
  AlertTriangle,
  CheckCircle,
  Search,
  RefreshCw,
  PlusCircle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Trash2,
} from "lucide-react";
import { useResourceStore } from "@/store/useResourceStore";
import { useAuthStore } from "@/store/authStore";
import RequestSubmissionDialog from "./RequestSubmissionDialog";

/**
 * Status Badge Component
 */
function StatusBadge({ status }) {
  const variants = {
    available: { variant: "success", label: "Available", icon: CheckCircle, iconColor: "text-green-600" },
    low_stock: { variant: "warning", label: "Low Stock", icon: AlertTriangle, iconColor: "text-yellow-600" },
    critical_stock: { variant: "destructive", label: "Critical", icon: AlertTriangle, iconColor: "text-orange-600" },
    depleted: { variant: "destructive", label: "Depleted", icon: AlertTriangle, iconColor: "text-red-600" },
  };

  const config = variants[status] || variants.available;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="text-xs flex items-center gap-1 w-fit">
      <Icon className={`h-3 w-3 ${config.iconColor}`} />
      {config.label}
    </Badge>
  );
}

/**
 * Stock Adjustment Dialog
 */
function StockAdjustmentDialog({ item, open, onClose, onSuccess }) {
  const [type, setType] = useState("stock_in"); // stock_in, stock_out, adjustment
  const [quantity, setQuantity] = useState("");
  const [loading, setLoading] = useState(false);
  const { updateStock } = useResourceStore();
  const { user } = useAuthStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) return;

    setLoading(true);
    try {
      const adjustedQuantity = type === "stock_out" ? -Math.abs(parseFloat(quantity)) : parseFloat(quantity);
      
      await updateStock(item.id, adjustedQuantity, type, "");
      
      onSuccess?.();
      onClose();
      
      // Reset form
      setQuantity("");
      setType("stock_in");
    } catch (error) {
      console.error("Error updating stock:", error);
      alert("Failed to update stock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg">Adjust Stock - {item?.item_name}</DialogTitle>
          <DialogDescription className="text-xs">
            Current Stock: <span className="font-semibold">{item?.current_stock} {item?.unit_of_measure}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs">Transaction Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stock_in" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Plus className="h-3 w-3 text-green-600" />
                    Stock In (Add Stock)
                  </div>
                </SelectItem>
                <SelectItem value="stock_out" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Minus className="h-3 w-3 text-red-600" />
                    Stock Out (Remove Stock)
                  </div>
                </SelectItem>
                <SelectItem value="adjustment" className="text-xs">
                  <div className="flex items-center gap-2">
                    <Edit className="h-3 w-3 text-blue-600" />
                    Adjustment (Correction)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Quantity ({item?.unit_of_measure})</Label>
            <Input
              type="number"
              placeholder="Enter quantity"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              min="0.01"
              step="0.01"
              className="h-8 text-xs"
            />
            {type !== "adjustment" && quantity && (
              <p className="text-xs text-muted-foreground">
                New stock will be:{" "}
                <span className="font-semibold">
                  {type === "stock_out"
                    ? item?.current_stock - parseFloat(quantity)
                    : item?.current_stock + parseFloat(quantity)}{" "}
                  {item?.unit_of_measure}
                </span>
              </p>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              size="sm"
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !quantity} size="sm" className="h-7 text-xs">
              {loading ? "Updating..." : "Update Stock"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * View Item Details Dialog
 */
function ViewItemDetailsDialog({ item, open, onClose }) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-lg">Item Details</DialogTitle>
          <DialogDescription className="text-xs">
            Inventory item information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Item Name</Label>
              <p className="text-sm font-medium">{item.item_name}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Category</Label>
              <p className="text-sm font-medium capitalize">{item.category.replace("_", " ")}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Current Stock</Label>
              <p className="text-sm font-medium">
                {item.current_stock} {item.unit_of_measure}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unit of Measure</Label>
              <p className="text-sm font-medium">{item.unit_of_measure}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Unit Cost</Label>
              <p className="text-sm font-medium">₱{item.unit_cost.toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Minimum Stock (Alert Level)</Label>
              <p className="text-sm font-medium">
                {item.minimum_stock} {item.unit_of_measure}
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Total Value</Label>
              <p className="text-sm font-medium">₱{(item.current_stock * item.unit_cost).toLocaleString()}</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <StatusBadge status={item.status} />
            </div>

            <div className="space-y-1 md:col-span-2">
              <Label className="text-xs text-muted-foreground">Storage Location</Label>
              <p className="text-sm font-medium">{item.location || "Not specified"}</p>
            </div>

            {item.description && (
              <div className="space-y-1 md:col-span-2">
                <Label className="text-xs text-muted-foreground">Description</Label>
                <p className="text-sm">{item.description}</p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={onClose}
            size="sm"
            className="h-7 text-xs"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Edit Item Record Dialog
 */
function EditItemDialog({ item, open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    item_name: "",
    category: "supplies",
    unit_cost: "",
    minimum_stock: "",
    unit_of_measure: "",
    location: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const { updateInventoryItem } = useResourceStore();

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        item_name: item.item_name || "",
        category: item.category || "supplies",
        unit_cost: item.unit_cost || "",
        minimum_stock: item.minimum_stock || "",
        unit_of_measure: item.unit_of_measure || "",
        location: item.location || "",
        description: item.description || "",
      });
    }
  }, [item]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await updateInventoryItem(item.id, formData);
      onSuccess?.();
      onClose();
    } catch (error) {
      console.error("Error updating item:", error);
      alert("Failed to update item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Edit Item Record</DialogTitle>
          <DialogDescription className="text-xs">
            Update inventory item information (stock quantity cannot be changed here)
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Item Name *</Label>
              <Input
                placeholder="e.g., Rice 25kg"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food" className="text-xs">Food & Nutrition</SelectItem>
                  <SelectItem value="medicine" className="text-xs">Medicine & Health</SelectItem>
                  <SelectItem value="supplies" className="text-xs">Supplies</SelectItem>
                  <SelectItem value="equipment" className="text-xs">Equipment</SelectItem>
                  <SelectItem value="material" className="text-xs">Materials</SelectItem>
                  <SelectItem value="other" className="text-xs">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Unit Cost (₱) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                required
                min="0"
                step="0.01"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Unit of Measure *</Label>
              <Input
                placeholder="e.g., sack, box, piece"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Current Stock (Read-only)</Label>
              <Input
                type="number"
                value={item.current_stock}
                disabled
                className="h-8 text-xs bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Use "Adjust Stock" to change quantity
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Minimum Stock (Alert Level) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                required
                min="0"
                step="0.01"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Storage Location</Label>
              <Input
                placeholder="e.g., Warehouse A, Office Storage"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Description (Optional)</Label>
              <Textarea
                placeholder="Additional details about the item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              size="sm"
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} size="sm" className="h-7 text-xs">
              {loading ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Add New Item Dialog
 */
function AddItemDialog({ open, onClose, onSuccess }) {
  const [formData, setFormData] = useState({
    item_name: "",
    category: "supplies",
    current_stock: "",
    unit_cost: "",
    minimum_stock: "",
    unit_of_measure: "",
    location: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const { addInventoryItem } = useResourceStore();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await addInventoryItem(formData);
      onSuccess?.();
      onClose();
      
      // Reset form
      setFormData({
        item_name: "",
        category: "supplies",
        current_stock: "",
        unit_cost: "",
        minimum_stock: "",
        unit_of_measure: "",
        location: "",
        description: "",
      });
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Failed to add item. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-lg">Add New Inventory Item</DialogTitle>
          <DialogDescription className="text-xs">
            Add a new item to the inventory system
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-xs">Item Name *</Label>
              <Input
                placeholder="e.g., Rice 25kg"
                value={formData.item_name}
                onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food" className="text-xs">Food & Nutrition</SelectItem>
                  <SelectItem value="medicine" className="text-xs">Medicine & Health</SelectItem>
                  <SelectItem value="supplies" className="text-xs">Supplies</SelectItem>
                  <SelectItem value="equipment" className="text-xs">Equipment</SelectItem>
                  <SelectItem value="material" className="text-xs">Materials</SelectItem>
                  <SelectItem value="other" className="text-xs">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Unit Cost (₱) *</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={formData.unit_cost}
                onChange={(e) => setFormData({ ...formData, unit_cost: e.target.value })}
                required
                min="0"
                step="0.01"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Unit of Measure *</Label>
              <Input
                placeholder="e.g., sack, box, piece"
                value={formData.unit_of_measure}
                onChange={(e) => setFormData({ ...formData, unit_of_measure: e.target.value })}
                required
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Initial Stock *</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.current_stock}
                onChange={(e) => setFormData({ ...formData, current_stock: e.target.value })}
                required
                min="0"
                step="0.01"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs">Minimum Stock (Alert Level) *</Label>
              <Input
                type="number"
                placeholder="0"
                value={formData.minimum_stock}
                onChange={(e) => setFormData({ ...formData, minimum_stock: e.target.value })}
                required
                min="0"
                step="0.01"
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Storage Location</Label>
              <Input
                placeholder="e.g., Warehouse A, Office Storage"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label className="text-xs">Description (Optional)</Label>
              <Textarea
                placeholder="Additional details about the item..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              size="sm"
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading} size="sm" className="h-7 text-xs">
              {loading ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Main Stock Management Component
 */
export default function StockManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedItem, setSelectedItem] = useState(null);
  const [showAdjustDialog, setShowAdjustDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const {
    inventoryItems,
    inventoryStats,
    fetchInventory,
    loading,
    submitRequest,
    deleteInventoryItem,
  } = useResourceStore();

  const { role } = useAuthStore();

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  const handleRefresh = () => {
    fetchInventory();
  };

  const handleAdjustStock = (item) => {
    setSelectedItem(item);
    setShowAdjustDialog(true);
  };

  const handleEditItem = (item) => {
    setSelectedItem(item);
    setShowEditDialog(true);
  };

  const handleViewDetails = (item) => {
    setSelectedItem(item);
    setShowDetailsDialog(true);
  };

  const handleSuccess = () => {
    fetchInventory();
  };

  const handleDeleteClick = (item) => {
    setSelectedItem(item);
    setShowDeleteDialog(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedItem) return;

    try {
      await deleteInventoryItem(selectedItem.id);
      setShowDeleteDialog(false);
      setSelectedItem(null);
      fetchInventory();
    } catch (error) {
      console.error("Failed to delete item:", error);
      alert("Failed to delete item. Please try again.");
    }
  };

  const handleSubmitRequest = async (requestData) => {
    try {
      await submitRequest(requestData);
      setShowRequestDialog(false);
      fetchInventory();
    } catch (error) {
      console.error("Failed to submit request:", error);
    }
  };

  // Filter items
  const filteredItems = inventoryItems.filter((item) => {
    const matchesSearch =
      item.item_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
    const matchesStatus = statusFilter === "all" || item.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination calculations
  const totalFiltered = filteredItems.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));
  useEffect(() => {
    // Reset to first page if filters change and current page is out of range
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const sliceStart = (page - 1) * rowsPerPage;
  const sliceEnd = sliceStart + rowsPerPage;
  const pageItems = filteredItems.slice(sliceStart, sliceEnd);
  const displayStart = totalFiltered === 0 ? 0 : sliceStart + 1;
  const displayEnd = Math.min(totalFiltered, sliceEnd);

  return (
    <div className="space-y-4">
      {/* Stats Overview */}
      <div className="grid gap-3 md:grid-cols-4">
        <Card>
          <CardContent className="py-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Items</p>
                <p className="text-xl font-bold">{inventoryStats.totalItems}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total Value</p>
                <p className="text-xl font-bold">₱{inventoryStats.totalValue.toLocaleString()}</p>
              </div>
              <Package className="h-8 w-8 text-green-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Low Stock</p>
                <p className="text-xl font-bold text-orange-600">{inventoryStats.lowStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-1">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Critical</p>
                <p className="text-xl font-bold text-red-600">{inventoryStats.criticalStock}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardHeader className="py-1">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base leading-tight">Stock Inventory</CardTitle>
              <CardDescription className="text-xs leading-snug mt-0">Manage and track inventory stock levels</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              {role === "case_manager" ? (
                <Button onClick={() => setShowRequestDialog(true)} size="sm" className="cursor-pointer">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  New Request
                </Button>
              ) : (
                <Button onClick={() => setShowAddDialog(true)} size="sm" className="cursor-pointer">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Item
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={categoryFilter} onValueChange={setCategoryFilter} className="cursor-pointer">
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="food">Food</SelectItem>
                <SelectItem value="medicine">Medicine</SelectItem>
                <SelectItem value="supplies">Supplies</SelectItem>
                <SelectItem value="relief_goods">Relief Goods</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="low_stock">Low Stock</SelectItem>
                <SelectItem value="critical_stock">Critical</SelectItem>
                <SelectItem value="depleted">Depleted</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <div className={`px-4 ${pageItems.length > 5 ? 'overflow-y-auto max-h-[296px]' : ''}`}>
              <Table>
                <TableHeader>
                <TableRow className="text-xs">
                  <TableHead className="text-xs">Item Name</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs text-right">Current Stock</TableHead>
                  <TableHead className="text-xs text-right">Min Stock</TableHead>
                  <TableHead className="text-xs text-right">Unit Cost</TableHead>
                  <TableHead className="text-xs text-right">Total Value</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                      Loading inventory...
                    </TableCell>
                  </TableRow>
                ) : pageItems.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                      No items found
                    </TableCell>
                  </TableRow>
                ) : (
                  pageItems.map((item) => (
                    <TableRow 
                      key={item.id} 
                      className="text-xs cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(item)}
                    >
                      <TableCell className="font-medium text-xs">
                        <div>
                          <p>{item.item_name}</p>
                          {item.location && (
                            <p className="text-[10px] text-muted-foreground">{item.location}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs capitalize">{item.category.replace("_", " ")}</TableCell>
                      <TableCell className="text-right text-xs">
                        <span className={item.current_stock <= item.minimum_stock ? "text-orange-600 font-semibold" : ""}>
                          {item.current_stock} {item.unit_of_measure}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs text-muted-foreground">
                        {item.minimum_stock} {item.unit_of_measure}
                      </TableCell>
                      <TableCell className="text-right text-xs">₱{item.unit_cost.toLocaleString()}</TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        ₱{(item.current_stock * item.unit_cost).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={item.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        {role === "case_manager" ? (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleViewDetails(item);
                            }}
                            className="h-6 px-2 text-xs cursor-pointer"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        ) : (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => e.stopPropagation()}
                                className="h-6 px-2 text-xs cursor-pointer"
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleViewDetails(item);
                                }}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEditItem(item);
                                }}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Record
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleAdjustStock(item);
                                }}
                              >
                                <Package className="mr-2 h-4 w-4" />
                                Adjust Stock
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteClick(item);
                                }}
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Record
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination */}
          <div className="flex items-center justify-between px-2 py-4">
            <div className="flex items-center gap-2">
              <p className="text-sm text-muted-foreground">
                Showing {displayStart} to {displayEnd} of {totalFiltered} item{totalFiltered !== 1 ? 's' : ''}
              </p>
              <Select
                value={rowsPerPage.toString()}
                onValueChange={(value) => {
                  setRowsPerPage(Number(value));
                  setPage(1);
                }}
              >
                <SelectTrigger className="h-8 w-[125px] cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5">5 per page</SelectItem>
                  <SelectItem value="10">10 per page</SelectItem>
                  <SelectItem value="20">20 per page</SelectItem>
                  <SelectItem value="50">50 per page</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="cursor-pointer"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      {selectedItem && (
        <>
          <StockAdjustmentDialog
            item={selectedItem}
            open={showAdjustDialog}
            onClose={() => {
              setShowAdjustDialog(false);
              setSelectedItem(null);
            }}
            onSuccess={handleSuccess}
          />
          
          <EditItemDialog
            item={selectedItem}
            open={showEditDialog}
            onClose={() => {
              setShowEditDialog(false);
              setSelectedItem(null);
            }}
            onSuccess={handleSuccess}
          />
          
          <ViewItemDetailsDialog
            item={selectedItem}
            open={showDetailsDialog}
            onClose={() => {
              setShowDetailsDialog(false);
              setSelectedItem(null);
            }}
          />
        </>
      )}

      <AddItemDialog
        open={showAddDialog}
        onClose={() => setShowAddDialog(false)}
        onSuccess={handleSuccess}
      />

      <RequestSubmissionDialog
        open={showRequestDialog}
        onOpenChange={setShowRequestDialog}
        onSubmit={handleSubmitRequest}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <span className="font-semibold">{selectedItem?.item_name}</span> from the inventory.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedItem(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
