import React, { useState } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { ChevronDown, Mail, Phone, UserCheck, Clock, AlertCircle } from 'lucide-react';
import { AttendanceStatus } from '@/types/database';
import { EnrolledStudent } from '@/hooks/useAttendanceRecords';
import { format, parseISO } from 'date-fns';

interface StudentAttendanceDropdownProps {
  student: EnrolledStudent;
  attendanceStatus: AttendanceStatus;
  markedAt?: string;
  markingMethod?: string;
  validationScore?: number;
  isProxySuspected?: boolean;
  confidenceLevel?: number;
  overrideReason?: string;
}

const getStatusColor = (status: AttendanceStatus) => {
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

const getStatusIcon = (status: AttendanceStatus) => {
  switch (status) {
    case 'present':
      return <UserCheck className="w-4 h-4" />;
    case 'late':
      return <Clock className="w-4 h-4" />;
    case 'absent':
      return <AlertCircle className="w-4 h-4" />;
    default:
      return null;
  }
};

export const StudentAttendanceDropdown: React.FC<StudentAttendanceDropdownProps> = ({
  student,
  attendanceStatus,
  markedAt,
  markingMethod,
  validationScore,
  isProxySuspected,
  confidenceLevel,
  overrideReason,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const fullName = `${student.firstName} ${student.lastName}`;
  const displayDate = markedAt ? format(parseISO(markedAt), 'MMM dd, yyyy hh:mm a') : 'Not marked';

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div className="mb-2">
        <CollapsibleTrigger asChild>
          <Card className="bg-slate-800 border-slate-700 cursor-pointer hover:bg-slate-750 transition-colors p-4">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-4 flex-1">
                {/* Student Avatar and Basic Info */}
                <div className="flex items-center gap-3">
                  {student.profilePictureUrl ? (
                    <img
                      src={student.profilePictureUrl}
                      alt={fullName}
                      className="w-12 h-12 rounded-full bg-slate-700 object-cover border border-slate-600"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-semibold border border-slate-600">
                      {student.firstName[0]}
                      {student.lastName[0]}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-100 truncate">{fullName}</h3>
                    <p className="text-xs text-slate-400">{student.enrollmentId || 'No Enrollment ID'}</p>
                  </div>
                </div>
              </div>

              {/* Attendance Status and Badge */}
              <div className="flex items-center gap-3">
                <div className="text-right mr-2">
                  <Badge
                    className={`${getStatusColor(
                      attendanceStatus
                    )} border flex items-center gap-1.5`}
                  >
                    {getStatusIcon(attendanceStatus)}
                    {attendanceStatus.charAt(0).toUpperCase() + attendanceStatus.slice(1)}
                  </Badge>
                  {isProxySuspected && (
                    <Badge className="mt-1 bg-red-900 text-red-200 border-red-700 border text-xs">
                      Proxy Alert
                    </Badge>
                  )}
                </div>
                <ChevronDown
                  className="w-5 h-5 text-slate-400 transition-transform"
                  style={{
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                />
              </div>
            </div>
          </Card>
        </CollapsibleTrigger>

        {/* Expanded Details */}
        <CollapsibleContent>
          <Card className="bg-slate-750 border-slate-700 mt-2 p-4 space-y-4">
            {/* Contact Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4 border-b border-slate-700">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Email</p>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <p className="text-sm text-slate-200 truncate">{student.email}</p>
                </div>
              </div>
              {student.phone && (
                <div>
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Phone</p>
                  <div className="flex items-center gap-2">
                    <Phone className="w-4 h-4 text-slate-400" />
                    <p className="text-sm text-slate-200">{student.phone}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Details */}
            <div className="space-y-3 pb-4 border-b border-slate-700">
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Marked At</p>
                <p className="text-sm text-slate-100">{displayDate}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider mb-2">Marking Method</p>
                <Badge className="bg-slate-700 text-slate-200 border-slate-600 border text-xs">
                  {markingMethod ? markingMethod.replace(/_/g, ' ').toUpperCase() : 'Unknown'}
                </Badge>
              </div>
            </div>

            {/* Validation Metrics */}
            <div className="space-y-3">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">
                Validation Metrics
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {validationScore !== undefined && (
                  <div className="bg-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Validation Score</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-slate-100">
                        {validationScore.toFixed(1)}%
                      </span>
                      <div className="flex-1 bg-slate-600 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-blue-500 h-full"
                          style={{ width: `${validationScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {confidenceLevel !== undefined && (
                  <div className="bg-slate-700 rounded p-3">
                    <p className="text-xs text-slate-400 mb-1">Confidence Level</p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-lg font-semibold text-slate-100">
                        {(confidenceLevel * 100).toFixed(1)}%
                      </span>
                      <div className="flex-1 bg-slate-600 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-green-500 h-full"
                          style={{ width: `${confidenceLevel * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {overrideReason && (
                <div className="bg-amber-900 border border-amber-700 rounded p-3">
                  <p className="text-xs text-amber-200 uppercase tracking-wider mb-1">Override Reason</p>
                  <p className="text-sm text-amber-100">{overrideReason}</p>
                </div>
              )}
            </div>
          </Card>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};
