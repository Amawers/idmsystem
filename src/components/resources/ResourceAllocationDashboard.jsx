/**
 * @file ResourceAllocationDashboard.jsx
 * @description Dashboard for resource allocation overview and metrics
 * @module components/resources/ResourceAllocationDashboard
 * 
 * Features:
 * - Key metrics cards (total requests, budget utilization, pending approvals)
 * - Charts for allocation trends and distribution
 * - Recent requests list
 * - Filter and export capabilities
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useResourceRequests } from "@/hooks/useResourceRequests";
import { useResourceAllocations } from "@/hooks/useResourceAllocations";
import { 
	DollarSign, 
	FileText, 
	Clock, 
	CheckCircle, 
	AlertTriangle,
	TrendingUp,
} from "lucide-react";
import { formatCurrency } from "@/lib/resourceSubmission";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

/**
 * Metric Card Component
 */
function MetricCard({ title, value, description, icon, trend, color = "text-blue-600" }) {
	const IconComp = icon;
	return (
		<Card>
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
				<CardTitle className="text-sm font-medium">{title}</CardTitle>
				<IconComp className={`h-4 w-4 ${color}`} />
			</CardHeader>
			<CardContent>
				<div className="text-2xl font-bold">{value}</div>
				<p className="text-xs text-muted-foreground mt-1">{description}</p>
				{trend && (
					<div className="flex items-center mt-2 text-xs text-green-600">
						<TrendingUp className="h-3 w-3 mr-1" />
						{trend}
					</div>
				)}
			</CardContent>
		</Card>
	);
}

/**
 * Resource Allocation Dashboard Component
 */
export default function ResourceAllocationDashboard() {
	const { statistics, recentRequests, loading: requestsLoading } = useResourceRequests();
	const { budgetUtilization, topPrograms, loading: allocationsLoading } = useResourceAllocations();

	const loading = requestsLoading || allocationsLoading;

	if (loading) {
		return (
			<div className="flex items-center justify-center h-64">
				<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{/* Key Metrics */}
			<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
				<MetricCard
					title="Total Requests"
					value={statistics.total || 0}
					description={`${statistics.submitted || 0} pending approval`}
					icon={FileText}
					color="text-blue-600"
				/>
				<MetricCard
					title="Total Budget Allocated"
					value={formatCurrency(budgetUtilization.total_budget || 0)}
					description={`${(budgetUtilization.utilization_rate || 0).toFixed(1)}% utilized`}
					icon={DollarSign}
					color="text-green-600"
				/>
				<MetricCard
					title="Pending Approvals"
					value={statistics.submitted || 0}
					description={formatCurrency(statistics.pendingAmount || 0)}
					icon={Clock}
					color="text-orange-600"
				/>
				<MetricCard
					title="Disbursed"
					value={statistics.disbursed || 0}
					description={formatCurrency(statistics.totalAmount - statistics.pendingAmount || 0)}
					icon={CheckCircle}
					color="text-purple-600"
				/>
			</div>

			{/* Budget Utilization */}
			<Card>
				<CardHeader>
					<CardTitle>Budget Utilization Overview</CardTitle>
					<CardDescription>Track budget allocation across all programs</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm font-medium">Total Allocated</span>
							<span className="text-sm font-medium">
								{formatCurrency(budgetUtilization.total_budget || 0)}
							</span>
						</div>
						<div className="flex items-center justify-between mb-2">
							<span className="text-sm text-muted-foreground">Used</span>
							<span className="text-sm font-medium text-primary">
								{formatCurrency(budgetUtilization.total_used || 0)}
							</span>
						</div>
						<Progress value={budgetUtilization.utilization_rate || 0} className="h-3 mb-2" />
						<p className="text-xs text-muted-foreground">
							{(budgetUtilization.utilization_rate || 0).toFixed(1)}% utilized
						</p>
					</div>
					
					<div className="flex items-center justify-between pt-3 border-t">
						<span className="text-sm font-medium">Remaining Budget</span>
						<span className="text-lg font-bold text-green-600">
							{formatCurrency(budgetUtilization.remaining || 0)}
						</span>
					</div>
				</CardContent>
			</Card>

			<div className="grid gap-4 md:grid-cols-2">
				{/* Top Programs by Allocation */}
				<Card>
					<CardHeader>
						<CardTitle>Top Programs by Resource Allocation</CardTitle>
						<CardDescription>Programs with highest resource usage</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							{topPrograms.length > 0 ? (
								topPrograms.map((program, index) => (
									<div key={index} className="space-y-2">
										<div className="flex items-center justify-between">
											<span className="text-sm font-medium truncate">
												{program.program_name}
											</span>
											<span className="text-sm font-medium">
												{formatCurrency(program.resource_allocated)}
											</span>
										</div>
										<div className="flex items-center gap-2">
											<Progress 
												value={program.utilization_rate} 
												className="h-2" 
											/>
											<span className="text-xs text-muted-foreground whitespace-nowrap">
												{program.utilization_rate.toFixed(0)}%
											</span>
										</div>
									</div>
								))
							) : (
								<p className="text-sm text-muted-foreground">No allocation data available</p>
							)}
						</div>
					</CardContent>
				</Card>

				{/* Recent Requests */}
				<Card>
					<CardHeader>
						<CardTitle>Recent Resource Requests</CardTitle>
						<CardDescription>Latest requests from all programs</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-3">
							{recentRequests.slice(0, 5).map((request) => (
								<div key={request.id} className="flex items-start justify-between border-b pb-2 last:border-0">
									<div className="space-y-1 flex-1">
										<p className="text-sm font-medium truncate">
											{request.item_description}
										</p>
										<p className="text-xs text-muted-foreground">
											{request.requester_name} • {new Date(request.created_at).toLocaleDateString()}
										</p>
									</div>
									<div className="flex flex-col items-end gap-1 ml-2">
										<Badge 
											variant={request.status === 'disbursed' ? 'success' : 'secondary'}
											className="text-xs"
										>
											{request.status}
										</Badge>
										<span className="text-xs font-medium">
											{formatCurrency(request.total_amount)}
										</span>
									</div>
								</div>
							))}
							{recentRequests.length === 0 && (
								<p className="text-sm text-muted-foreground">No recent requests</p>
							)}
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Alerts Summary */}
			{statistics.submitted > 5 && (
				<Card className="border-orange-200 bg-orange-50">
					<CardHeader>
						<div className="flex items-center gap-2">
							<AlertTriangle className="h-5 w-5 text-orange-600" />
							<CardTitle className="text-orange-900">Attention Required</CardTitle>
						</div>
					</CardHeader>
					<CardContent>
						<p className="text-sm text-orange-800">
							You have {statistics.submitted} pending requests totaling{" "}
							<span className="font-semibold">{formatCurrency(statistics.pendingAmount || 0)}</span>{" "}
							awaiting approval.
						</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
