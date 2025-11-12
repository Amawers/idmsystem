/**
 * @file StaffDeploymentManager.jsx
 * @description Manage staff assignments and deployment to programs and home visits
 * @module components/resources/StaffDeploymentManager
 * 
 * Features:
 * - Assign staff to programs or home visits
 * - Track staff workload and availability
 * - Schedule management
 * - Prevent staff overload
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Users, Plus, Calendar, AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import supabase from "@/../config/supabase";

function StaffAvailabilityCard({ staff }) {
  const getAvailabilityColor = (status) => {
    const colors = {
      available: "bg-green-500",
      partially_available: "bg-yellow-500",
      busy: "bg-orange-500",
      unavailable: "bg-red-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const getAvailabilityLabel = (status) => {
    const labels = {
      available: "Available",
      partially_available: "Partial",
      busy: "Busy",
      unavailable: "Unavailable",
    };
    return labels[status] || "Unknown";
  };

  return (
    <div className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={`w-3 h-3 rounded-full ${getAvailabilityColor(staff.availability_status)}`} />
        <div>
          <p className="font-medium">{staff.staff_name}</p>
          <p className="text-xs text-muted-foreground">{staff.staff_role}</p>
        </div>
      </div>
      <div className="text-right">
        <Badge variant={staff.workload_percentage >= 80 ? "destructive" : "secondary"}>
          {staff.workload_percentage}% Load
        </Badge>
        <p className="text-xs text-muted-foreground mt-1">
          {staff.active_assignments || 0} assignments
        </p>
      </div>
    </div>
  );
}

export default function StaffDeploymentManager() {
  const [staffList, setStaffList] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    busy: 0,
    overloaded: 0,
  });

  useEffect(() => {
    fetchStaffAssignments();
  }, []);

  const fetchStaffAssignments = async () => {
    setLoading(true);
    try {
      const { data: assignmentsData, error } = await supabase
        .from('staff_assignments')
        .select(`
          *,
          staff:staff_id (
            id,
            email,
            full_name
          )
        `)
        .eq('status', 'active')
        .order('start_date', { ascending: false });

      if (error) throw error;

      setAssignments(assignmentsData || []);

      // Calculate staff statistics
      const staffMap = {};
      assignmentsData?.forEach(assignment => {
        const staffId = assignment.staff_id;
        if (!staffMap[staffId]) {
          staffMap[staffId] = {
            staff_id: staffId,
            staff_name: assignment.staff_name,
            staff_role: assignment.staff_role,
            availability_status: assignment.availability_status,
            workload_percentage: assignment.workload_percentage,
            active_assignments: 0,
          };
        }
        staffMap[staffId].active_assignments++;
      });

      const staffArray = Object.values(staffMap);
      setStaffList(staffArray);

      setStats({
        total: staffArray.length,
        available: staffArray.filter(s => s.availability_status === 'available').length,
        busy: staffArray.filter(s => s.availability_status === 'busy').length,
        overloaded: staffArray.filter(s => s.workload_percentage >= 80).length,
      });
    } catch (error) {
      console.error('Error fetching staff assignments:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Refresh Button */}
      <div className="flex justify-end">
        <Button 
          onClick={fetchStaffAssignments} 
          disabled={loading}
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Active members</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <p className="text-xs text-muted-foreground">Ready for deployment</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Busy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.busy}</div>
            <p className="text-xs text-muted-foreground">Currently assigned</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Overloaded</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.overloaded}</div>
            <p className="text-xs text-muted-foreground">≥80% workload</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Staff Availability */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Staff Availability</CardTitle>
                <CardDescription>Current availability status</CardDescription>
              </div>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Assign Staff
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : staffList.length > 0 ? (
              staffList.map((staff) => (
                <StaffAvailabilityCard key={staff.staff_id} staff={staff} />
              ))
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No staff assignments found
              </p>
            )}
          </CardContent>
        </Card>

        {/* Active Assignments */}
        <Card>
          <CardHeader>
            <CardTitle>Active Assignments</CardTitle>
            <CardDescription>Current staff deployments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assignments.slice(0, 5).map((assignment) => (
                <div key={assignment.id} className="p-3 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-medium text-sm">{assignment.assignment_title}</p>
                      <p className="text-xs text-muted-foreground">{assignment.staff_name}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {assignment.assignment_type}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(assignment.start_date).toLocaleDateString()}
                    </span>
                    <Badge variant={assignment.workload_percentage >= 80 ? "destructive" : "secondary"}>
                      {assignment.workload_percentage}%
                    </Badge>
                  </div>
                </div>
              ))}
              {assignments.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No active assignments
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Workload Warning */}
      {stats.overloaded > 0 && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-orange-600" />
              <CardTitle className="text-orange-900">Workload Alert</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-orange-800">
              {stats.overloaded} staff member{stats.overloaded !== 1 ? 's are' : ' is'} currently overloaded 
              with ≥80% workload. Consider redistributing assignments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
