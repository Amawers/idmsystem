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

import { useState } from "react";
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
import { MoreHorizontal, Search, Filter, RefreshCw, Eye, Edit, Trash2, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import ProgramDetailsDialog from "./ProgramDetailsDialog";
import CreateProgramDialog from "./CreateProgramDialog";

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
  const [programToDelete, setProgramToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();

  const filterOptions = {
    status: statusFilter !== "all" ? statusFilter : undefined,
    programType: typeFilter !== "all" ? typeFilter : undefined,
  };

  const { programs, loading, fetchPrograms, deleteProgram } = usePrograms(filterOptions);

  // Filter programs by search term
  const filteredPrograms = (programs || []).filter((program) =>
    program.program_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
      await deleteProgram(programToDelete.id);
      toast.success("Program Deleted", {
        description: `${programToDelete.program_name} has been deleted successfully`,
      });
      setDeleteDialogOpen(false);
      setProgramToDelete(null);
    } catch (error) {
      console.error("Error deleting program:", error);
      toast.error("Error", {
        description: "Failed to delete program. Please try again.",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleViewEnrollments = (program) => {
    // Navigate to enrollments page with program filter
    navigate(`/enrollments?program=${program.id}`);
  };

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
        {/* Filters */}
        <div className="flex items-center gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search programs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
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

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[200px]">
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
            onClick={() => fetchPrograms()}
            disabled={loading}
            title="Refresh programs"
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
              {filteredPrograms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No programs found
                  </TableCell>
                </TableRow>
              ) : (
                filteredPrograms.map((program) => (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{program.program_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {program.coordinator}
                        </div>
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
                        ₱{(program.budget_spent / 1000).toFixed(0)}K / ₱{(program.budget_allocated / 1000).toFixed(0)}K
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {((program.budget_spent / program.budget_allocated) * 100).toFixed(0)}% used
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="text-sm font-medium">{program.success_rate}%</div>
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
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => handleViewDetails(program)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEdit(program)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Program
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleViewEnrollments(program)}>
                            <Users className="mr-2 h-4 w-4" />
                            View Enrollments
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => handleDeleteClick(program)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete Program
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination info */}
        <div className="flex items-center justify-between mt-4">
          <div className="text-sm text-muted-foreground">
            Showing {filteredPrograms.length} of {programs.length} programs
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
