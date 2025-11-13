import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { LectureSessionCard } from './LectureSessionCard';
import { LectureSession } from '@/types/database';

interface TimelineRowProps {
  hour: number;
  sessions: LectureSession[];
  onSessionClick: (session: LectureSession) => void;
  isCurrentHour?: boolean;
}

export const TimelineRow: React.FC<TimelineRowProps> = ({
  hour,
  sessions,
  onSessionClick,
  isCurrentHour = false,
}) => {
  const filteredSessions = sessions.filter(session => {
    const timetable = session.timetables as any;
    if (!timetable?.start_time) return false;
    
    const [startHour] = timetable.start_time.split(':').map(Number);
    const [endHour] = timetable.end_time?.split(':').map(Number) || [0];
    
    // Session occupies this hour if it starts before end of this hour and ends after start
    return startHour <= hour && endHour > hour;
  });

  // Format hour to 12-hour format
  const formatHour = (h: number) => {
    if (h === 0) return '12 AM';
    if (h < 12) return `${h} AM`;
    if (h === 12) return '12 PM';
    return `${h - 12} PM`;
  };

  return (
    <div
      className={`flex min-h-28 border-b transition-all duration-300 ${
        isCurrentHour
          ? 'bg-gradient-to-r from-blue-950/40 via-blue-900/20 to-transparent border-blue-600/50'
          : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900/70'
      }`}
    >
      {/* Time Label - Left Sidebar */}
      <div
        className={`flex-shrink-0 w-24 px-3 py-4 border-r font-mono text-sm flex flex-col items-center justify-center gap-1 ${
          isCurrentHour 
            ? 'text-blue-400 font-bold bg-blue-950/30 border-blue-600/50' 
            : 'text-slate-500 bg-slate-900/30 border-slate-700'
        }`}
      >
        <span className="text-lg font-bold">{formatHour(hour)}</span>
        <span className="text-xs text-slate-600">{String(hour + 1).padStart(2, '0')}:00</span>
        
        {/* Current time indicator dot */}
        {isCurrentHour && (
          <div className="mt-1 flex flex-col items-center gap-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            <div className="w-1 h-3 bg-gradient-to-b from-blue-400/80 to-blue-400/20"></div>
          </div>
        )}
      </div>

      {/* Sessions Horizontal Scroll */}
      {filteredSessions.length === 0 ? (
        <div className="flex-1 flex items-center justify-start px-6 text-slate-500 text-sm">
          <span className="text-slate-600">No sessions scheduled</span>
        </div>
      ) : (
        <ScrollArea className="flex-1">
          <div className="flex gap-3 px-6 py-4 pb-6">
            {filteredSessions.map(session => (
              <div
                key={session.id}
                className="flex-shrink-0 w-72 cursor-pointer hover:scale-105 transition-transform duration-200"
                onClick={() => onSessionClick(session)}
              >
                <LectureSessionCard session={session} compact={true} />
              </div>
            ))}
          </div>
          <div className="h-2" /> {/* Hidden scrollbar space */}
        </ScrollArea>
      )}

      {/* Current Time Indicator Line */}
      {isCurrentHour && (
        <div className="absolute left-24 right-0 top-0 h-0.5 bg-gradient-to-r from-blue-500 via-blue-400 to-transparent pointer-events-none"></div>
      )}
    </div>
  );
};
