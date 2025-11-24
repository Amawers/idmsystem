/**
 * @file StaffDeploymentManager.jsx
 * @description Manage staff assignments and deployment to programs and home visits
 * @module components/resources/StaffDeploymentManager
 * 
 * Features:
 * - Assign staff to programs or home visits
 * - Track staff workload and availability based on REAL case data
 * - Display case breakdown by type (VAC, CICL/CAR, FAC, FAR, IVAC)
 * - Schedule management
 * - Prevent staff overload
 * 
 * Data Source:
 * - Derives workload from Case Management > Cases, CICL/CAR, and IVAC sections
 * - Uses useCaseWorkload hook to aggregate data from all case tables
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { AlertCircle, RefreshCw, WifiOff } from "lucide-react";
import { useCaseWorkload } from "@/hooks/useCaseWorkload";

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
    <div className="flex items-start justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-start gap-3 flex-1">
        <div className={`w-3 h-3 rounded-full mt-1 ${getAvailabilityColor(staff.availability_status)}`} />
        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <p className="font-medium">{staff.staff_name}</p>
            <Badge variant={staff.workload_percentage >= 80 ? "destructive" : "secondary"}>
              {staff.workload_percentage}% Load
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-2">{staff.staff_role}</p>
          
          {/* Case Breakdown */}
          <div className="grid grid-cols-5 gap-1 text-xs">
            <div className="flex flex-col items-center p-1 bg-blue-50 rounded">
              <span className="font-semibold text-blue-700">{staff.breakdown?.vac || 0}</span>
              <span className="text-[10px] text-blue-600">VAC</span>
            </div>
            <div className="flex flex-col items-center p-1 bg-purple-50 rounded">
              <span className="font-semibold text-purple-700">{staff.breakdown?.ciclcar || 0}</span>
              <span className="text-[10px] text-purple-600">CICL/CAR</span>
            </div>
            <div className="flex flex-col items-center p-1 bg-green-50 rounded">
              <span className="font-semibold text-green-700">{staff.breakdown?.fac || 0}</span>
              <span className="text-[10px] text-green-600">FAC</span>
            </div>
            <div className="flex flex-col items-center p-1 bg-orange-50 rounded">
              <span className="font-semibold text-orange-700">{staff.breakdown?.far || 0}</span>
              <span className="text-[10px] text-orange-600">FAR</span>
            </div>
            <div className="flex flex-col items-center p-1 bg-red-50 rounded">
              <span className="font-semibold text-red-700">{staff.breakdown?.ivac || 0}</span>
              <span className="text-[10px] text-red-600">IVAC</span>
            </div>
          </div>
          
          {/* Totals */}
          <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
            <span>Total: {staff.total_cases || 0} cases</span>
            {staff.active_cases > 0 && (
              <span className="text-green-600">• {staff.active_cases} active</span>
            )}
            {staff.urgent_cases > 0 && (
              <span className="text-red-600">• {staff.urgent_cases} urgent</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StaffDeploymentManager() {
  // Use the case workload hook to get real data from Case Management
  const { 
    data: caseWorkloadData, 
    loading: workloadLoading, 
    error: workloadError,
    reload: reloadWorkload,
    offline: workloadOffline,
    lastSyncedDisplay,
    syncStatus,
  } = useCaseWorkload();

  const [staffList, setStaffList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    available: 0,
    busy: 0,
    overloaded: 0,
    totalCases: 0,
    activeCases: 0,
    urgentCases: 0,
  });

  // Update staff list when case workload data changes
  useEffect(() => {
    if (caseWorkloadData && caseWorkloadData.length > 0) {
      setStaffList(caseWorkloadData);
      
      // Calculate statistics
      const totalCases = caseWorkloadData.reduce((sum, staff) => sum + staff.total_cases, 0);
      const activeCases = caseWorkloadData.reduce((sum, staff) => sum + staff.active_cases, 0);
      const urgentCases = caseWorkloadData.reduce((sum, staff) => sum + staff.urgent_cases, 0);
      
      setStats({
        total: caseWorkloadData.length,
        available: caseWorkloadData.filter(s => s.availability_status === 'available').length,
        busy: caseWorkloadData.filter(s => s.availability_status === 'busy').length,
        overloaded: caseWorkloadData.filter(s => s.workload_percentage >= 80).length,
        totalCases,
        activeCases,
        urgentCases,
      });
    }
  }, [caseWorkloadData]);

  const handleRefresh = () => {
    reloadWorkload();
  };

  return (
    <div className="space-y-4">
      {/* Sync + Status */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {workloadOffline && (
            <Badge variant="secondary" className="text-[10px] font-semibold uppercase">
              <WifiOff className="mr-1 h-3 w-3" /> Offline Mode
            </Badge>
          )}
          {syncStatus && <span className="text-[11px] text-muted-foreground">{syncStatus}</span>}
          {lastSyncedDisplay && (
            <span className="text-[11px]">Last synced {lastSyncedDisplay}</span>
          )}
        </div>
        <Button 
          onClick={handleRefresh} 
          disabled={workloadLoading}
          variant="outline"
          size="sm"
          className="cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${workloadLoading ? 'animate-spin' : ''}`} />
          Refresh Data
        </Button>
      </div>

      {/* Error Display */}
      {workloadError && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">Error Loading Case Data</p>
                <p className="text-xs text-red-700 mt-1">
                  Failed to load case workload data. Please try refreshing.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">Case Managers</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cases</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCases}</div>
            <p className="text-xs text-muted-foreground">
              {stats.activeCases} active • {stats.urgentCases} urgent
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Available Staff</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
            <p className="text-xs text-muted-foreground">&lt;40% workload</p>
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
            <CardTitle>Staff Workload (from Case Management)</CardTitle>
            <CardDescription>Real-time case assignments by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className={staffList.length > 2 ? 'overflow-y-scroll max-h-[400px] space-y-3 pr-2' : 'space-y-3'}>
              {workloadLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : staffList.length > 0 ? (
                staffList.map((staff, index) => (
                  <StaffAvailabilityCard key={`${staff.case_manager}-${index}`} staff={staff} />
                ))
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No case managers found with active cases
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Case Distribution by Type */}
        <Card>
          <CardHeader>
            <CardTitle>Case Distribution by Type</CardTitle>
            <CardDescription>Total cases across all types</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* VAC Cases */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span className="text-sm font-medium">VAC</span>
                  </div>
                  <span className="text-sm font-bold text-blue-700">
                    {staffList.reduce((sum, staff) => sum + (staff.breakdown?.vac || 0), 0)}
                  </span>
                </div>
                <Progress 
                  value={(staffList.reduce((sum, staff) => sum + (staff.breakdown?.vac || 0), 0) / stats.totalCases * 100) || 0} 
                  className="h-2 bg-blue-100"
                />
              </div>

              {/* CICL/CAR Cases */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                    <span className="text-sm font-medium">CICL/CAR</span>
                  </div>
                  <span className="text-sm font-bold text-purple-700">
                    {staffList.reduce((sum, staff) => sum + (staff.breakdown?.ciclcar || 0), 0)}
                  </span>
                </div>
                <Progress 
                  value={(staffList.reduce((sum, staff) => sum + (staff.breakdown?.ciclcar || 0), 0) / stats.totalCases * 100) || 0} 
                  className="h-2 bg-purple-100"
                />
              </div>

              {/* FAC Cases */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span className="text-sm font-medium">FAC</span>
                  </div>
                  <span className="text-sm font-bold text-green-700">
                    {staffList.reduce((sum, staff) => sum + (staff.breakdown?.fac || 0), 0)}
                  </span>
                </div>
                <Progress 
                  value={(staffList.reduce((sum, staff) => sum + (staff.breakdown?.fac || 0), 0) / stats.totalCases * 100) || 0} 
                  className="h-2 bg-green-100"
                />
              </div>

              {/* FAR Cases */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span className="text-sm font-medium">FAR</span>
                  </div>
                  <span className="text-sm font-bold text-orange-700">
                    {staffList.reduce((sum, staff) => sum + (staff.breakdown?.far || 0), 0)}
                  </span>
                </div>
                <Progress 
                  value={(staffList.reduce((sum, staff) => sum + (staff.breakdown?.far || 0), 0) / stats.totalCases * 100) || 0} 
                  className="h-2 bg-orange-100"
                />
              </div>

              {/* IVAC Cases */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span className="text-sm font-medium">IVAC</span>
                  </div>
                  <span className="text-sm font-bold text-red-700">
                    {staffList.reduce((sum, staff) => sum + (staff.breakdown?.ivac || 0), 0)}
                  </span>
                </div>
                <Progress 
                  value={(staffList.reduce((sum, staff) => sum + (staff.breakdown?.ivac || 0), 0) / stats.totalCases * 100) || 0} 
                  className="h-2 bg-red-100"
                />
              </div>

              {/* Summary */}
              <div className="pt-4 border-t">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total Cases</span>
                  <span className="text-lg font-bold">{stats.totalCases}</span>
                </div>
              </div>
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
              with ≥80% workload. Consider redistributing case assignments.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
