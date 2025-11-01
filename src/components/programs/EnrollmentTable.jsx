/**
 * @file EnrollmentTable.jsx
 * @description Program enrollment tracking table
 * @module components/programs/EnrollmentTable
 * 
 * Features:
 * - View all program enrollments
 * - Filter by status, program, case type
 * - Track attendance and progress
 * - View enrollment details
 */

import { useState } from "react";
import { useEnrollments } from "@/hooks/useEnrollments";
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
import { Search, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const statusColors = {
  active: "bg-green-500",
  completed: "bg-blue-500",
  dropped: "bg-red-500",
};

const progressColors = {
  excellent: "text-green-600",
  good: "text-blue-600",
  fair: "text-yellow-600",
  poor: "text-red-600",
};

/**
 * Enrollment Table Component
 * @returns {JSX.Element} Enrollment table
 */
export default function EnrollmentTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filterOptions = {
    status: statusFilter !== "all" ? statusFilter : undefined,
  };

  const { enrollments, loading, statistics = {} } = useEnrollments(filterOptions);

  const filteredEnrollments = (enrollments || []).filter(
    (enrollment) =>
      enrollment.case_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enrollment.program_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
        <CardHeader>
          <CardTitle>Program Enrollments</CardTitle>
          <CardDescription>Track case enrollment and progress</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex items-center gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by case or program name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="dropped">Dropped</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Case Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Enrollment Date</TableHead>
                  <TableHead>Progress</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No enrollments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEnrollments.map((enrollment) => {
                    const progressPercentage =
                      (enrollment.sessions_completed / enrollment.sessions_total) * 100;

                    return (
                      <TableRow key={enrollment.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{enrollment.case_name}</div>
                            <div className="text-xs text-muted-foreground">
                              ID: {enrollment.case_id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{enrollment.case_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-[200px]">
                            <div className="text-sm">{enrollment.program_name}</div>
                            <div className="text-xs text-muted-foreground">
                              {enrollment.case_worker}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {new Date(enrollment.enrollment_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className={progressColors[enrollment.progress_level]}>
                                {enrollment.progress_level}
                              </span>
                              <span className="text-muted-foreground">
                                {enrollment.sessions_completed}/{enrollment.sessions_total}
                              </span>
                            </div>
                            <Progress value={progressPercentage} className="h-1.5" />
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{enrollment.attendance_rate}%</div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[enrollment.status]}>
                            {enrollment.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem>View Details</DropdownMenuItem>
                              <DropdownMenuItem>View Service Logs</DropdownMenuItem>
                              <DropdownMenuItem>Update Progress</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                Mark as Dropped
                              </DropdownMenuItem>
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

          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredEnrollments.length} of {enrollments.length} enrollments
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
