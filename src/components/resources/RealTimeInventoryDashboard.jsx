/**
 * @file RealTimeInventoryDashboard.jsx
 * @description Real-time resource inventory dashboard with funds, staff, and supplies tracking
 * @module components/resources/RealTimeInventoryDashboard
 * 
 * Features:
 * - Real-time inventory overview (funds, staff, supplies)
 * - Auto-updates as resources are used or replenished
 * - Visual indicators for stock levels
 * - Quick action buttons
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DollarSign,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useResourceStore } from "@/store/useResourceStore";
import { usePrograms } from "@/hooks/usePrograms";

/**
 * Metric Card Component
 */
function MetricCard({ title, value, subtitle, icon: Icon, trend, trendValue, color = "blue", status }) {
  const colorClasses = {
    blue: "text-blue-600 bg-blue-50",
    green: "text-green-600 bg-green-50",
    orange: "text-orange-600 bg-orange-50",
    red: "text-red-600 bg-red-50",
    purple: "text-purple-600 bg-purple-50",
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pt-4 px-4">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`p-2 rounded-full ${colorClasses[color]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent className="pb-4 px-4">
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
            {trend === 'up' ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
            <span>{trendValue}</span>
          </div>
        )}
        {status && (
          <Badge variant={status.variant} className="mt-2 text-xs py-0.5 h-5">
            {status.label}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Budget Overview Component
 */
function BudgetOverview({ programs, loading }) {
  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded"></div>;
  }

  const totalBudget = programs.reduce((sum, p) => sum + (p.budget_allocated || 0), 0);
  const totalSpent = programs.reduce((sum, p) => sum + (p.budget_spent || 0), 0);
  const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const remaining = totalBudget - totalSpent;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Budget Overview</CardTitle>
        <CardDescription className="text-xs">Cash on hand and program budgets</CardDescription>
      </CardHeader>
      <CardContent className="pb-3">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Left Column: Budget Summary */}
          <div className="space-y-3">
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Total Budget</p>
                <p className="text-lg font-bold">₱{totalBudget.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Spent</p>
                <p className="text-lg font-bold text-red-600">₱{totalSpent.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground">Remaining</p>
                <p className="text-lg font-bold text-green-600">₱{remaining.toLocaleString()}</p>
              </div>
            </div>
            
            <div className="space-y-1 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span>Utilization Rate</span>
                <span className="font-medium">{utilizationRate.toFixed(1)}%</span>
              </div>
              <Progress value={utilizationRate} className="h-2" />
            </div>
          </div>

          {/* Right Column: Budget by Program */}
          <div className="space-y-2 md:border-l md:pl-4">
            <h4 className="text-xs font-semibold">Budget by Program</h4>
            <div className="space-y-2">
              {programs.slice(0, 5).map((program) => {
                const programUtilization = program.budget_allocated > 0 
                  ? (program.budget_spent / program.budget_allocated) * 100 
                  : 0;
                
                return (
                  <div key={program.id} className="space-y-0.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="truncate flex-1">{program.program_name}</span>
                      <span className="font-medium ml-2 text-[11px]">
                        ₱{program.budget_spent.toLocaleString()} / ₱{program.budget_allocated.toLocaleString()}
                      </span>
                    </div>
                    <Progress value={programUtilization} className="h-1.5" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Staff Availability Component
 */
function StaffAvailability({ assignments, loading }) {
  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded"></div>;
  }

  // Group staff by availability status
  const available = assignments.filter(a => a.availability_status === 'available').length;
  const partiallyAvailable = assignments.filter(a => a.availability_status === 'partially_available').length;
  const busy = assignments.filter(a => a.availability_status === 'busy').length;
  const unavailable = assignments.filter(a => a.availability_status === 'unavailable').length;
  const total = assignments.length;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Staff Availability</CardTitle>
        <CardDescription className="text-xs">Current staff deployment and availability</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        <div className="grid gap-2 md:grid-cols-2">
          <div className="flex items-center gap-2 p-2 bg-green-50 rounded-lg">
            <CheckCircle className="h-7 w-7 text-green-600" />
            <div>
              <p className="text-lg font-bold">{available}</p>
              <p className="text-[11px] text-muted-foreground">Available</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2 p-2 bg-orange-50 rounded-lg">
            <Clock className="h-7 w-7 text-orange-600" />
            <div>
              <p className="text-lg font-bold">{busy}</p>
              <p className="text-[11px] text-muted-foreground">Busy</p>
            </div>
          </div>
        </div>

        <div className="space-y-2 pt-3 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              Available
            </span>
            <span className="font-medium">{available}/{total}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              Partially Available
            </span>
            <span className="font-medium">{partiallyAvailable}/{total}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
              Busy
            </span>
            <span className="font-medium">{busy}/{total}</span>
          </div>
          
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              Unavailable
            </span>
            <span className="font-medium">{unavailable}/{total}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Supplies Inventory Component
 */
function SuppliesInventory({ inventoryItems, loading }) {
  if (loading) {
    return <div className="animate-pulse h-40 bg-gray-100 rounded"></div>;
  }

  const categories = {
    food: { label: "Food", icon: Package, count: 0, value: 0, low: 0 },
    medicine: { label: "Medicine", icon: Package, count: 0, value: 0, low: 0 },
    supplies: { label: "Supplies", icon: Package, count: 0, value: 0, low: 0 },
    relief_goods: { label: "Relief Goods", icon: Package, count: 0, value: 0, low: 0 },
  };

  inventoryItems.forEach(item => {
    if (categories[item.category]) {
      categories[item.category].count++;
      categories[item.category].value += item.total_value || 0;
      if (item.status === 'low_stock' || item.status === 'critical_stock') {
        categories[item.category].low++;
      }
    }
  });

  const lowStockCount = inventoryItems.filter(
    item => item.status === 'low_stock' || item.status === 'critical_stock'
  ).length;

  return (
    <Card>
      <CardHeader className="py-3">
        <CardTitle className="text-sm">Supplies Inventory</CardTitle>
        <CardDescription className="text-xs">Rice, medicine, forms, relief goods</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pb-3">
        {lowStockCount > 0 && (
          <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded-lg">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <div className="flex-1">
              <p className="text-xs font-medium text-orange-900">
                {lowStockCount} item{lowStockCount !== 1 ? 's' : ''} running low
              </p>
              <p className="text-[11px] text-orange-700">Action required</p>
            </div>
          </div>
        )}

        <div className="grid gap-2 max-h-[140px] overflow-y-auto pr-1">
          {Object.entries(categories).map(([key, cat]) => (
            <div key={key} className="flex items-center justify-between p-2 border rounded-lg">
              <div className="flex items-center gap-2">
                <cat.icon className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium">{cat.label}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {cat.count} items • ₱{cat.value.toLocaleString()}
                  </p>
                </div>
              </div>
              {cat.low > 0 && (
                <Badge variant="destructive" className="text-[11px] py-0 h-4">
                  {cat.low} low
                </Badge>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Main Real-Time Inventory Dashboard
 */
export default function RealTimeInventoryDashboard() {
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  const {
    inventoryItems,
    inventoryStats,
    fetchInventory,
    loading: inventoryLoading,
  } = useResourceStore();

  const { programs, loading: programsLoading } = usePrograms();

  // Mock staff assignments - in production, this would come from the store
  const [staffAssignments] = useState([
    { id: 1, availability_status: 'available' },
    { id: 2, availability_status: 'busy' },
    { id: 3, availability_status: 'available' },
    { id: 4, availability_status: 'partially_available' },
  ]);

  useEffect(() => {
    fetchInventory();
  }, [fetchInventory]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchInventory();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, fetchInventory]);

  const handleRefresh = () => {
    fetchInventory();
    setLastUpdate(new Date());
  };

  const loading = inventoryLoading || programsLoading;

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Inventory Value"
          value={`₱${(inventoryStats.totalValue || 0).toLocaleString()}`}
          subtitle={`${inventoryStats.totalItems || 0} items tracked`}
          icon={Package}
          color="blue"
        />
        
        <MetricCard
          title="Available Items"
          value={inventoryStats.available || 0}
          subtitle={`${inventoryStats.totalItems || 0} total items`}
          icon={CheckCircle}
          color="green"
          status={{
            variant: inventoryStats.available > 0 ? "success" : "destructive",
            label: inventoryStats.available > 0 ? "In Stock" : "No Stock"
          }}
        />
        
        <MetricCard
          title="Low Stock Alerts"
          value={inventoryStats.lowStock || 0}
          subtitle={`${inventoryStats.criticalStock || 0} critical`}
          icon={AlertTriangle}
          color="orange"
          status={
            inventoryStats.lowStock > 0
              ? { variant: "destructive", label: "Action Required" }
              : { variant: "success", label: "All Good" }
          }
        />
        
        <MetricCard
          title="Staff Available"
          value={`${staffAssignments.filter(s => s.availability_status === 'available').length}/${staffAssignments.length}`}
          subtitle="Ready for deployment"
          icon={Users}
          color="purple"
        />
      </div>

      {/* Main Dashboard Sections */}
      <div className="grid gap-4 md:grid-cols-3">
        <BudgetOverview programs={programs} loading={loading} />
        <StaffAvailability assignments={staffAssignments} loading={loading} />
        <SuppliesInventory inventoryItems={inventoryItems} loading={loading} />
      </div>
    </div>
  );
}
