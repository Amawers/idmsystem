/**
 * @file DynamicDashboard.jsx
 * @description Main dynamic dashboard component that adapts to different management contexts
 * @module components/dashboard/DynamicDashboard
 * 
 * @overview
 * This component provides a comprehensive dashboard that:
 * - Adapts to different management sub-pages (Case, User, Program, etc.)
 * - Displays real-time metrics and KPIs
 * - Shows interactive charts and visualizations
 * - Supports filtering and date range selection
 * - Automatically refreshes data
 * 
 * @usage
 * ```jsx
 * <DynamicDashboard type="case" />
 * <DynamicDashboard type="user" />
 * ```
 */

import { useDashboard } from "@/hooks/useDashboard";
import { DynamicMetricCard, MetricCardGrid } from "./DynamicMetricCard";
import { TimeTrendChart, StatusDistributionChart, PriorityChart, WorkloadChart } from "./DashboardCharts";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  FolderOpen, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Users,
  UserCheck,
  UserX,
  ShieldAlert,
  RefreshCw,
  Filter,
  X,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

/**
 * Case Management Dashboard
 */
function CaseDashboard({ filters }) {
  const { 
    data, 
    loading, 
    error, 
    refresh,
    refreshFromServer,
    syncing,
    syncStatus,
    fromCache,
    isOnline,
  } = useDashboard('case', filters);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const stats = data?.stats || {};
  const trends = data?.trends || {};
  const timeTrends = data?.timeTrends || [];

  return (
    <div className="flex flex-col gap-2">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-base font-bold tracking-tight">Case Management Dashboard</h2>
          <p className="text-muted-foreground text-[11px]">Overview of all case activities and metrics</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Offline Badge */}
          {!isOnline && (
            <Badge variant="destructive" className="h-7 text-xs">
              Offline
            </Badge>
          )}
          
          {/* Cache Indicator */}
          {fromCache && isOnline && (
            <Badge variant="secondary" className="h-7 text-xs">
              Cached
            </Badge>
          )}
          
          {/* Sync Button */}
          <Button
            variant="outline"
            size="sm"
            onClick={refreshFromServer}
            disabled={loading || syncing || !isOnline}
            className="gap-2 h-7 text-xs cursor-pointer"
          >
            <RefreshCw className={cn("h-3 w-3", (loading || syncing) && "animate-spin")} />
            {syncing ? "Syncing..." : "Refresh"}
          </Button>
        </div>
      </div>

      {/* Sync Status Message */}
      {syncStatus && (
        <div className="px-4 lg:px-6">
          <Alert className="py-2 border-l-4" variant={fromCache ? "default" : "default"}>
            <AlertDescription className="text-xs">
              {syncStatus}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Row 1: Metric Cards (Left) + Case Trends Chart (Right) */}
      <div className="grid grid-cols-1 gap-2 px-4 lg:px-6 @3xl/main:grid-cols-2">
        {/* Left: All 4 Metric Cards Compressed */}
        <div className="grid grid-cols-2 gap-1.5">
          <DynamicMetricCard
            title="Total Cases"
            value={stats.total || 0}
            icon={FileText}
            iconColor="text-blue-600"
            trend={trends.total}
            description={
              trends.total?.direction === 'up' 
                ? "Increased" 
                : trends.total?.direction === 'down'
                ? "Decreased"
                : "Stable"
            }
            footer="All types"
            loading={loading}
          />

          <DynamicMetricCard
            title="Active Cases"
            value={stats.active || 0}
            icon={FolderOpen}
            iconColor="text-amber-600"
            trend={trends.active}
            description={
              trends.active?.direction === 'up'
                ? "More opened"
                : trends.active?.direction === 'down'
                ? "Fewer opened"
                : "Stable"
            }
            footer="In-progress"
            loading={loading}
          />

          <DynamicMetricCard
            title="Closed Cases"
            value={stats.closed || 0}
            icon={CheckCircle}
            iconColor="text-green-600"
            trend={trends.closed}
            description={
              trends.closed?.direction === 'up'
                ? "More resolved"
                : trends.closed?.direction === 'down'
                ? "Fewer closed"
                : "Stable"
            }
            footer="Resolved"
            loading={loading}
          />

          <DynamicMetricCard
            title="High Priority"
            value={stats.highPriority || 0}
            icon={AlertTriangle}
            iconColor="text-red-600"
            trend={trends.highPriority}
            inverseTrend={true}
            description={
              trends.highPriority?.direction === 'down'
                ? "Reduced"
                : trends.highPriority?.direction === 'up'
                ? "Increased"
                : "Stable"
            }
            footer="Urgent"
            loading={loading}
          />
        </div>

        {/* Right: Case Trends Chart */}
        <TimeTrendChart
          data={timeTrends}
          loading={loading}
          title="Case Trends"
          description="Daily case submissions over time"
        />
      </div>

      {/* Row 2: Remaining Charts */}
      <div className="grid grid-cols-1 gap-2 px-4 lg:px-6 @xl/main:grid-cols-3">
        {/* Case Manager Workload */}
        <WorkloadChart
          data={stats.managerWorkload}
          loading={loading}
        />

        {/* Status Distribution */}
        <StatusDistributionChart
          data={stats.statusDistribution}
          loading={loading}
        />

        {/* Priority Distribution */}
        <PriorityChart
          data={stats.priorityDistribution}
          loading={loading}
        />
      </div>
    </div>
  );
}

/**
 * User Management Dashboard
 */
function UserDashboard({ filters, onFilterToggle, filterCount }) {
  const { data, loading, error, refresh } = useDashboard('user', filters);

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Error Loading Dashboard</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const stats = data?.stats || {};

  return (
    <div className="flex flex-col gap-3">
      {/* Header with title and action buttons */}
      <div className="flex items-center justify-between px-4 lg:px-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight">User Management Dashboard</h2>
          <p className="text-muted-foreground text-xs">Account statistics and user activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onFilterToggle}
            className="gap-2 h-8 text-xs"
          >
            <Filter className="h-3.5 w-3.5" />
            Filters
            {filterCount > 0 && (
              <Badge variant="secondary" className="ml-1 rounded-full px-1.5 text-[10px]">
                {filterCount}
              </Badge>
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={refresh}
            disabled={loading}
            className="gap-2 h-8 text-xs"
          >
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <MetricCardGrid>
        <DynamicMetricCard
          title="Total Users"
          value={stats.total || 0}
          icon={Users}
          iconColor="text-blue-600"
          description="All registered accounts"
          footer="Case managers and heads"
          loading={loading}
        />

        <DynamicMetricCard
          title="Active Users"
          value={stats.active || 0}
          icon={UserCheck}
          iconColor="text-green-600"
          description="Currently active accounts"
          footer="Can access the system"
          loading={loading}
        />

        <DynamicMetricCard
          title="Inactive Users"
          value={stats.inactive || 0}
          icon={UserX}
          iconColor="text-amber-600"
          description="Temporarily disabled"
          footer="Cannot log in"
          loading={loading}
        />

        <DynamicMetricCard
          title="Banned Users"
          value={stats.banned || 0}
          icon={ShieldAlert}
          iconColor="text-red-600"
          description="Permanently suspended"
          footer="Account violations"
          loading={loading}
        />
      </MetricCardGrid>

      {/* Role Distribution */}
      <div className="grid grid-cols-1 gap-3 px-4 lg:px-6 @xl/main:grid-cols-2">
        <MetricCardGrid className="grid-cols-2">
          <DynamicMetricCard
            title="Case Managers"
            value={stats.caseManagers || 0}
            icon={Users}
            iconColor="text-purple-600"
            description="Standard access level"
            loading={loading}
          />
          <DynamicMetricCard
            title="Heads"
            value={stats.heads || 0}
            icon={ShieldAlert}
            iconColor="text-orange-600"
            description="Administrative access"
            loading={loading}
          />
        </MetricCardGrid>
      </div>
    </div>
  );
}

/**
 * Generic/Placeholder Dashboard
 */
function GenericDashboard({ type }) {
  return (
    <div className="flex flex-col gap-3 px-4 lg:px-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight capitalize">{type} Dashboard</h2>
        <p className="text-muted-foreground text-xs">Dashboard coming soon</p>
      </div>
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle className="text-sm">Under Development</AlertTitle>
        <AlertDescription className="text-xs">
          The {type} dashboard is currently under development. Check back soon for analytics and insights.
        </AlertDescription>
      </Alert>
    </div>
  );
}

/**
 * Main Dynamic Dashboard Component
 * @param {Object} props
 * @param {string} props.type - Dashboard type ('case', 'user', 'program', etc.)
 * @param {Object} props.filters - Optional filters
 * @param {Function} props.onFilterToggle - Callback to toggle filter panel
 * @param {number} props.filterCount - Number of active filters
 * @param {string} props.className - Additional CSS classes
 */
export default function DynamicDashboard({ type = 'case', filters = {}, onFilterToggle, filterCount = 0, className }) {
  // Render appropriate dashboard based on type
  const renderDashboard = () => {
    switch (type) {
      case 'case':
        return <CaseDashboard filters={filters} onFilterToggle={onFilterToggle} filterCount={filterCount} />;
      case 'user':
        return <UserDashboard filters={filters} onFilterToggle={onFilterToggle} filterCount={filterCount} />;
      case 'program':
      case 'resource':
      case 'controls':
        return <GenericDashboard type={type} />;
      default:
        return <CaseDashboard filters={filters} onFilterToggle={onFilterToggle} filterCount={filterCount} />;
    }
  };
  return (
    <div className={cn("flex flex-col gap-4", className)}>
      {renderDashboard()}
    </div>
  );
}
