/**
 * @file ProgramCatalog.jsx
 * @description Program catalog table with filtering, search, and CRUD operations
 * @module components/programs/ProgramCatalog
 * 
 * Features:
 * - Sortable and filterable program table
 * - Search by program name
 * - Filter by status, type, beneficiary
 * - Edit and delete programs
 * - View program details
 */

import { useState, useEffect, useRef } from "react";
import { usePrograms } from "@/hooks/usePrograms";
import { useNavigate } from "react-router-dom";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { MoreHorizontal, Search, Filter, RefreshCw, Eye, Edit, Trash2, Users, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ProgramDetailsDialog from "./ProgramDetailsDialog";
import CreateProgramDialog from "./CreateProgramDialog";
import ViewEnrollmentsDialog from "./ViewEnrollmentsDialog";
import PermissionGuard from "@/components/PermissionGuard";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import {
  PROGRAM_FORCE_SYNC_KEY,
  PROGRAM_DEFERRED_RELOAD_KEY,
  scheduleProgramSyncReload,
  markProgramReloadOnReconnect,
  forceProgramTabReload,
} from "./programSyncUtils";
import { loadRemoteSnapshotIntoCache as primeEnrollmentCache } from "@/services/enrollmentOfflineService";

const statusColors = {
  active: "bg-green-500",
  inactive: "bg-gray-500",
  completed: "bg-blue-500",
};

const programTypeLabels = {
  counseling: "Counseling",
  legal: "Legal Aid",
  medical: "Medical",
  educational: "Educational",
  financial: "Financial",
  prevention: "Prevention",
  livelihood: "Livelihood",
  shelter: "Shelter",
  recreational: "Recreational",
};

/**
 * Program Catalog Component
 * @returns {JSX.Element} Program catalog table
 */
export default function ProgramCatalog() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [enrollmentsDialogOpen, setEnrollmentsDialogOpen] = useState(false);
  const [programToDelete, setProgramToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  const navigate = useNavigate();

  const filterOptions = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    programType: typeFilter !== "all" ? typeFilter : undefined,
  };

  const {
    programs,
    loading,
    fetchPrograms,
    deleteProgram,
    pendingCount,
    syncing,
    syncStatus,
    runSync,
    offline,
  } = usePrograms(filterOptions);
  const isOnline = useNetworkStatus();
  
  useEffect(() => {
    console.log("[ProgramCatalog] network/debug", {
      isOnline,
      offline,
      pendingCount,
      syncing,
      syncStatus,
    });
  }, [isOnline, offline, pendingCount, syncing, syncStatus]);
  const autoSyncRef = useRef(false);
  const enrollmentPrefetchRef = useRef(false);

  // Filter programs by search term
  const filteredPrograms = (programs || []).filter((program) =>
    program.program_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Pagination calculations
  const totalFiltered = filteredPrograms.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));
  
  useEffect(() => {
    // Reset to first page if filters or rows-per-page change and current page is out of range
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const sliceStart = (page - 1) * rowsPerPage;
  const sliceEnd = sliceStart + rowsPerPage;
  const paginatedPrograms = filteredPrograms.slice(sliceStart, sliceEnd);
  const displayStart = totalFiltered === 0 ? 0 : sliceStart + 1;
  const displayEnd = Math.min(totalFiltered, sliceEnd);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setPage(1);
  };

  // Action handlers
  const handleViewDetails = (program) => {
    setSelectedProgram(program);
    setDetailsDialogOpen(true);
  };

  const handleEdit = (program) => {
    setSelectedProgram(program);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (program) => {
    setProgramToDelete(program);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!programToDelete) return;

    setIsDeleting(true);
    try {
      const result = await deleteProgram(programToDelete.id, {
        localId: programToDelete.localId,
      });
      if (result?.success) {
        toast.success(result.queued ? "Deletion Queued" : "Program Deleted", {
          description: result.queued
            ? `${programToDelete.program_name} will be removed once the app syncs online.`
            : `${programToDelete.program_name} has been deleted successfully`,
        });
        setDeleteDialogOpen(false);
        setProgramToDelete(null);
        if (!result.queued && isOnline) {
          scheduleProgramSyncReload("programs");
          return;
        }
        markProgramReloadOnReconnect();
        await fetchPrograms();
      } else {
        throw new Error("Failed to delete program");
      }
    } catch (error) {
      console.error("Error deleting program:", error);
      toast.error("Error", {
        description: "Failed to delete program. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleProgramSuccess = async () => {
    // Refresh programs list after create/update
    await fetchPrograms();
  };

  const handleViewEnrollments = (program) => {
    // Navigate to enrollments page with program filter
    navigate(`/program/enrollments?programId=${program.id}&programName=${encodeURIComponent(program.program_name)}`);
  };

  const handleViewEnrollmentsDialog = (program) => {
    // Open enrollments dialog for inline viewing
    setSelectedProgram(program);
    setEnrollmentsDialogOpen(true);
  };

  useEffect(() => {
    if (!isOnline) {
      autoSyncRef.current = false;
      return;
    }
    if (pendingCount === 0) {
      autoSyncRef.current = false;
      return;
    }
    if (!syncing && !autoSyncRef.current) {
      autoSyncRef.current = true;
      runSync().catch(() => {
        autoSyncRef.current = false;
      });
    }
  }, [isOnline, pendingCount, syncing, runSync]);

  useEffect(() => {
    if (!isOnline) return;
    if (enrollmentPrefetchRef.current) return;
    enrollmentPrefetchRef.current = true;
    primeEnrollmentCache().catch((err) => {
      console.error("Failed to prefetch enrollments:", err);
      enrollmentPrefetchRef.current = false;
    });
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    if (typeof window === "undefined") return;
    const shouldReload = window.sessionStorage.getItem(PROGRAM_DEFERRED_RELOAD_KEY) === "true";
    if (shouldReload) {
      window.sessionStorage.removeItem(PROGRAM_DEFERRED_RELOAD_KEY);
      scheduleProgramSyncReload("programs");
    }
  }, [isOnline]);

  useEffect(() => {
    if (!isOnline) return;
    if (typeof window === "undefined") return;
    const shouldSync = window.sessionStorage.getItem(PROGRAM_FORCE_SYNC_KEY) === "true";
    if (shouldSync) {
      window.sessionStorage.removeItem(PROGRAM_FORCE_SYNC_KEY);
      runSync().catch(() => {
        // sync will surface errors via status badge/toast
      });
    }
  }, [isOnline, runSync]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Catalog</CardTitle>
        <CardDescription>
          Manage all intervention programs and services
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(!isOnline || offline || pendingCount > 0 || syncing || syncStatus) && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <Badge variant={isOnline ? "outline" : "destructive"}>
              {isOnline ? "Online" : "Offline"}
            </Badge>
            {offline && (
              <span className="text-sm text-muted-foreground">
                Showing cached data{isOnline ? " — refresh to sync" : ""}.
              </span>
            )}
            {pendingCount > 0 && (
              <span className="text-sm text-muted-foreground">
                {pendingCount} pending change{pendingCount === 1 ? "" : "s"} waiting for sync
              </span>
            )}
            {syncStatus && (
              <span className="text-sm text-muted-foreground">{syncStatus}</span>
            )}
            {(pendingCount > 0 || syncing) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => runSync().catch(() => {})}
                disabled={!isOnline || syncing || pendingCount === 0}
                className="cursor-pointer"
              >
                {syncing ? (
                  <>
                    <span className="mr-2 h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Syncing…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Sync Changes
                  </>
                )}
              </Button>
            )}
          </div>
        )}
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={handleFilterChange(setStatusFilter)}>
            <SelectTrigger className="w-[180px] cursor-pointer">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={typeFilter} onValueChange={handleFilterChange(setTypeFilter)}>
            <SelectTrigger className="w-[200px] cursor-pointer">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(programTypeLabels).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={() => forceProgramTabReload("programs")}
            disabled={loading}
            title="Refresh programs"
            className="cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Table */}
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Target Beneficiary</TableHead>
                <TableHead>Enrollment</TableHead>
                <TableHead>Budget</TableHead>
                <TableHead>Success Rate</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedPrograms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No programs found
                  </TableCell>
                </TableRow>
              ) : (
                paginatedPrograms.map((program) => {
                  // Ensure budget values are numbers
                  const budgetAllocated = parseFloat(program.budget_allocated) || 0;
                  const budgetSpent = parseFloat(program.budget_spent) || 0;
                  const rowKey = program.id ?? `local-${program.localId ?? program.program_name}`;
                  return (
                    <TableRow key={rowKey}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{program.program_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {program.coordinator}
                        </div>
                        {program.hasPendingWrites && (
                          <div className="text-xs text-amber-600">Pending sync</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {programTypeLabels[program.program_type] || program.program_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {program.target_beneficiary.map((beneficiary) => (
                          <Badge key={beneficiary} variant="secondary" className="text-xs">
                            {beneficiary}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {program.current_enrollment}/{program.capacity}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((program.current_enrollment / program.capacity) * 100).toFixed(0)}% capacity
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        ₱{(budgetSpent / 1000).toFixed(1)}K / ₱{(budgetAllocated / 1000).toFixed(1)}K
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {budgetAllocated > 0 
                          ? ((budgetSpent / budgetAllocated) * 100).toFixed(0) 
                          : '0'}% used
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">
                          {program.success_rate !== undefined && program.success_rate !== null 
                            ? `${program.success_rate}%` 
                            : '0%'}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusColors[program.status]}>
                        {program.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-6 px-2 text-xs cursor-pointer"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(program)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <PermissionGuard permission="edit_program">
                            <DropdownMenuItem onClick={() => handleEdit(program)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Program
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <DropdownMenuItem onClick={() => handleViewEnrollmentsDialog(program)}>
                            <Users className="mr-2 h-4 w-4" />
                            View Enrollments
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <PermissionGuard permission="delete_program">
                            <DropdownMenuItem 
                              className="text-red-600"
                              onClick={() => handleDeleteClick(program)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete Program
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

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Rows per page:</span>
            <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(parseInt(v, 10)); setPage(1); }}>
              <SelectTrigger className="w-[80px] h-8 cursor-pointer">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground">
            {totalFiltered > 0
              ? `Showing ${displayStart}–${displayEnd} of ${totalFiltered} (total ${programs.length})`
              : `Showing 0 of 0 (total ${programs.length})`}
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="cursor-pointer"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="cursor-pointer"
            >
              Next
              <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      </CardContent>

      {/* Program Details Dialog */}
      <ProgramDetailsDialog
        program={selectedProgram}
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        onEdit={handleEdit}
        onDelete={handleDeleteClick}
      />

      {/* Edit Program Dialog */}
      <CreateProgramDialog
        program={selectedProgram}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onSuccess={handleProgramSuccess}
      />

      {/* View Enrollments Dialog */}
      <ViewEnrollmentsDialog
        program={selectedProgram}
        open={enrollmentsDialogOpen}
        onOpenChange={setEnrollmentsDialogOpen}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the program{" "}
              <span className="font-semibold">{programToDelete?.program_name}</span>.
              This action cannot be undone and will also remove all associated enrollments
              and service delivery records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Deleting...
                </>
              ) : (
                "Delete Program"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
