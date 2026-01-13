/**
 * @file EnrollmentTable.jsx
 * @description Program enrollment tracking table with full CRUD operations
 * @module components/programs/EnrollmentTable
 * 
 * Features:
 * - View all program enrollments with real-time updates
 * - Filter by status, program, case type
 * - Track attendance and progress metrics
 * - Create, update, and delete enrollments
 * - Export enrollment data
 * - Integrated with Supabase backend
 */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useEnrollments } from "@/hooks/useEnrollments";
import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import CreateEnrollmentDialog from "./CreateEnrollmentDialog";
import UpdateEnrollmentDialog from "./UpdateEnrollmentDialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, MoreHorizontal, Plus, Trash2, Edit, AlertCircle, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import PermissionGuard from "@/components/PermissionGuard";
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

const statusColors = {
  active: "bg-green-500",
  completed: "bg-blue-500",
  dropped: "bg-red-500",
  at_risk: "bg-yellow-500",
};

const progressColors = {
  excellent: "text-green-600",
  good: "text-blue-600",
  fair: "text-yellow-600",
  poor: "text-red-600",
};

/**
 * Enrollment Table Component
 * @returns {JSX.Element} Enrollment table with full CRUD operations
 */
export default function EnrollmentTable() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [caseTypeFilter, setCaseTypeFilter] = useState("all");
  const [programFilter, setProgramFilter] = useState("all");
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedEnrollment, setSelectedEnrollment] = useState(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Network status
  const isOnline = useNetworkStatus();

  // Read URL query parameters on mount
  useEffect(() => {
    const programIdParam = searchParams.get('programId');
    const programNameParam = searchParams.get('programName');
    
    if (programIdParam) {
      setProgramFilter(programIdParam);
    }
    
    // Display info message if filtering by program
    if (programNameParam) {
      console.log(`Filtering enrollments for program: ${programNameParam}`);
    }
  }, [searchParams]);

  const filterOptions = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    caseType: caseTypeFilter !== "all" ? caseTypeFilter : undefined,
    programId: programFilter !== "all" ? programFilter : undefined,
  };

  const { 
    enrollments, 
    loading, 
    error, 
    deleteEnrollment, 
    fetchEnrollments,
    pendingCount,
    syncing,
    syncStatus,
    runSync,
  } = useEnrollments(filterOptions);

  const filteredEnrollments = (enrollments || []).filter(
    (enrollment) => {
      const searchLower = searchTerm.toLowerCase();
      const beneficiaryName = enrollment.beneficiary_name?.toLowerCase() || '';
      const programName = enrollment.program?.program_name?.toLowerCase() || '';
      const caseNumber = enrollment.case_number?.toLowerCase() || '';
      
      return (
        beneficiaryName.includes(searchLower) ||
        programName.includes(searchLower) ||
        caseNumber.includes(searchLower)
      );
    }
  );

  // Pagination calculations
  const totalFiltered = filteredEnrollments.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / rowsPerPage));
  useEffect(() => {
    // Reset to first page if filters or rows-per-page change and current page is out of range
    if (page > totalPages) setPage(1);
  }, [page, totalPages]);

  const sliceStart = (page - 1) * rowsPerPage;
  const sliceEnd = sliceStart + rowsPerPage;
  const pageEnrollments = filteredEnrollments.slice(sliceStart, sliceEnd);
  const displayStart = totalFiltered === 0 ? 0 : sliceStart + 1;
  const displayEnd = Math.min(totalFiltered, sliceEnd);

  /**
   * Handle enrollment update
   */
  const handleUpdate = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setUpdateDialogOpen(true);
  };

  /**
   * Handle enrollment deletion
   */
  const handleDeleteClick = (enrollment) => {
    setSelectedEnrollment(enrollment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!selectedEnrollment) return;

    try {
      await deleteEnrollment(selectedEnrollment.id);
      setDeleteDialogOpen(false);
      setSelectedEnrollment(null);
    } catch (err) {
      console.error('Error deleting enrollment:', err);
      alert('Failed to delete enrollment. Please try again.');
    }
  };

  /**
   * Handle refresh
   */
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchEnrollments();
    } catch (error) {
      console.error("Error refreshing enrollments:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  /**
   * Handle manual sync
   */
  const handleSync = async () => {
    if (!isOnline || syncing || pendingCount === 0) return;
    await runSync();
  };

  /**
   * Handle success callbacks
   */
  const handleSuccess = () => {
    fetchEnrollments();
  };

  /**
   * Clear program filter and URL params
   */
  const handleClearProgramFilter = () => {
    setProgramFilter("all");
    searchParams.delete('programId');
    searchParams.delete('programName');
    setSearchParams(searchParams);
  };

  // Get the program name from URL or enrollments data
  const getFilteredProgramName = () => {
    const programName = searchParams.get('programName');
    if (programName) return programName;
    
    // Fallback: try to find from enrollments
    if (programFilter !== "all" && enrollments.length > 0) {
      const enrollment = enrollments.find(e => e.program_id === programFilter);
      return enrollment?.program?.program_name || 'Unknown Program';
    }
    
    return null;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <p>Error loading enrollments: {error}</p>
          </div>
          <Button onClick={fetchEnrollments} className="mt-4">
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Calculate statistics from filtered data
  const statistics = {
    total: enrollments.length,
    active: enrollments.filter((e) => e.status === "active").length,
    completed: enrollments.filter((e) => e.status === "completed").length,
    dropped: enrollments.filter((e) => e.status === "dropped").length,
    atRisk: enrollments.filter((e) => e.status === "at_risk").length,
    averageAttendance:
      enrollments.length > 0
        ? enrollments.reduce((sum, e) => sum + (parseFloat(e.attendance_rate) || 0), 0) / enrollments.length
        : 0,
  };

  return (
    <div className="space-y-4">
      {/* Statistics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{statistics.active || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{statistics.completed || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(statistics.averageAttendance || 0).toFixed(1)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="py-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <CardTitle className="text-base leading-tight">Program Enrollments</CardTitle>
                <CardDescription className="text-xs leading-snug mt-0">Track case enrollment and progress in programs</CardDescription>
              </div>
              {/* Offline Badge */}
              {!isOnline && (
                <Badge variant="destructive" className="h-6">
                  Offline
                </Badge>
              )}
              {/* Pending Changes Badge */}
              {isOnline && pendingCount > 0 && (
                <Badge variant="outline" className="h-6 border-amber-500 text-amber-700">
                  {pendingCount} Pending
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button 
                size="sm" 
                variant="outline"
                onClick={handleRefresh}
                disabled={isRefreshing || loading}
                className="cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {/* Sync Button */}
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={!isOnline || syncing || pendingCount === 0}
                className="cursor-pointer"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                Sync ({pendingCount})
              </Button>
              <PermissionGuard permission="create_enrollment">
                <Button onClick={() => setCreateDialogOpen(true)} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  New Enrollment
                </Button>
              </PermissionGuard>
            </div>
          </div>
          {/* Sync Status Message */}
          {syncStatus && (
            <div className="mt-2">
              <Alert className={syncing ? "border-blue-500" : pendingCount > 0 ? "border-amber-500" : "border-green-500"}>
                <AlertDescription className="text-xs">
                  {syncStatus}
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {/* Program Filter Badge - Show when filtering by program */}
          {programFilter !== "all" && getFilteredProgramName() && (
            <div className="mb-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="default" className="text-sm">
                  Filtered by Program
                </Badge>
                <span className="text-sm font-medium">{getFilteredProgramName()}</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearProgramFilter}
                className="h-7 text-xs"
              >
                Clear Filter
              </Button>
            </div>
          )}
          
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by beneficiary, program, or case number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={caseTypeFilter} onValueChange={setCaseTypeFilter}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Filter by case type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Case Types</SelectItem>
                <SelectItem value="CICL/CAR">CICL/CAR</SelectItem>
                <SelectItem value="VAC">VAC</SelectItem>
                <SelectItem value="FAC">FAC</SelectItem>
                <SelectItem value="FAR">FAR</SelectItem>
                <SelectItem value="IVAC">IVAC</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px] cursor-pointer">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
                <SelectItem value="at_risk">At Risk</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            {/* When more than 3 rows, constrain height so a vertical scrollbar appears */}
            <div className={`${filteredEnrollments.length > 3 ? 'overflow-y-auto max-h-[232px]' : ''}`}>
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead>Beneficiary</TableHead>
                    <TableHead>Case Type</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead>Enrollment Date</TableHead>
                    <TableHead>Progress</TableHead>
                    <TableHead>Attendance</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {pageEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  pageEnrollments.map((enrollment) => {
                    const progressPercentage = parseFloat(enrollment.progress_percentage) || 0;

                    return (
                      <TableRow key={enrollment.id} className="h-16">
                        <TableCell className="font-medium">
                          <div>
                            <div>{enrollment.beneficiary_name}</div>
                            <div className="text-xs text-muted-foreground">
                              #{enrollment.case_number}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{enrollment.case_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <div className="text-sm">{enrollment.program?.program_name || 'N/A'}</div>
                            <div className="text-xs text-muted-foreground">
                              {enrollment.case_worker || 'Unassigned'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(enrollment.enrollment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={progressColors[enrollment.progress_level] || "text-gray-600"}>
                                {enrollment.progress_level || 'N/A'}
                              </span>
                              <span className="text-muted-foreground">
                                {enrollment.sessions_completed || 0}/{enrollment.sessions_total || 0}
                              </span>
                            </div>
                            <Progress value={progressPercentage} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">
                            {parseFloat(enrollment.attendance_rate || 0).toFixed(1)}%
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {enrollment.sessions_attended || 0} attended
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[enrollment.status]}>
                            {enrollment.status}
                          </Badge>
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
                              <PermissionGuard permission="edit_enrollment">
                                <DropdownMenuItem onClick={() => handleUpdate(enrollment)}>
                                  <Edit className="mr-2 h-4 w-4" />
                                  Update Progress
                                </DropdownMenuItem>
                              </PermissionGuard>
                              <DropdownMenuSeparator />
                              <PermissionGuard permission="delete_enrollment">
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteClick(enrollment)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete Enrollment
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

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows per page:</span>
              <Select value={String(rowsPerPage)} onValueChange={(v) => { setRowsPerPage(parseInt(v, 10)); setPage(1); }}>
                <SelectTrigger className="w-[80px] h-8 cursor-pointer">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="20">20</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-muted-foreground">
              {totalFiltered > 0
                ? `Showing ${displayStart}–${displayEnd} of ${totalFiltered} (total ${enrollments.length})`
                : `Showing 0 of 0 (total ${enrollments.length})`}
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
      </Card>

      {/* Dialogs */}
      <CreateEnrollmentDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={handleSuccess}
      />

      <UpdateEnrollmentDialog
        open={updateDialogOpen}
        onOpenChange={setUpdateDialogOpen}
        enrollment={selectedEnrollment}
        onSuccess={handleSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the enrollment for{" "}
              <strong>{selectedEnrollment?.beneficiary_name}</strong> from{" "}
              <strong>{selectedEnrollment?.program?.program_name}</strong>.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
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
