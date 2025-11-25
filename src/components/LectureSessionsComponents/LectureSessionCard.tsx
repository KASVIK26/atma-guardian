import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Clock, MapPin, User, BookOpen, Star } from 'lucide-react';
import { LectureSession } from '@/types/database';

interface LectureSessionCardProps {
  session: LectureSession;
  onClick?: () => void;
  compact?: boolean;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-900/60 text-emerald-200 border border-emerald-700 hover:bg-emerald-900';
    case 'completed':
      return 'bg-amber-900/60 text-amber-200 border border-amber-700 hover:bg-amber-900';
    case 'cancelled':
      return 'bg-red-900/60 text-red-200 border border-red-700 hover:bg-red-900';
    case 'scheduled':
      return 'bg-blue-900/60 text-blue-200 border border-blue-700 hover:bg-blue-900';
    case 'rescheduled':
      return 'bg-purple-900/60 text-purple-200 border border-purple-700 hover:bg-purple-900';
    default:
      return 'bg-slate-800/60 text-slate-200 border border-slate-700 hover:bg-slate-800';
  }
};

const getStatusDot = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-500 animate-pulse';
    case 'scheduled':
      return 'bg-blue-500';
    case 'completed':
      return 'bg-amber-500';
    case 'cancelled':
      return 'bg-red-500';
    default:
      return 'bg-slate-500';
  }
};

const getStatusLabel = (status: string) => {
  return status.charAt(0).toUpperCase() + status.slice(1);
};

export const LectureSessionCard: React.FC<LectureSessionCardProps> = ({
  session,
  onClick,
  compact = false,
}) => {
  const timetable = session.timetables as any;
  const course = timetable?.courses as any;
  const room = timetable?.rooms as any;
  const instructors = Array.isArray(timetable?.users) ? timetable.users : (timetable?.users ? [timetable.users] : []);
  
  // For special classes, use direct session fields
  const isSpecialClass = session.is_special_class === true;
  const displayStartTime = timetable?.start_time || session.start_time || '';
  const displayEndTime = timetable?.end_time || session.end_time || '';
  const displayCourseCode = course?.course_code || course?.code || 'N/A';
  const displayCourseName = course?.course_name || course?.name || 'Special Class';
  const displayRoomNumber = room?.room_number || 'TBA';

  // Debug logging
  console.log('🎓 LectureSessionCard - Debug:', {
    session_id: session.id,
    is_special_class: isSpecialClass,
    has_timetable: !!timetable,
    course_code: displayCourseCode,
    start_time: displayStartTime,
    instructor_count: instructors.length,
    room: displayRoomNumber,
  });

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={`group p-3 rounded-lg cursor-pointer transition-all duration-300 border backdrop-blur-sm ${getStatusColor(!session.is_cancelled)}`}
      >
        <div className="space-y-2">
          {/* Header with Status Dot */}
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getStatusDot(!session.is_cancelled)}`}></div>
              <div className="font-semibold text-sm truncate text-slate-100">
                {displayCourseCode}
              </div>
            </div>
            {isSpecialClass && (
              <Star className="w-3 h-3 text-amber-400 flex-shrink-0 fill-amber-400" />
            )}
          </div>

          {/* Course Name */}
          <div className="text-xs text-slate-300 truncate leading-tight">
            {displayCourseName}
          </div>

          {/* Time */}
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Clock className="w-3 h-3 text-slate-500 flex-shrink-0" />
            <span className="truncate">{displayStartTime} - {displayEndTime}</span>
          </div>

          {/* Room */}
          {displayRoomNumber && displayRoomNumber !== 'TBA' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <MapPin className="w-3 h-3 text-slate-500 flex-shrink-0" />
              <span className="truncate">{displayRoomNumber}</span>
            </div>
          )}

          {/* Instructor(s) with Code */}
          {instructors.length > 0 && (
            <div className="flex flex-wrap items-start gap-1.5">
              {instructors.map((inst: any, idx: number) => (
                <div key={inst.id || idx} className="flex items-center gap-1.5 text-xs">
                  <User className="w-3 h-3 text-emerald-400 flex-shrink-0" />
                  <div className="flex items-center gap-1 min-w-0">
                    {(inst as any).code && (
                      <span className="font-mono text-emerald-300 truncate">({(inst as any).code})</span>
                    )}
                    <span className="text-slate-400 truncate">{inst.name || inst.full_name}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Attendance Badge */}
          {!session.is_cancelled && (
            <div className="inline-block">
              <Badge className="text-xs bg-green-700 text-green-100 border-green-600">
                Active Session
              </Badge>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Full card view (in modal)
  return (
    <Card
      onClick={onClick}
      className={`p-5 rounded-lg cursor-pointer transition-all duration-300 border backdrop-blur-sm ${getStatusColor(!session.is_cancelled)}`}
    >
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className={`p-2.5 rounded-lg flex-shrink-0 ${
              !session.is_cancelled
                ? 'bg-emerald-900/40 text-emerald-400' 
                : 'bg-red-900/40 text-red-400'
            }`}>
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-slate-100 truncate text-lg">{course?.course_name}</h3>
              <p className="text-sm text-slate-400 mt-0.5">{course?.course_code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isSpecialClass && (
              <div title="Special Class">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400 flex-shrink-0" />
              </div>
            )}
            <Badge className={`text-xs whitespace-nowrap border ${getStatusColor(!session.is_cancelled)}`}>
              {session.is_cancelled ? 'Cancelled' : session.is_special_class ? 'Special Class' : 'Active'}
            </Badge>
          </div>
        </div>

        {/* Details Grid */}
        <div className="space-y-3 pt-2 border-t border-slate-700/50">
          {/* Time */}
          <div className="flex items-start gap-3">
            <Clock className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs text-slate-500">Time</div>
              <div className="font-semibold text-slate-100">
                {timetable?.start_time} - {timetable?.end_time}
              </div>
            </div>
          </div>

          {/* Room */}
          {room && (
            <div className="flex items-start gap-3">
              <MapPin className="w-4 h-4 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <div className="text-xs text-slate-500">Room</div>
                <div className="font-semibold text-slate-100">{room.room_number}</div>
              </div>
            </div>
          )}

          {/* Instructor(s) */}
          {instructors.length > 0 && (
            <div className="flex items-start gap-3">
              <User className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="text-xs text-slate-500">Instructor{instructors.length > 1 ? 's' : ''}</div>
                <div className="space-y-2 mt-2">
                  {instructors.map((inst: any, idx: number) => (
                    <div key={inst.id || idx} className="flex items-center gap-2">
                      {(inst as any).code && (
                        <span className="text-xs font-mono bg-emerald-900/40 text-emerald-300 px-2 py-1 rounded border border-emerald-700/50">
                          {(inst as any).code}
                        </span>
                      )}
                      <span className="font-semibold text-slate-100">{inst.name || inst.full_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Attendance Info */}
        {session.attendance_open && (
          <div className="pt-3 border-t border-slate-700/50">
            <Badge className="bg-emerald-900/60 text-emerald-200 border border-emerald-700">
              ✓ Attendance Open
            </Badge>
          </div>
        )}
      </div>
    </Card>
  );
};
