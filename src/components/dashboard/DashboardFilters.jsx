/**
 * @file DashboardFilters.jsx
 * @description Filter controls for dashboard data
 * @module components/dashboard/DashboardFilters
 * 
 * @overview
 * Provides filtering UI for:
 * - Date range selection
 * - Status filtering
 * - Priority filtering
 * - Case type filtering
 * - Quick date presets (Today, This Week, This Month, etc.)
 * 
 * @usage
 * ```jsx
 * <DashboardFilters
 *   onFilterChange={(filters) => setFilters(filters)}
 *   initialFilters={filters}
 * />
 * ```
 */

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/date-picker";
import { Badge } from "@/components/ui/badge";
import { X, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Date range presets
 */
const DATE_PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'This Week', value: 'week' },
  { label: 'This Month', value: 'month' },
  { label: 'Last 30 Days', value: '30days' },
  { label: 'Last 90 Days', value: '90days' },
  { label: 'This Year', value: 'year' },
  { label: 'All Time', value: 'all' },
];

/**
 * Calculate date range from preset
 */
function getDateRangeFromPreset(preset) {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  switch (preset) {
    case 'today':
      return { start: today, end: now };
    
    case 'week': {
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - today.getDay());
      return { start: weekStart, end: now };
    }
    
    case 'month': {
      const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start: monthStart, end: now };
    }
    
    case '30days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 30);
      return { start, end: now };
    }
    
    case '90days': {
      const start = new Date(now);
      start.setDate(now.getDate() - 90);
      return { start, end: now };
    }
    
    case 'year': {
      const yearStart = new Date(today.getFullYear(), 0, 1);
      return { start: yearStart, end: now };
    }
    
    case 'all':
    default:
      return null;
  }
}

/**
 * Main Dashboard Filters Component
 */
export default function DashboardFilters({ onFilterChange, initialFilters = {} }) {
  const [datePreset, setDatePreset] = useState(initialFilters.datePreset || 'month');
  const [customDateRange, setCustomDateRange] = useState(initialFilters.dateRange || null);
  const [status, setStatus] = useState(initialFilters.status || '');
  const [priority, setPriority] = useState(initialFilters.priority || '');
  const [caseType, setCaseType] = useState(initialFilters.caseType || '');

  // Compute current filters
  const currentFilters = useCallback(() => {
    const filters = {};
    
    // Date range
    if (datePreset === 'custom' && customDateRange) {
      filters.dateRange = customDateRange;
    } else if (datePreset !== 'all') {
      filters.dateRange = getDateRangeFromPreset(datePreset);
    }
    filters.datePreset = datePreset;
    
    // Status
    if (status) filters.status = status;
    
    // Priority
    if (priority) filters.priority = priority;
    
    // Case Type
    if (caseType) filters.caseType = caseType;
    
    return filters;
  }, [datePreset, customDateRange, status, priority, caseType]);

  // Handle filter change
  const handleApplyFilters = useCallback(() => {
    onFilterChange?.(currentFilters());
  }, [currentFilters, onFilterChange]);

  // Handle reset
  const handleReset = useCallback(() => {
    setDatePreset('month');
    setCustomDateRange(null);
    setStatus('');
    setPriority('');
    setCaseType('');
    onFilterChange?.({});
  }, [onFilterChange]);

  // Auto-apply on change
  const handleDatePresetChange = (value) => {
    setDatePreset(value);
    if (value !== 'custom') {
      setTimeout(() => onFilterChange?.(currentFilters()), 0);
    }
  };

  const handleStatusChange = (value) => {
    setStatus(value);
    setTimeout(() => onFilterChange?.(currentFilters()), 0);
  };

  const handlePriorityChange = (value) => {
    setPriority(value);
    setTimeout(() => onFilterChange?.(currentFilters()), 0);
  };

  const handleCaseTypeChange = (value) => {
    setCaseType(value);
    setTimeout(() => onFilterChange?.(currentFilters()), 0);
  };

  // Count active filters
  const activeFilterCount = [status, priority, caseType, datePreset !== 'month'].filter(Boolean).length;

  return (
    <div className="px-4 lg:px-6">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm">Filter Options</CardTitle>
              <CardDescription className="text-xs">Customize your dashboard view</CardDescription>
            </div>
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleReset} className="gap-1 h-7 text-xs">
                <X className="h-3 w-3" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="pb-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Date Range Preset */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Date Range</label>
                  <Select value={datePreset} onValueChange={handleDatePresetChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_PRESETS.map((preset) => (
                        <SelectItem key={preset.value} value={preset.value} className="text-xs">
                          {preset.label}
                        </SelectItem>
                      ))}
                      <SelectItem value="custom" className="text-xs">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Status</label>
                  <Select value={status} onValueChange={handleStatusChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">All Statuses</SelectItem>
                      <SelectItem value="open" className="text-xs">Open</SelectItem>
                      <SelectItem value="in-progress" className="text-xs">In Progress</SelectItem>
                      <SelectItem value="pending" className="text-xs">Pending</SelectItem>
                      <SelectItem value="closed" className="text-xs">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Priority Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Priority</label>
                  <Select value={priority} onValueChange={handlePriorityChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Priorities" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">All Priorities</SelectItem>
                      <SelectItem value="high" className="text-xs">High</SelectItem>
                      <SelectItem value="medium" className="text-xs">Medium</SelectItem>
                      <SelectItem value="low" className="text-xs">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Case Type Filter */}
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">Case Type</label>
                  <Select value={caseType} onValueChange={handleCaseTypeChange}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="" className="text-xs">All Types</SelectItem>
                      <SelectItem value="case" className="text-xs">Standard Case</SelectItem>
                      <SelectItem value="ciclcar" className="text-xs">CICL-CAR</SelectItem>
                      <SelectItem value="far" className="text-xs">FAR</SelectItem>
                      <SelectItem value="fac" className="text-xs">FAC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Date Range (shown when preset is 'custom') */}
                {datePreset === 'custom' && (
                  <div className="col-span-full space-y-1.5">
                    <label className="text-xs font-medium flex items-center gap-1.5">
                      <Calendar className="h-3 w-3" />
                      Custom Date Range
                    </label>
                    <div className="flex items-center gap-3">
                      <DatePicker
                        date={customDateRange?.start}
                        onDateChange={(date) => {
                          const newRange = { ...customDateRange, start: date };
                          setCustomDateRange(newRange);
                        }}
                        placeholder="Start date"
                      />
                      <span className="text-muted-foreground text-xs">to</span>
                      <DatePicker
                        date={customDateRange?.end}
                        onDateChange={(date) => {
                          const newRange = { ...customDateRange, end: date };
                          setCustomDateRange(newRange);
                        }}
                        placeholder="End date"
                      />
                      <Button onClick={handleApplyFilters} size="sm" className="h-8 text-xs">Apply</Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Active Filters Display */}
              {activeFilterCount > 0 && (
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium mb-1.5">Active Filters:</p>
                  <div className="flex flex-wrap gap-1.5">
                    {datePreset !== 'month' && (
                      <Badge variant="secondary" className="gap-0.5 text-xs py-0 px-2">
                        Date: {DATE_PRESETS.find(p => p.value === datePreset)?.label || 'Custom'}
                        <button
                          onClick={() => handleDatePresetChange('month')}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    )}
                    {status && (
                      <Badge variant="secondary" className="gap-0.5 text-xs py-0 px-2">
                        Status: {status}
                        <button
                          onClick={() => handleStatusChange('')}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    )}
                    {priority && (
                      <Badge variant="secondary" className="gap-0.5 text-xs py-0 px-2">
                        Priority: {priority}
                        <button
                          onClick={() => handlePriorityChange('')}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    )}
                    {caseType && (
                      <Badge variant="secondary" className="gap-0.5 text-xs py-0 px-2">
                        Type: {caseType}
                        <button
                          onClick={() => handleCaseTypeChange('')}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-2.5 w-2.5" />
                        </button>
                      </Badge>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }
