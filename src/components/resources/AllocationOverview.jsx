/**
 * @file AllocationOverview.jsx
 * @description Overview of resource allocations by program
 * @module components/resources/AllocationOverview
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Allocation Overview Component
 * 
 * @param {Object} props
 * @param {Object} props.allocations - Allocations by program
 * @param {Array} props.topPrograms - Top programs by allocation
 * @param {boolean} props.loading - Loading state
 * @returns {JSX.Element}
 */
export default function AllocationOverview({ allocations = {}, topPrograms = [], loading }) {
  if (loading) {
    return <div className="text-center py-8">Loading allocations...</div>;
  }

  const programsArray = Object.values(allocations);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Program Allocations</CardTitle>
        <CardDescription>
          Resource allocation breakdown by program
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {programsArray.map((program) => (
            <div key={program.program_name} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-sm font-medium">{program.program_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {program.transaction_count} transactions
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">
                    ₱{program.resource_allocated?.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {program.utilization_rate?.toFixed(1)}% utilized
                  </p>
                </div>
              </div>
              <Progress value={program.utilization_rate || 0} />
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Budget</p>
                  <p className="font-medium">₱{program.budget_allocated?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Spent</p>
                  <p className="font-medium">₱{program.budget_spent?.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Pending</p>
                  <p className="font-medium">₱{program.pending_allocation?.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
          {programsArray.length === 0 && (
            <p className="text-center text-muted-foreground py-8">No allocation data available</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
