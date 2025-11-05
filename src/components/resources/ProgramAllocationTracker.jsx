/**
 * @file ProgramAllocationTracker.jsx
 * @description Track resource usage and budget utilization by program
 * @module components/resources/ProgramAllocationTracker
 * 
 * Features:
 * - Monitor resource usage per program
 * - Track budget utilization
 * - Program performance metrics
 * - Resource allocation history
 */

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown, DollarSign, Package, Users } from "lucide-react";
import { usePrograms } from "@/hooks/usePrograms";
import { useResourceAllocations } from "@/hooks/useResourceAllocations";

function ProgramCard({ program, allocations }) {
  const utilization = program.budget_allocated > 0 
    ? (program.budget_spent / program.budget_allocated) * 100 
    : 0;

  const getUtilizationColor = (rate) => {
    if (rate >= 90) return "text-red-600";
    if (rate >= 75) return "text-orange-600";
    if (rate >= 50) return "text-yellow-600";
    return "text-green-600";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-base">{program.program_name}</CardTitle>
            <CardDescription className="text-xs mt-1">
              {program.program_type} • {program.coordinator}
            </CardDescription>
          </div>
          <Badge variant={program.status === 'active' ? 'success' : 'secondary'}>
            {program.status}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Budget Overview */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Budget Utilization</span>
            <span className={`font-bold ${getUtilizationColor(utilization)}`}>
              {utilization.toFixed(1)}%
            </span>
          </div>
          <Progress value={utilization} className="h-2" />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>₱{program.budget_spent?.toLocaleString()} spent</span>
            <span>₱{program.budget_allocated?.toLocaleString()} allocated</span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 gap-3 pt-3 border-t">
          <div>
            <p className="text-xs text-muted-foreground">Enrollment</p>
            <p className="text-lg font-bold">
              {program.current_enrollment}/{program.capacity}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Resources Used</p>
            <p className="text-lg font-bold">
              {allocations?.transaction_count || 0}
            </p>
          </div>
        </div>

        {/* Resource Allocation */}
        {allocations && (
          <div className="pt-3 border-t">
            <p className="text-xs text-muted-foreground mb-1">Total Allocated</p>
            <p className="text-xl font-bold text-green-600">
              ₱{allocations.resource_allocated?.toLocaleString()}
            </p>
            {allocations.pending_allocation > 0 && (
              <p className="text-xs text-orange-600 mt-1">
                ₱{allocations.pending_allocation?.toLocaleString()} pending
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function ProgramAllocationTracker() {
  const { programs, loading: programsLoading } = usePrograms({ status: 'active' });
  const { allocations, budgetUtilization, loading: allocationsLoading } = useResourceAllocations();
  
  const loading = programsLoading || allocationsLoading;

  // Calculate summary statistics
  const totalPrograms = programs.length;
  const activePrograms = programs.filter(p => p.status === 'active').length;
  const totalBudget = programs.reduce((sum, p) => sum + (p.budget_allocated || 0), 0);
  const totalSpent = programs.reduce((sum, p) => sum + (p.budget_spent || 0), 0);
  const averageUtilization = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  // Sort programs by budget utilization
  const sortedPrograms = [...programs].sort((a, b) => {
    const aUtil = a.budget_allocated > 0 ? (a.budget_spent / a.budget_allocated) * 100 : 0;
    const bUtil = b.budget_allocated > 0 ? (b.budget_spent / b.budget_allocated) * 100 : 0;
    return bUtil - aUtil;
  });

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPrograms}</div>
            <p className="text-xs text-muted-foreground">{activePrograms} active</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Budget</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₱{totalBudget.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Allocated across programs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₱{totalSpent.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">{averageUtilization.toFixed(1)}% utilization</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Remaining</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ₱{(totalBudget - totalSpent).toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">Available budget</p>
          </CardContent>
        </Card>
      </div>

      {/* Program Cards Grid */}
      <Card>
        <CardHeader>
          <CardTitle>Programs Overview</CardTitle>
          <CardDescription>
            Budget utilization and resource allocation by program
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : programs.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {programs.map((program) => (
                <ProgramCard 
                  key={program.id} 
                  program={program}
                  allocations={allocations[program.id]}
                />
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-muted-foreground">
              No programs found
            </p>
          )}
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Program Budget Utilization Details</CardTitle>
        </CardHeader>
        <CardContent className="px-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Program</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Budget Allocated</TableHead>
                <TableHead className="text-right">Budget Spent</TableHead>
                <TableHead className="text-right">Remaining</TableHead>
                <TableHead className="text-right">Utilization</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPrograms.map((program) => {
                const utilization = program.budget_allocated > 0 
                  ? (program.budget_spent / program.budget_allocated) * 100 
                  : 0;
                const remaining = program.budget_allocated - program.budget_spent;

                return (
                  <TableRow key={program.id}>
                    <TableCell className="font-medium">{program.program_name}</TableCell>
                    <TableCell className="text-sm capitalize">{program.program_type}</TableCell>
                    <TableCell className="text-right">₱{program.budget_allocated?.toLocaleString()}</TableCell>
                    <TableCell className="text-right text-red-600">
                      ₱{program.budget_spent?.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right text-green-600">
                      ₱{remaining.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-medium">{utilization.toFixed(1)}%</span>
                        {utilization >= 90 ? (
                          <TrendingUp className="h-4 w-4 text-red-600" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-green-600" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={program.status === 'active' ? 'success' : 'secondary'}>
                        {program.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
