/**
 * @file ProgramDetailsDialog.jsx
 * @description Detailed view dialog for program information
 * @module components/programs/ProgramDetailsDialog
 * 
 * Features:
 * - Tabbed layout with Overview, Beneficiaries, Budget, and Details
 * - Comprehensive program metrics and statistics
 * - Quick actions (Edit, Delete)
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calendar,
  Users,
  Target,
  DollarSign,
  MapPin,
  User,
  Clock,
  TrendingUp,
  Edit,
  Trash2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { format } from 'date-fns';

const statusColors = {
  active: 'bg-green-500',
  inactive: 'bg-gray-500',
  completed: 'bg-blue-500',
};

const programTypeLabels = {
  counseling: 'Counseling',
  legal: 'Legal Aid',
  medical: 'Medical',
  educational: 'Educational',
  financial: 'Financial',
  prevention: 'Prevention',
  livelihood: 'Livelihood',
  shelter: 'Shelter',
  recreational: 'Recreational',
};

/**
 * Program Details Dialog Component
 * @param {Object} props
 * @param {Object} props.program - Program data object
 * @param {boolean} props.open - Dialog open state
 * @param {Function} props.onOpenChange - Callback when dialog state changes
 * @param {Function} props.onEdit - Callback to edit program
 * @param {Function} props.onDelete - Callback to delete program
 */
export default function ProgramDetailsDialog({ 
  program, 
  open, 
  onOpenChange,
  onEdit,
  onDelete 
}) {
  const [activeTab, setActiveTab] = useState('overview');

  if (!program) return null;

  // Calculate metrics
  const enrollmentRate = program.capacity > 0
    ? ((program.current_enrollment / program.capacity) * 100).toFixed(0)
    : 0;

  const budgetUsage = program.budget_allocated > 0
    ? ((program.budget_spent / program.budget_allocated) * 100).toFixed(0)
    : 0;

  const remainingCapacity = program.capacity - program.current_enrollment;
  const remainingBudget = program.budget_allocated - program.budget_spent;

  // Format dates
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(new Date(dateString), 'MMM dd, yyyy');
    } catch {
      return dateString;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-2xl font-bold mb-2">
                {program.program_name}
              </DialogTitle>
              <DialogDescription className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="capitalize">
                  {programTypeLabels[program.program_type] || program.program_type}
                </Badge>
                <Badge className={statusColors[program.status]}>
                  {program.status}
                </Badge>
                {program.coordinator && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {program.coordinator}
                  </span>
                )}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(program);
                }}
              >
                <Edit className="h-4 w-4 mr-1" />
                Edit
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete "${program.program_name}"?`)) {
                    onOpenChange(false);
                    onDelete(program.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="beneficiaries">Beneficiaries</TabsTrigger>
            <TabsTrigger value="budget">Budget</TabsTrigger>
            <TabsTrigger value="details">Details</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Duration */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm font-medium">Program Duration</span>
                </div>
                <p className="text-lg font-semibold">
                  {formatDate(program.start_date)}
                  {program.end_date && ` - ${formatDate(program.end_date)}`}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {program.duration_weeks} weeks duration
                </p>
              </div>

              {/* Enrollment Status */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <Users className="h-4 w-4" />
                  <span className="text-sm font-medium">Enrollment</span>
                </div>
                <p className="text-lg font-semibold">
                  {program.current_enrollment} / {program.capacity}
                </p>
                <div className="mt-2">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all" 
                      style={{ width: `${enrollmentRate}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {enrollmentRate}% capacity • {remainingCapacity} slots remaining
                  </p>
                </div>
              </div>

              {/* Success Rate */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Success Rate</span>
                </div>
                <p className="text-3xl font-bold text-green-600">
                  {program.success_rate}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Program completion rate
                </p>
              </div>

              {/* Location */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <MapPin className="h-4 w-4" />
                  <span className="text-sm font-medium">Location</span>
                </div>
                <p className="text-lg font-semibold">
                  {program.location || 'Not specified'}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {program.schedule || 'Schedule TBD'}
                </p>
              </div>
            </div>

            {/* Description */}
            {program.description && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-2">Program Description</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {program.description}
                </p>
              </div>
            )}
          </TabsContent>

          {/* Beneficiaries Tab */}
          <TabsContent value="beneficiaries" className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{program.current_enrollment}</p>
                <p className="text-sm text-muted-foreground">Currently Enrolled</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <p className="text-2xl font-bold">{program.capacity}</p>
                <p className="text-sm text-muted-foreground">Total Capacity</p>
              </div>
              <div className="p-4 border rounded-lg text-center">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-2xl font-bold">{remainingCapacity}</p>
                <p className="text-sm text-muted-foreground">Slots Available</p>
              </div>
            </div>

            {/* Target Beneficiaries */}
            <div className="p-4 border rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Target className="h-4 w-4" />
                <h3 className="font-semibold">Target Beneficiaries</h3>
              </div>
              <div className="flex flex-wrap gap-2">
                {Array.isArray(program.target_beneficiary) ? (
                  program.target_beneficiary.map((beneficiary, index) => (
                    <Badge key={index} variant="secondary">
                      {beneficiary}
                    </Badge>
                  ))
                ) : (
                  <Badge variant="secondary">{program.target_beneficiary}</Badge>
                )}
              </div>
            </div>

            <div className="p-4 border rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground text-center">
                Enrollment management and beneficiary details will be available in the Enrollments section
              </p>
            </div>
          </TabsContent>

          {/* Budget Tab */}
          <TabsContent value="budget" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Budget Allocated */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Budget Allocated</span>
                </div>
                <p className="text-2xl font-bold text-green-600">
                  ₱{program.budget_allocated?.toLocaleString() || '0'}
                </p>
              </div>

              {/* Budget Spent */}
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 text-muted-foreground mb-2">
                  <DollarSign className="h-4 w-4" />
                  <span className="text-sm font-medium">Budget Spent</span>
                </div>
                <p className="text-2xl font-bold text-orange-600">
                  ₱{program.budget_spent?.toLocaleString() || '0'}
                </p>
              </div>
            </div>

            {/* Budget Progress */}
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium">Budget Utilization</span>
                <span className="text-sm font-bold">{budgetUsage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all ${
                    budgetUsage > 90 ? 'bg-red-500' : budgetUsage > 70 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${budgetUsage}%` }}
                />
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-muted-foreground">
                  Remaining: ₱{remainingBudget?.toLocaleString()}
                </span>
                <span className="text-xs text-muted-foreground">
                  {budgetUsage > 90 ? '⚠️ Budget nearly exhausted' : 'On track'}
                </span>
              </div>
            </div>

            {/* Budget Breakdown */}
            {program.current_enrollment > 0 && (
              <div className="p-4 border rounded-lg">
                <h3 className="font-semibold mb-3">Budget Analysis</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Cost per Beneficiary</span>
                    <span className="font-medium">
                      ₱{Math.round(program.budget_allocated / program.current_enrollment).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Spent per Beneficiary</span>
                    <span className="font-medium">
                      ₱{Math.round(program.budget_spent / program.current_enrollment).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Details Tab */}
          <TabsContent value="details" className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Program ID</label>
                  <p className="text-sm font-mono mt-1">{program.id}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Program Type</label>
                  <p className="text-sm mt-1">
                    {programTypeLabels[program.program_type] || program.program_type}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Status</label>
                  <p className="text-sm mt-1">
                    <Badge className={statusColors[program.status]}>
                      {program.status}
                    </Badge>
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Coordinator</label>
                  <p className="text-sm mt-1">{program.coordinator || 'Not assigned'}</p>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Created At</label>
                  <p className="text-sm mt-1">{formatDate(program.created_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Last Updated</label>
                  <p className="text-sm mt-1">{formatDate(program.updated_at)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Duration</label>
                  <p className="text-sm mt-1">{program.duration_weeks} weeks</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Location</label>
                  <p className="text-sm mt-1">{program.location || 'Not specified'}</p>
                </div>
              </div>
            </div>

            {program.schedule && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4" />
                  <label className="text-sm font-medium">Schedule</label>
                </div>
                <p className="text-sm text-muted-foreground">{program.schedule}</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
