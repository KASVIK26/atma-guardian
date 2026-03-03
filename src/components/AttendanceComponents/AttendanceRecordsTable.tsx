import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { StudentAttendanceDropdown } from './StudentAttendanceDropdown';
import type { AttendanceRecordWithDetails, EnrolledStudent } from '@/hooks/useAttendanceRecords';
import { AlertCircle } from 'lucide-react';

interface AttendanceRecordsTableProps {
  courseName: string;
  courseCode?: string;
  records: AttendanceRecordWithDetails[];
  enrolledStudents: EnrolledStudent[];
  loading: boolean;
  error?: string | null;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'present':
      return 'bg-green-900 text-green-200 border-green-700';
    case 'absent':
      return 'bg-red-900 text-red-200 border-red-700';
    case 'late':
      return 'bg-yellow-900 text-yellow-200 border-yellow-700';
    case 'excused':
      return 'bg-blue-900 text-blue-200 border-blue-700';
    default:
      return 'bg-slate-700 text-slate-200';
  }
};

const getMarkingMethodColor = (method: string) => {
  switch (method) {
    case 'student_app':
      return 'bg-blue-900 text-blue-200 border-blue-700';
    case 'teacher_manual':
      return 'bg-purple-900 text-purple-200 border-purple-700';
    case 'admin_override':
      return 'bg-orange-900 text-orange-200 border-orange-700';
    case 'system_auto':
      return 'bg-gray-900 text-gray-200 border-gray-700';
    default:
      return 'bg-slate-700 text-slate-200';
  }
};

export const AttendanceRecordsTable: React.FC<AttendanceRecordsTableProps> = ({
  courseName,
  courseCode,
  records,
  enrolledStudents,
  loading,
  error,
}) => {
  if (error) {
    return (
      <Card className="bg-slate-900 border-slate-700 shadow-lg">
        <div className="p-6 flex items-center gap-4 text-red-400">
          <AlertCircle className="w-6 h-6" />
          <div>
            <p className="font-semibold">Error Loading Records</p>
            <p className="text-sm text-red-300">{error}</p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-100">{courseName}</h2>
          {courseCode && <p className="text-sm text-slate-400 mt-1">Code: {courseCode}</p>}
        </div>
      </div>

      {/* Summary Stats */}
      {!loading && enrolledStudents.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-800 border-slate-700 p-4">
            <p className="text-xs text-slate-400 uppercase mb-1">Total Enrolled</p>
            <p className="text-2xl font-bold text-slate-100">{enrolledStudents.length}</p>
          </Card>
          <Card className="bg-green-900 border-green-700 p-4">
            <p className="text-xs text-green-200 uppercase mb-1">Present</p>
            <p className="text-2xl font-bold text-green-100">
              {records.filter(r => r.attendance_status === 'present').length}
            </p>
          </Card>
          <Card className="bg-red-900 border-red-700 p-4">
            <p className="text-xs text-red-200 uppercase mb-1">Absent</p>
            <p className="text-2xl font-bold text-red-100">
              {records.filter(r => r.attendance_status === 'absent').length}
            </p>
          </Card>
          <Card className="bg-yellow-900 border-yellow-700 p-4">
            <p className="text-xs text-yellow-200 uppercase mb-1">Late</p>
            <p className="text-2xl font-bold text-yellow-100">
              {records.filter(r => r.attendance_status === 'late').length}
            </p>
          </Card>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <Card className="bg-slate-900 border-slate-700 shadow-lg p-4 space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-20 bg-slate-800" />
          ))}
        </Card>
      )}

      {/* Empty State */}
      {!loading && enrolledStudents.length === 0 && (
        <Card className="bg-slate-900 border-slate-700 shadow-lg">
          <div className="p-12 flex flex-col items-center justify-center text-slate-400">
            <AlertCircle className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-lg font-medium">No Students Enrolled</p>
            <p className="text-sm mt-1">
              No students are enrolled in this section.
            </p>
          </div>
        </Card>
      )}

      {/* Students List */}
      {!loading && enrolledStudents.length > 0 && (
        <div className="space-y-2">
          {enrolledStudents.map((student) => {
            // Find matching attendance record for this student
            const attendanceRecord = records.find(r => 
              (r.student?.id === student.id || r.student?.userId === student.userId)
            );

            return (
              <StudentAttendanceDropdown
                key={student.id}
                student={student}
                attendanceStatus={(attendanceRecord?.attendance_status as any) || 'absent'}
                markedAt={attendanceRecord?.marked_at}
                markingMethod={attendanceRecord?.marking_method}
                validationScore={attendanceRecord?.validation_score}
                isProxySuspected={attendanceRecord?.is_proxy_suspected}
                confidenceLevel={attendanceRecord?.confidence_level}
                overrideReason={attendanceRecord?.override_reason}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
