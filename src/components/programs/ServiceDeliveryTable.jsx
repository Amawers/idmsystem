/**
 * @file ServiceDeliveryTable.jsx
 * @description Service delivery tracking and logging component
 * @module components/programs/ServiceDeliveryTable
 * 
 * Features:
 * - Track service delivery sessions
 * - Log attendance and progress notes
 * - Filter by program and date range
 * - View delivery statistics
 * - Export service logs
 */

import { useState, useEffect, useRef } from "react";
import { useServiceDelivery } from "@/hooks/useServiceDelivery";
import { usePrograms } from "@/hooks/usePrograms";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import CreateServiceDeliveryDialog from "./CreateServiceDeliveryDialog";
import UpdateServiceDeliveryDialog from "./UpdateServiceDeliveryDialog";
import ViewServiceDeliveryDialog from "./ViewServiceDeliveryDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  Plus,
  Clock,
  MinusCircle,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import PermissionGuard from "@/components/PermissionGuard";
import { Alert, AlertDescription } from "@/components/ui/alert";

/**
 * Service Delivery Table Component
 * @param {Object} props - Component props
 * @param {boolean} [props.autoSync=false] - Trigger a sync when component mounts (used after reconnect reloads)
 * @param {Function} [props.onAutoSyncHandled] - Callback to clear the auto sync flag once handled
 * @returns {JSX.Element} Service delivery table
 */
export default function ServiceDeliveryTable({ autoSync = false, onAutoSyncHandled }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedService, setSelectedService] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(3);

  const filterOptions = {
    programId: programFilter !== "all" ? programFilter : undefined,
  };

  const { 
    services = [], 
    loading, 
    statistics = {},
    createServiceDelivery,
    updateServiceDelivery,
    deleteServiceDelivery,
    fetchServiceDelivery,
    pendingCount,
    runSync,
    syncing,
    syncStatus,
    offline,
  } = useServiceDelivery(filterOptions);

  const isOnline = useNetworkStatus();
  const { programs = [] } = usePrograms({ status: "active" });
  const runSyncRef = useRef(runSync);

  useEffect(() => {
    runSyncRef.current = runSync;
  }, [runSync]);

  useEffect(() => {
    if (!autoSync) return;

    let cancelled = false;

    const syncAfterReload = async () => {
      if (!isOnline) {
        onAutoSyncHandled?.();
        return;
      }
      try {
        await runSyncRef.current?.();
      } catch (err) {
        console.error("Automatic service delivery sync failed:", err);
        toast.error(err?.message || "Automatic sync failed");
      } finally {
        if (!cancelled) {
          onAutoSyncHandled?.();
        }
      }
    };

    syncAfterReload();

    return () => {
      cancelled = true;
    };
  }, [autoSync, isOnline, onAutoSyncHandled]);

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    try {
      setIsRefreshing(true);
      if (typeof window !== "undefined") {
        sessionStorage.setItem("serviceDelivery.forceSync", "true");
        window.location.reload();
        return;
      }

      await fetchServiceDelivery();
      toast.success("Service delivery list refreshed");
    } catch (error) {
      console.error("Error refreshing:", error);
      toast.error("Failed to refresh");
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle view service details
   * @param {Object} service - Service delivery record
   */
  const handleView = (service) => {
    setSelectedService(service);
    setViewDialogOpen(true);
  };

  /**
   * Handle edit service
   * @param {Object} service - Service delivery record
   */
  const handleEdit = (service) => {
    setSelectedService(service);
    setUpdateDialogOpen(true);
  };

  /**
   * Handle delete confirmation
   * @param {Object} service - Service delivery record
   */
  const handleDeleteConfirm = (service) => {
    setServiceToDelete(service);
    setDeleteDialogOpen(true);
  };

  /**
   * Handle delete service
   */
  const handleDelete = async () => {
    if (!serviceToDelete) return;

    try {
      await deleteServiceDelivery(serviceToDelete.id);
      toast.success("Service delivery deleted successfully");
      setDeleteDialogOpen(false);
      setServiceToDelete(null);
    } catch (error) {
      console.error("Error deleting service delivery:", error);
      toast.error(error.message || "Failed to delete service delivery");
    }
  };

  const handleSync = async () => {
    if (!runSync) return;
    if (!isOnline) {
      toast.error("Cannot sync while offline");
      return;
    }
    try {
      await runSync();
    } catch (error) {
      console.error("Service delivery sync failed:", error);
      toast.error(error?.message || "Sync failed");
    }
  };

  // Filter by search term and attendance
  const filteredDeliveries = services.filter((delivery) => {
    const matchesSearch =
      delivery.beneficiary_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.program_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.case_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAttendance =
      attendanceFilter === "all" ||
      (attendanceFilter === "present" && delivery.attendance_status === "present") ||
      (attendanceFilter === "absent" && delivery.attendance_status === "absent") ||
      (attendanceFilter === "excused" && delivery.attendance_status === "excused");

    return matchesSearch && matchesAttendance;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredDeliveries.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedDeliveries = filteredDeliveries.slice(startIndex, endIndex);

  // Reset to page 1 when filters or items per page change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, programFilter, attendanceFilter, itemsPerPage]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Logged services
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statistics.present || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics.total > 0 
                ? ((statistics.present / statistics.total) * 100).toFixed(1)
                : 0}% attendance rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(statistics.averageDuration || 0)} min
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Per session
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Beneficiaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.uniqueBeneficiaries || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Unique cases served
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <CardTitle>Service Delivery Log</CardTitle>
                <CardDescription>
                  Track service sessions and attendance records
                </CardDescription>
              </div>
              {!isOnline && (
                <Badge variant="destructive" className="h-6">
                  Offline
                </Badge>
              )}
              {offline && isOnline && (
                <Badge variant="secondary" className="h-6">
                  Showing cached data
                </Badge>
              )}
              {pendingCount > 0 && (
                <Badge variant="outline" className="h-6 border-amber-500 text-amber-700">
                  {pendingCount} pending
                </Badge>
              )}
            </div>
            <div className="flex gap-2 items-center">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="cursor-pointer"
              >
                <RefreshCw className={cn("mr-2 h-4 w-4", isRefreshing && "animate-spin")} />
                Refresh
              </Button>
              {/* Offline sync controls */}
              <PermissionGuard permission="manage_service_delivery">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSync}
                  disabled={!isOnline || syncing || pendingCount === 0}
                >
                  <RefreshCw className={cn("mr-2 h-4 w-4", syncing && "animate-spin")} />
                  Sync
                </Button>
              </PermissionGuard>
              <PermissionGuard permission="create_service_delivery">
                <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Log Session
                </Button>
              </PermissionGuard>
            </div>
          </div>
          {syncStatus && (
            <Alert className="mt-3">
              <AlertDescription className="text-xs">
                {syncStatus}
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by beneficiary or program..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-[200px] cursor-pointer">
                <SelectValue placeholder="Filter by program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Programs</SelectItem>
                {programs.map((program) => (
                  <SelectItem key={program.id} value={program.id}>
                    {program.program_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={attendanceFilter} onValueChange={setAttendanceFilter}>
              <SelectTrigger className="w-[150px] cursor-pointer">
                <SelectValue placeholder="Attendance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
                <SelectItem value="excused">Excused</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            {/* When more than 3 rows, constrain height so a vertical scrollbar appears */}
            <div className={`${filteredDeliveries.length > 3 ? 'overflow-y-auto max-h-[232px]' : ''}`}>
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Delivered By</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {paginatedDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      {filteredDeliveries.length === 0 
                        ? "No service delivery records found"
                        : "No records on this page"}
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedDeliveries.map((delivery, index) => {
                    const rowKey = delivery.id ?? delivery.localId ?? `local-${index}`;
                    return (
                      <TableRow
                        key={rowKey}
                        className={cn(delivery.hasPendingWrites && "bg-amber-50/70")}
                        data-pending={delivery.hasPendingWrites ? "true" : undefined}
                      >
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {new Date(delivery.service_date).toLocaleDateString()}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{delivery.beneficiary_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {delivery.case_number}
                          </div>
                          {delivery.hasPendingWrites && (
                            <Badge variant="outline" className="mt-1 text-[10px] uppercase tracking-wide text-amber-700 border-amber-500">
                              Pending sync
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="text-sm">{delivery.program_name}</div>
                          <Badge variant="outline" className="mt-1 text-xs">
                            {delivery.program_type}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{delivery.delivered_by_name}</div>
                      </TableCell>
                      <TableCell>
                        {delivery.attendance_status === "present" ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Present</span>
                          </div>
                        ) : delivery.attendance_status === "excused" ? (
                          <div className="flex items-center gap-1 text-yellow-600">
                            <MinusCircle className="h-4 w-4" />
                            <span className="text-sm">Excused</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Absent</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="h-6 px-2 text-xs cursor-pointer">
                              <Edit className="h-3 w-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => handleView(delivery)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <PermissionGuard permission="edit_service_delivery">
                              <DropdownMenuItem onClick={() => handleEdit(delivery)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Log
                              </DropdownMenuItem>
                            </PermissionGuard>
                            <DropdownMenuSeparator />
                            <PermissionGuard permission="delete_service_delivery">
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => handleDeleteConfirm(delivery)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Log
                              </DropdownMenuItem>
                            </PermissionGuard>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            </div>
          </div>

          {/* Footer with Pagination */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mt-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Rows per page:</span>
              <Select
                value={itemsPerPage.toString()}
                onValueChange={(value) => setItemsPerPage(Number(value))}
              >
                <SelectTrigger className="h-8 w-[70px] cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-sm text-muted-foreground">
                Showing {filteredDeliveries.length > 0 ? startIndex + 1 : 0}-{Math.min(endIndex, filteredDeliveries.length)} of {filteredDeliveries.length}
                {filteredDeliveries.length !== services.length && ` (filtered from ${services.length} total)`}
              </span>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                disabled={currentPage === 1 || filteredDeliveries.length === 0}
                className="cursor-pointer"
              >
                Previous
              </Button>
              <div className="text-sm text-muted-foreground min-w-[100px] text-center">
                Page {filteredDeliveries.length > 0 ? currentPage : 0} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages || filteredDeliveries.length === 0}
                className="cursor-pointer"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Create Service Delivery Dialog */}
      <CreateServiceDeliveryDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onCreate={createServiceDelivery}
      />

      {/* View Service Delivery Dialog */}
      <ViewServiceDeliveryDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        serviceDelivery={selectedService}
      />

      {/* Update Service Delivery Dialog */}
      <UpdateServiceDeliveryDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        serviceDelivery={selectedService}
        onUpdate={updateServiceDelivery}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service Delivery Log</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this service delivery log? This action
              cannot be undone and will affect enrollment statistics.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
