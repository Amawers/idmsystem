/**
 * @file ProgramDashboard.jsx
 * @description Program analytics dashboard displaying key metrics and charts
 * @module components/programs/ProgramDashboard
 * 
 * Features:
 * - Key metrics cards (total programs, enrollments, budget)
 * - Program distribution by type chart
 * - Enrollment trends chart
 * - Success rate by program chart
 * - Recent activities list
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { usePrograms } from "@/hooks/usePrograms";
import { useEnrollments } from "@/hooks/useEnrollments";
import { 
  Activity,
  DollarSign,
  Users,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

/**
 * Metric Card Component
 */
function MetricCard({ title, value, description, icon: Icon, trend }) {
  // Determine trend direction for styling
  const isPositive = trend && (trend.startsWith('+') || trend.includes('improvement'));
  const isNegative = trend && (trend.startsWith('-') || trend.includes('decline'));
  const trendColor = isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-muted-foreground';
  const TrendIcon = isPositive ? TrendingUp : isNegative ? TrendingUp : null;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            {TrendIcon && (
              <TrendIcon 
                className={`h-3 w-3 ${trendColor} ${isNegative ? 'rotate-180' : ''}`} 
              />
            )}
            <span className={`text-xs ${trendColor}`}>{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Program Dashboard Component
 * @returns {JSX.Element} Program dashboard
 */
export default function ProgramDashboard() {
  const { programs, statistics: programStats, loading: programsLoading } = usePrograms();
  const { enrollments, statistics: enrollmentStats, loading: enrollmentsLoading } = useEnrollments();

  const loading = programsLoading || enrollmentsLoading;

  // Calculate budget utilization percentage
  const budgetUtilization = programStats.totalBudget > 0
    ? (programStats.totalSpent / programStats.totalBudget) * 100
    : 0;

  // Group programs by type for visualization
  const programsByType = programs.reduce((acc, program) => {
    acc[program.program_type] = (acc[program.program_type] || 0) + 1;
    return acc;
  }, {});

  // Get top performing programs
  const topPrograms = [...programs]
    .filter((p) => p.success_rate > 0)
    .sort((a, b) => b.success_rate - a.success_rate)
    .slice(0, 5);

  // Calculate month-over-month trends
  const calculateTrends = () => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
    const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

    // Programs created this month vs last month
    const programsThisMonth = programs.filter(p => {
      const created = new Date(p.created_at);
      return created.getMonth() === currentMonth && created.getFullYear() === currentYear;
    }).length;

    const programsLastMonth = programs.filter(p => {
      const created = new Date(p.created_at);
      return created.getMonth() === lastMonth && created.getFullYear() === lastMonthYear;
    }).length;

    const programChange = programsThisMonth - programsLastMonth;
    const programTrend = programChange > 0 ? `+${programChange} from last month` : 
                        programChange < 0 ? `${programChange} from last month` : 
                        'No change from last month';

    // Enrollments this month vs last month
    const enrollmentsThisMonth = enrollments.filter(e => {
      const enrolled = new Date(e.enrollment_date);
      return enrolled.getMonth() === currentMonth && enrolled.getFullYear() === currentYear;
    }).length;

    const enrollmentsLastMonth = enrollments.filter(e => {
      const enrolled = new Date(e.enrollment_date);
      return enrolled.getMonth() === lastMonth && enrolled.getFullYear() === lastMonthYear;
    }).length;

    const enrollmentChange = enrollmentsLastMonth > 0 
      ? ((enrollmentsThisMonth - enrollmentsLastMonth) / enrollmentsLastMonth) * 100
      : 0;
    
    const enrollmentTrend = enrollmentChange > 0 ? `+${enrollmentChange.toFixed(1)}% from last month` :
                           enrollmentChange < 0 ? `${enrollmentChange.toFixed(1)}% from last month` :
                           'No change from last month';

    // Success rate trend (compare completed programs this month vs last month)
    const completedThisMonth = enrollments.filter(e => {
      const completed = e.completion_date ? new Date(e.completion_date) : null;
      return completed && 
             completed.getMonth() === currentMonth && 
             completed.getFullYear() === currentYear &&
             e.status === 'completed';
    }).length;

    const completedLastMonth = enrollments.filter(e => {
      const completed = e.completion_date ? new Date(e.completion_date) : null;
      return completed &&
             completed.getMonth() === lastMonth && 
             completed.getFullYear() === lastMonthYear &&
             e.status === 'completed';
    }).length;

    const totalThisMonth = enrollments.filter(e => {
      const enrolled = new Date(e.enrollment_date);
      const enrolledBeforeOrDuringThisMonth = enrolled.getFullYear() < currentYear ||
        (enrolled.getFullYear() === currentYear && enrolled.getMonth() <= currentMonth);
      const completedAfterThisMonth = e.completion_date ? new Date(e.completion_date) > now : true;
      return enrolledBeforeOrDuringThisMonth && completedAfterThisMonth;
    }).length;

    const successRateThisMonth = totalThisMonth > 0 ? (completedThisMonth / totalThisMonth) * 100 : 0;
    const successRateLastMonth = enrollmentsLastMonth > 0 ? (completedLastMonth / enrollmentsLastMonth) * 100 : 0;
    const successRateChange = successRateThisMonth - successRateLastMonth;

    const successTrend = successRateChange > 0 ? `+${successRateChange.toFixed(1)}% improvement` :
                        successRateChange < 0 ? `${successRateChange.toFixed(1)}% decline` :
                        'No change from last month';

    return {
      programTrend,
      enrollmentTrend,
      successTrend,
    };
  };

  const trends = calculateTrends();

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
          title="Total Programs"
          value={programStats.total}
          description={`${programStats.active} active programs`}
          icon={Activity}
          trend={trends.programTrend}
        />
        <MetricCard
          title="Total Enrollment"
          value={programStats.totalEnrollment}
          description={`${enrollmentStats.active} currently active`}
          icon={Users}
          trend={trends.enrollmentTrend}
        />
        <MetricCard
          title="Budget Allocated"
          value={`₱${(programStats.totalBudget / 1000).toFixed(0)}K`}
          description={`₱${(programStats.totalSpent / 1000).toFixed(0)}K spent (${budgetUtilization.toFixed(1)}%)`}
          icon={DollarSign}
        />
        <MetricCard
          title="Avg Success Rate"
          value={`${programStats.averageSuccessRate.toFixed(1)}%`}
          description="Across all programs"
          icon={Award}
          trend={trends.successTrend}
        />
      </div>

      {/* Charts and Detailed Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Programs by Type */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Programs by Type</CardTitle>
            <CardDescription>Distribution of programs by service type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(programsByType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const percentage = (count / programStats.total) * 100;
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="capitalize font-medium">{type}</span>
                      <span className="text-muted-foreground">
                        {count} programs ({percentage.toFixed(0)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
          </CardContent>
        </Card>

        {/* Top Performing Programs */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Top Performing Programs</CardTitle>
            <CardDescription>By success rate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPrograms.map((program) => (
                <div key={program.id} className="flex items-center gap-4">
                  <Target className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {program.program_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {program.current_enrollment} enrolled
                    </p>
                  </div>
                  <div className="text-sm font-medium">
                    {program.success_rate}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enrollment Statistics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Active Enrollments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{enrollmentStats.active}</div>
            <Progress 
              value={(enrollmentStats.active / enrollmentStats.total) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {enrollmentStats.completed}
            </div>
            <Progress 
              value={(enrollmentStats.completed / enrollmentStats.total) * 100} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Avg Attendance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {enrollmentStats.averageAttendance.toFixed(1)}%
            </div>
            <Progress 
              value={enrollmentStats.averageAttendance} 
              className="mt-2 h-2" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Dropped Out</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {enrollmentStats.dropped}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {((enrollmentStats.dropped / enrollmentStats.total) * 100).toFixed(1)}% dropout rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Budget Overview */}
      <Card>
        <CardHeader>
          <CardTitle>Budget Overview</CardTitle>
          <CardDescription>Financial allocation and utilization</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Total Allocated</span>
                <span className="text-sm font-medium">
                  ₱{programStats.totalBudget.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-muted-foreground">Total Spent</span>
                <span className="text-sm font-medium text-primary">
                  ₱{programStats.totalSpent.toLocaleString()}
                </span>
              </div>
              <Progress value={budgetUtilization} className="h-3" />
              <p className="text-xs text-muted-foreground mt-2">
                {budgetUtilization.toFixed(1)}% of budget utilized
              </p>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <span className="text-sm font-medium">Remaining Budget</span>
              <span className="text-lg font-bold text-green-600">
                ₱{(programStats.totalBudget - programStats.totalSpent).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
