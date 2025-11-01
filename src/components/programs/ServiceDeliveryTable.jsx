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

import { useState } from "react";
import { useServiceDelivery } from "@/hooks/useServiceDelivery";
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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Search, 
  MoreHorizontal, 
  Calendar,
  CheckCircle2,
  XCircle,
  Download,
  Plus,
} from "lucide-react";

/**
 * Service Delivery Table Component
 * @returns {JSX.Element} Service delivery table
 */
export default function ServiceDeliveryTable() {
  const [searchTerm, setSearchTerm] = useState("");
  const [programFilter, setProgramFilter] = useState("all");
  const [attendanceFilter, setAttendanceFilter] = useState("all");

  const filterOptions = {
    programId: programFilter !== "all" ? programFilter : undefined,
  };

  const { 
    serviceDeliveries = [], 
    loading, 
    statistics = {},
    programs = [], // List of programs for filter
  } = useServiceDelivery(filterOptions);

  // Filter by search term and attendance
  const filteredDeliveries = serviceDeliveries.filter((delivery) => {
    const matchesSearch =
      delivery.beneficiary_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      delivery.program_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesAttendance =
      attendanceFilter === "all" ||
      (attendanceFilter === "present" && delivery.attendance) ||
      (attendanceFilter === "absent" && !delivery.attendance);

    return matchesSearch && matchesAttendance;
  });

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
            <div className="text-2xl font-bold">{statistics.totalSessions || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {(statistics.attendanceRate || 0).toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {statistics.totalPresent || 0} of {statistics.totalSessions || 0} attended
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Unique Beneficiaries</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.uniqueBeneficiaries || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Served this month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{statistics.activePrograms || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Delivering services
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Table Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Service Delivery Log</CardTitle>
              <CardDescription>
                Track service sessions and attendance records
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                Log Session
              </Button>
            </div>
          </div>
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
              <SelectTrigger className="w-[200px]">
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Attendance" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="present">Present</SelectItem>
                <SelectItem value="absent">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Beneficiary</TableHead>
                  <TableHead>Program</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Delivered By</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Progress Notes</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeliveries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground">
                      No service delivery records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeliveries.map((delivery) => (
                    <TableRow key={delivery.id}>
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
                        <Badge variant="secondary">{delivery.service_type}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{delivery.delivered_by_name}</div>
                      </TableCell>
                      <TableCell>
                        {delivery.attendance ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm">Present</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-red-600">
                            <XCircle className="h-4 w-4" />
                            <span className="text-sm">Absent</span>
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-[250px] truncate text-sm text-muted-foreground">
                          {delivery.progress_notes || "No notes"}
                        </div>
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
                            <DropdownMenuItem>Edit Log</DropdownMenuItem>
                            <DropdownMenuItem>View Case</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600">
                              Delete Log
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

          {/* Footer */}
          <div className="flex items-center justify-between mt-4">
            <div className="text-sm text-muted-foreground">
              Showing {filteredDeliveries.length} of {serviceDeliveries.length} records
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
