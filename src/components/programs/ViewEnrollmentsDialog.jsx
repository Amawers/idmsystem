/**
 * @file ViewEnrollmentsDialog.jsx
 * @description Dialog to view enrollments for a specific program
 * @module components/programs/ViewEnrollmentsDialog
 * 
 * Features:
 * - Display all enrollments for a specific program
 * - Filter by enrollment status
 * - Show enrollment statistics
 * - Quick actions to update or navigate to full page
 */

import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useEnrollments } from '@/hooks/useEnrollments';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import {
  Users,
  ExternalLink,
  TrendingUp,
  Calendar,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const statusColors = {
  active: 'bg-green-500',
  completed: 'bg-blue-500',
  dropped: 'bg-red-500',
  at_risk: 'bg-yellow-500',
};

const progressColors = {
  excellent: 'text-green-600',
  good: 'text-blue-600',
  fair: 'text-yellow-600',
  poor: 'text-red-600',
};

/**
 * View Enrollments Dialog Component
 * @param {Object} props
 * @param {Object} props.program - Program object to view enrollments for
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Callback when dialog state changes
 */
export default function ViewEnrollmentsDialog({ program, open, onOpenChange }) {
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState('all');

  // Fetch enrollments filtered by this program's ID
  const isEnabled = Boolean(open && program?.id);
  const { enrollments, loading, error } = useEnrollments({
    programId: program?.id,
    enabled: isEnabled,
  });

  // Further filter by status if selected
  const filteredEnrollments = useMemo(() => {
    if (!enrollments) return [];
    if (statusFilter === 'all') return enrollments;
    return enrollments.filter((e) => e.status === statusFilter);
  }, [enrollments, statusFilter]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!enrollments || enrollments.length === 0) {
      return {
        total: 0,
        active: 0,
        completed: 0,
        dropped: 0,
        atRisk: 0,
        avgAttendance: 0,
        avgProgress: 0,
      };
    }

    const total = enrollments.length;
    const active = enrollments.filter((e) => e.status === 'active').length;
    const completed = enrollments.filter((e) => e.status === 'completed').length;
    const dropped = enrollments.filter((e) => e.status === 'dropped').length;
    const atRisk = enrollments.filter((e) => e.status === 'at_risk').length;
    
    const avgAttendance =
      enrollments.reduce((sum, e) => sum + (parseFloat(e.attendance_rate) || 0), 0) / total;
    
    const avgProgress =
      enrollments.reduce((sum, e) => sum + (parseFloat(e.progress_percentage) || 0), 0) / total;

    return {
      total,
      active,
      completed,
      dropped,
      atRisk,
      avgAttendance,
      avgProgress,
    };
  }, [enrollments]);

  const handleViewFullPage = () => {
    onOpenChange(false);
    navigate(
      `/program/enrollments?programId=${program.id}&programName=${encodeURIComponent(
        program.program_name
      )}`
    );
  };

  if (!program) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">
                Program Enrollments
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-foreground">{program.program_name}</span>
                <Badge variant="outline" className="capitalize">
                  {program.program_type}
                </Badge>
                <Badge className={statusColors[program.status] || 'bg-gray-500'}>
                  {program.status}
                </Badge>
              </DialogDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleViewFullPage}
              className="cursor-pointer"
            >
              <ExternalLink className="h-4 w-4 mr-1" />
              Full Page
            </Button>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              <p>Error loading enrollments: {error}</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {/* Statistics Cards */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total Enrollments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{statistics.total}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    Active
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{statistics.active}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600" />
                    Completed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{statistics.completed}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Avg Attendance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {statistics.avgAttendance.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-4">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status ({statistics.total})</SelectItem>
                  <SelectItem value="active">Active ({statistics.active})</SelectItem>
                  <SelectItem value="completed">Completed ({statistics.completed})</SelectItem>
                  <SelectItem value="dropped">Dropped ({statistics.dropped})</SelectItem>
                  <SelectItem value="at_risk">At Risk ({statistics.atRisk})</SelectItem>
                </SelectContent>
              </Select>
              {statusFilter !== 'all' && (
                <Badge variant="secondary">
                  Showing {filteredEnrollments.length} of {statistics.total} enrollments
                </Badge>
              )}
            </div>

            {/* Enrollments Table */}
            <div className="rounded-md border">
              <div className="max-h-[400px] overflow-y-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead>Beneficiary</TableHead>
                      <TableHead>Case Type</TableHead>
                      <TableHead>Enrollment Date</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEnrollments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground h-32">
                          {enrollments.length === 0 ? (
                            <div className="flex flex-col items-center gap-2">
                              <XCircle className="h-8 w-8 text-muted-foreground/50" />
                              <p>No enrollments found for this program</p>
                              <p className="text-sm">
                                Start by creating an enrollment from the main enrollments page
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-2">
                              <AlertCircle className="h-8 w-8 text-muted-foreground/50" />
                              <p>No {statusFilter} enrollments found</p>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setStatusFilter('all')}
                              >
                                Clear filter
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredEnrollments.map((enrollment) => {
                        const progressPercentage = parseFloat(enrollment.progress_percentage) || 0;

                        return (
                          <TableRow key={enrollment.id}>
                            <TableCell className="font-medium">
                              <div>
                                <div>{enrollment.beneficiary_name}</div>
                                <div className="text-xs text-muted-foreground">
                                  #{enrollment.case_number}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{enrollment.case_type}</Badge>
                            </TableCell>
                            <TableCell>
                              {new Date(enrollment.enrollment_date).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1 min-w-[120px]">
                                <div className="flex items-center justify-between text-xs">
                                  <span
                                    className={
                                      progressColors[enrollment.progress_level] || 'text-gray-600'
                                    }
                                  >
                                    {enrollment.progress_level || 'N/A'}
                                  </span>
                                  <span className="text-muted-foreground">
                                    {enrollment.sessions_completed || 0}/
                                    {enrollment.sessions_total || 0}
                                  </span>
                                </div>
                                <Progress value={progressPercentage} className="h-1.5" />
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="text-sm font-medium">
                                {parseFloat(enrollment.attendance_rate || 0).toFixed(1)}%
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {enrollment.sessions_attended || 0} attended
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusColors[enrollment.status]}>
                                {enrollment.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <p className="text-sm text-muted-foreground">
                {filteredEnrollments.length > 0
                  ? `Showing ${filteredEnrollments.length} enrollment${
                      filteredEnrollments.length === 1 ? '' : 's'
                    }`
                  : 'No enrollments to display'}
              </p>
              <Button onClick={handleViewFullPage} variant="default" className="cursor-pointer">
                Manage Enrollments
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
