/**
 * @file DashboardCharts.jsx
 * @description Interactive chart components for dashboard analytics
 * @module components/dashboard/DashboardCharts
 * 
 * @overview
 * Provides multiple chart types:
 * - TimeTrendChart: Line/area chart for time-based trends
 * - StatusDistributionChart: Pie/donut chart for status breakdown
 * - PriorityChart: Bar chart for priority distribution
 * - WorkloadChart: Bar chart for case manager workload
 * 
 * All charts use real data and support interactivity
 */

import { useState, useMemo } from "react";
import { Area, AreaChart, Bar, BarChart, Pie, PieChart, Cell, CartesianGrid, XAxis, YAxis, Legend, ResponsiveContainer } from "recharts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardAction } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";

/**
 * Time Trend Chart - Shows cases over time
 */
export function TimeTrendChart({ data, loading, title = "Case Trends", description = "Cases over time" }) {
  const isMobile = useIsMobile();
  const [timeRange, setTimeRange] = useState("30d");

  // Filter data based on time range
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    
    let daysToShow = 30;
    if (timeRange === "7d") daysToShow = 7;
    if (timeRange === "90d") daysToShow = 90;
    
    return data.slice(-daysToShow);
  }, [data, timeRange]);

  const chartConfig = {
    count: {
      label: "Cases",
      color: "var(--primary)",
    },
  };

  if (loading) {
    return (
      <Card className="@container/card">
        <CardHeader className="pb-1 pt-2 px-4">
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription className="text-[11px]">{description}</CardDescription>
        </CardHeader>
        <CardContent className="pt-1 px-3">
          <Skeleton className="h-[120px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="@container/card">
      <CardHeader className="pb-1 pt-2 px-4">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-[11px]">{description}</CardDescription>
        <CardAction>
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={setTimeRange}
            variant="outline"
            className="hidden *:data-[slot=toggle-group-item]:!px-1.5 *:data-[slot=toggle-group-item]:text-[11px] *:data-[slot=toggle-group-item]:h-6 @[767px]/card:flex"
          >
            <ToggleGroupItem value="90d">90d</ToggleGroupItem>
            <ToggleGroupItem value="30d">30d</ToggleGroupItem>
            <ToggleGroupItem value="7d">7d</ToggleGroupItem>
          </ToggleGroup>
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="flex w-20 text-[11px] h-6 @[767px]/card:hidden" size="sm">
              <SelectValue placeholder="30d" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="90d" className="rounded-lg text-[11px]">90d</SelectItem>
              <SelectItem value="30d" className="rounded-lg text-[11px]">30d</SelectItem>
              <SelectItem value="7d" className="rounded-lg text-[11px]">7d</SelectItem>
            </SelectContent>
          </Select>
        </CardAction>
      </CardHeader>
      <CardContent className="px-3 pt-1 sm:px-4 sm:pt-1">
        <ChartContainer config={chartConfig} className="aspect-auto h-[120px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillCount" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-count)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-count)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="label"
              tickLine={false}
              axisLine={false}
              tickMargin={3}
              minTickGap={20}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={3}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
            />
            <Area
              dataKey="count"
              type="monotone"
              fill="url(#fillCount)"
              stroke="var(--color-count)"
              strokeWidth={2}
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Status Distribution Chart - Shows case status breakdown
 */
export function StatusDistributionChart({ data, loading, title = "Status Distribution" }) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    // Color mapping for different status values across case types:
    // - Case/CICL-CAR/FAR: Filed, Assessed, In Process, Resolved
    // - FAC: active, closed, pending
    const colors = {
      // Standard case statuses (Case, CICL/CAR, FAR)
      'Filed': '#6b7280',        // gray - newly filed
      'Assessed': '#3b82f6',     // blue - assessed/reviewed
      'In Process': '#f59e0b',   // orange - in progress
      'Resolved': '#10b981',     // green - completed/resolved
      
      // FAC statuses (lowercase)
      'active': '#f59e0b',       // orange - active/ongoing
      'closed': '#10b981',       // green - closed/completed
      'pending': '#8b5cf6',      // purple - pending action
      
      // Legacy/fallback statuses
      'open': '#3b82f6',
      'in-progress': '#f59e0b',
      'unknown': '#6b7280',
    };
    
    return Object.entries(data).map(([status, count]) => ({
      status: status.charAt(0).toUpperCase() + status.slice(1).replace('-', ' '),
      count,
      fill: colors[status] || colors.unknown,
    }));
  }, [data]);

  const chartConfig = {
    count: {
      label: "Cases",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Skeleton className="h-[140px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">Current status of all cases</CardDescription>
      </CardHeader>
      <CardContent className="flex items-center justify-center pt-2">
        <ChartContainer config={chartConfig} className="h-[140px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent />} />
              <Pie
                data={chartData}
                dataKey="count"
                nameKey="status"
                cx="50%"
                cy="50%"
                outerRadius={50}
                label={(entry) => `${entry.status}: ${entry.count}`}
                style={{ fontSize: '9px' }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Legend wrapperStyle={{ fontSize: '10px' }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Priority Distribution Chart - Shows priority breakdown
 */
export function PriorityChart({ data, loading, title = "Priority Distribution" }) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return [
      { priority: 'High', count: data.high || 0, fill: '#ef4444' },
      { priority: 'Medium', count: data.medium || 0, fill: '#f59e0b' },
      { priority: 'Low', count: data.low || 0, fill: '#10b981' },
    ];
  }, [data]);

  const chartConfig = {
    count: {
      label: "Cases",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Skeleton className="h-[140px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">Cases by priority level</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig} className="h-[140px] w-full">
          <BarChart data={chartData}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis
              dataKey="priority"
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={{ fontSize: 10 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tickMargin={4}
              tick={{ fontSize: 10 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

/**
 * Workload Chart - Shows case manager workload
 */
export function WorkloadChart({ data, loading, title = "Case Manager Workload" }) {
  const chartData = useMemo(() => {
    if (!data) return [];
    
    return Object.entries(data)
      .map(([manager, count]) => ({
        manager: manager === 'unassigned' ? 'Unassigned' : manager,
        count,
        fill: manager === 'unassigned' ? '#6b7280' : 'var(--primary)',
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10
  }, [data]);

  const chartConfig = {
    count: {
      label: "Cases",
    },
  };

  if (loading) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">{title}</CardTitle>
        </CardHeader>
        <CardContent className="pt-2">
          <Skeleton className="h-[150px] w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">Cases assigned to each manager</CardDescription>
      </CardHeader>
      <CardContent className="pt-2">
        <ChartContainer config={chartConfig} className="h-[150px] w-full">
          <BarChart data={chartData} layout="vertical">
            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
            <XAxis type="number" tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
            <YAxis
              dataKey="manager"
              type="category"
              tickLine={false}
              axisLine={false}
              width={70}
              tick={{ fontSize: 9 }}
            />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Bar>
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
