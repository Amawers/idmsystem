/**
 * @file ProgramEnrollmentsPage.jsx
 * @description Program enrollments tracking page
 * @module pages/case-manager/ProgramEnrollmentsPage
 * 
 * Features:
 * - View all enrollments
 * - Track progress and attendance
 * - Filter by status and program
 * - Enrollment statistics
 */

import EnrollmentTable from "@/components/programs/EnrollmentTable";

/**
 * Program Enrollments Page Component
 * @returns {JSX.Element} Program enrollments page
 */
export default function ProgramEnrollmentsPage() {
  return (
    <div className="flex-1 space-y-4 md:px-8">
      {/* Page Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Program Enrollments</h2>
        <p className="text-muted-foreground text-md">
          Track case assignments and program participation
        </p>
      </div>

      {/* Enrollments Component */}
      <EnrollmentTable />
    </div>
  );
}
