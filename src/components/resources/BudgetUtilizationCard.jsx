/**
 * @file BudgetUtilizationCard.jsx
 * @description Card displaying overall budget utilization metrics
 * @module components/resources/BudgetUtilizationCard
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

/**
 * Budget Utilization Card Component
 * 
 * @param {Object} props
 * @param {Object} props.budgetUtilization - Budget utilization data
 * @returns {JSX.Element}
 */
export default function BudgetUtilizationCard({ budgetUtilization = {} }) {
  const {
    total_budget = 0,
    total_spent = 0,
    total_allocated = 0,
    total_pending = 0,
    remaining = 0,
    utilization_rate = 0,
    committed_rate = 0,
  } = budgetUtilization;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Budget Utilization</CardTitle>
        <CardDescription>Overall budget allocation and usage</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Utilization Rate</span>
            <span className="font-bold">{utilization_rate.toFixed(1)}%</span>
          </div>
          <Progress value={utilization_rate} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Committed (Used + Pending)</span>
            <span className="font-bold">{committed_rate.toFixed(1)}%</span>
          </div>
          <Progress value={committed_rate} className="bg-yellow-100" />
        </div>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="text-lg font-bold">₱{total_budget.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Remaining</p>
            <p className="text-lg font-bold text-green-600">₱{remaining.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Spent</p>
            <p className="text-sm font-medium">₱{total_spent.toLocaleString()}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Allocated</p>
            <p className="text-sm font-medium">₱{total_allocated.toLocaleString()}</p>
          </div>
          <div className="space-y-1 col-span-2">
            <p className="text-xs text-muted-foreground">Pending Approval</p>
            <p className="text-sm font-medium text-yellow-600">₱{total_pending.toLocaleString()}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
