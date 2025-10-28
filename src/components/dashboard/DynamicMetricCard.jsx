/**
 * @file DynamicMetricCard.jsx
 * @description Reusable metric card component for displaying KPIs with trends
 * @module components/dashboard/DynamicMetricCard
 * 
 * @overview
 * Displays a single metric with:
 * - Title and icon
 * - Current value (formatted)
 * - Trend indicator (up/down/neutral)
 * - Percentage change
 * - Description text
 * - Optional footer with additional context
 * 
 * @usage
 * ```jsx
 * <DynamicMetricCard
 *   title="Total Cases"
 *   value={1234}
 *   icon={<FileText />}
 *   trend={{ percentage: 12.5, direction: 'up' }}
 *   description="Active cases this month"
 *   footer="Updated 5 minutes ago"
 * />
 * ```
 */

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter, CardAction } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { IconTrendingUp, IconTrendingDown, IconMinus } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * Format large numbers with K/M suffixes
 * @param {number} num - Number to format
 * @returns {string} Formatted number
 */
function formatNumber(num) {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  }
  return num.toLocaleString();
}

/**
 * Get trend icon and color based on direction
 * @param {string} direction - 'up', 'down', or 'neutral'
 * @param {boolean} inverse - Whether to inverse the color (e.g., down is good)
 * @returns {Object} Icon component and color class
 */
function getTrendDisplay(direction, inverse = false) {
  if (direction === 'up') {
    return {
      icon: IconTrendingUp,
      color: inverse ? 'text-red-600' : 'text-green-600',
      bgColor: inverse ? 'bg-red-500/10 border-red-200' : 'bg-green-500/10 border-green-200',
    };
  }
  if (direction === 'down') {
    return {
      icon: IconTrendingDown,
      color: inverse ? 'text-green-600' : 'text-red-600',
      bgColor: inverse ? 'bg-green-500/10 border-green-200' : 'bg-red-500/10 border-red-200',
    };
  }
  return {
    icon: IconMinus,
    color: 'text-gray-600',
    bgColor: 'bg-gray-500/10 border-gray-200',
  };
}

/**
 * Loading skeleton for metric card
 */
export function DynamicMetricCardSkeleton() {
  return (
    <Card className="@container/card">
      <CardHeader>
        <CardDescription>
          <Skeleton className="h-4 w-24" />
        </CardDescription>
        <CardTitle className="text-2xl">
          <Skeleton className="h-8 w-32" />
        </CardTitle>
        <CardAction>
          <Skeleton className="h-6 w-16" />
        </CardAction>
      </CardHeader>
      <CardFooter className="flex-col items-start gap-1.5 text-sm">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-32" />
      </CardFooter>
    </Card>
  );
}

/**
 * Main metric card component
 * @param {Object} props
 * @param {string} props.title - Card title
 * @param {number|string} props.value - Main metric value
 * @param {React.ReactNode} props.icon - Icon component
 * @param {string} props.iconColor - Icon color class (e.g., 'text-blue-600')
 * @param {Object} props.trend - Trend data { percentage, direction }
 * @param {boolean} props.inverseTrend - Whether down is good (default: false)
 * @param {string} props.description - Description text
 * @param {string} props.footer - Footer text
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.loading - Loading state
 */
export function DynamicMetricCard({
  title,
  value,
  icon: Icon,
  iconColor = "text-muted-foreground",
  trend,
  inverseTrend = false,
  description,
  footer,
  className,
  loading = false,
}) {
  if (loading) {
    return <DynamicMetricCardSkeleton />;
  }

  const trendDisplay = trend ? getTrendDisplay(trend.direction, inverseTrend) : null;
  const TrendIcon = trendDisplay?.icon;

  return (
    <Card className={cn("@container/card from-primary/5 to-card bg-gradient-to-t shadow-xs", className)}>
      <CardHeader className="pb-0.5 pt-2 px-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardDescription className="flex items-center gap-1 text-[11px]">
              {Icon && <Icon className={cn("h-3 w-3", iconColor)} />}
              {title}
            </CardDescription>
            <CardTitle className="text-lg font-semibold tabular-nums @[250px]/card:text-xl mt-0">
              {typeof value === 'number' ? formatNumber(value) : value}
            </CardTitle>
          </div>
          {trendDisplay && (
            <CardAction>
              <Badge variant="outline" className={cn(trendDisplay.bgColor, "text-[10px] py-0 px-1 h-4")}>
                <TrendIcon className="h-2 w-2 mr-0.5" />
                {trend.percentage}%
              </Badge>
            </CardAction>
          )}
        </div>
      </CardHeader>
      {(description || footer) && (
        <CardFooter className="flex-col items-start gap-0 text-xs pt-0.5 pb-1.5 px-3">
          {description && (
            <div className={cn("line-clamp-1 flex gap-1 font-medium text-[10px]", trendDisplay?.color)}>
              {description}
              {TrendIcon && <TrendIcon className="size-2.5" />}
            </div>
          )}
          {footer && (
            <div className="text-muted-foreground text-[9px]">
              {footer}
            </div>
          )}
        </CardFooter>
      )}
    </Card>
  );
}

/**
 * Grid container for metric cards
 * @param {Object} props
 * @param {React.ReactNode} props.children - DynamicMetricCard components
 * @param {string} props.className - Additional CSS classes
 */
export function MetricCardGrid({ children, className }) {
  return (
    <div className={cn(
      "grid grid-cols-1 gap-3 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-4",
      className
    )}>
      {children}
    </div>
  );
}
