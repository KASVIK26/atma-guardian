import React, { useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TimelineRow } from './TimelineRow';
import { LectureSession } from '@/types/database';
import { AlertCircle, Zap, Clock } from 'lucide-react';
import { format, getHours } from 'date-fns';

interface TimelineViewProps {
  sessions: LectureSession[];
  date?: string;
  onSessionClick: (session: LectureSession) => void;
  loading?: boolean;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  sessions,
  date,
  onSessionClick,
  loading = false,
}) => {
  // Debug log sessions
  useEffect(() => {
    if (sessions.length > 0) {
      console.log('🎯 TimelineView received sessions:', {
        count: sessions.length,
        firstSession: sessions[0],
        hasTimetable: !!sessions[0].timetables,
        hasScheduledTime: !!sessions[0].scheduled_start_time,
      });
    }
  }, [sessions]);
  const currentHour = useMemo(() => {
    const now = new Date();
    const selectedDate = date ? new Date(date) : now;
    
    // If selected date is today, show current hour
    const today = new Date();
    if (
      selectedDate.getFullYear() === today.getFullYear() &&
      selectedDate.getMonth() === today.getMonth() &&
      selectedDate.getDate() === today.getDate()
    ) {
      return getHours(now);
    }
    
    return -1; // No current hour if different date
  }, [date]);

  // Group sessions by time slots
  const groupedSessions = useMemo(() => {
    const grouped: { [key: number]: LectureSession[] } = {};
    
    // Initialize all working hours (8 AM to 6 PM)
    for (let hour = 8; hour < 18; hour++) {
      grouped[hour] = [];
    }

    // Add sessions to their respective hours
    sessions.forEach(session => {
      // Use scheduled_start_time from session, or fall back to timetable.start_time
      const startTimeStr = session.scheduled_start_time || (session.timetables as any)?.start_time;
      
      if (!startTimeStr) {
        console.warn('Session missing start time:', session.id);
        return;
      }

      try {
        const [startHour] = startTimeStr.split(':').map(Number);
        
        // Add to all hours the session spans
        if (startHour >= 8 && startHour < 18) {
          grouped[startHour].push(session);
        }
      } catch (e) {
        console.error('Error parsing session time:', startTimeStr, session.id);
      }
    });

    return grouped;
  }, [sessions]);

  const displayDate = date ? format(new Date(date), 'EEEE, MMMM d, yyyy') : 'Today';

  if (loading) {
    return (
      <Card className="bg-slate-900 border border-slate-700 shadow-xl">
        <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700">
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-400" />
            Timeline Loading...
          </CardTitle>
        </CardHeader>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Zap className="w-8 h-8 text-blue-400 animate-pulse" />
              <p className="text-slate-400">Loading lecture sessions...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const sessionCount = Object.values(groupedSessions).reduce((sum, arr) => sum + arr.length, 0);

  if (sessionCount === 0) {
    return (
      <Card className="bg-slate-900 border border-slate-700 shadow-xl overflow-hidden">
        <CardHeader className="bg-gradient-to-br from-slate-800 to-slate-900 border-b border-slate-700">
          <CardTitle className="text-slate-100 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            No Lectures Scheduled
          </CardTitle>
        </CardHeader>
        <CardContent className="p-12">
          <div className="text-center space-y-4">
            <Clock className="w-12 h-12 text-slate-600 mx-auto" />
            <div className="text-slate-400">
              <p className="text-lg font-medium">No lecture sessions available</p>
              <p className="text-sm mt-2">for {displayDate}</p>
              <p className="text-xs mt-3">Try selecting a different date or section</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-900 border border-slate-700 shadow-xl overflow-hidden flex flex-col h-[calc(100vh-220px)]">
      {/* Header with Date and Session Count */}
      <CardHeader className="bg-gradient-to-br from-slate-800 via-slate-850 to-slate-900 border-b border-slate-700 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-blue-400" />
            <div>
              <CardTitle className="text-slate-100 text-lg">{displayDate}</CardTitle>
              <p className="text-xs text-slate-500 mt-1">
                {sessionCount} session{sessionCount !== 1 ? 's' : ''} • 8 AM - 6 PM
              </p>
            </div>
          </div>
          {currentHour !== -1 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-full backdrop-blur-sm">
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-blue-300 font-medium">Live</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0 flex flex-col flex-1 overflow-hidden">
        {/* Status Legend */}
        <div className="bg-slate-850 border-b border-slate-700 px-6 py-3 flex gap-6 text-xs text-slate-400 overflow-x-auto flex-shrink-0">
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
            <span>Scheduled</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Active</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
            <span>Cancelled</span>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            <span>Rescheduled</span>
          </div>
        </div>

        {/* Timeline Container - Takes all available space */}
        <div className="relative overflow-y-auto flex-1 bg-gradient-to-b from-slate-900 to-slate-950">
          {Object.entries(groupedSessions).map(([hourStr, hourSessions]) => {
            const hour = parseInt(hourStr);
            const isCurrentHour = hour === currentHour;

            return (
              <TimelineRow
                key={hour}
                hour={hour}
                sessions={hourSessions}
                onSessionClick={onSessionClick}
                isCurrentHour={isCurrentHour}
              />
            );
          })}
        </div>

        {/* Footer Info - Sticky at bottom */}
        <div className="bg-slate-800/50 border-t border-slate-700 px-6 py-3 text-xs text-slate-400 space-y-1 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span>💡</span>
            <span>Scroll horizontally within each time slot to view all concurrent sessions</span>
          </div>
          <div className="flex items-center gap-2">
            <span>📌</span>
            <span>Click on any session to view details, TOTP, and mark attendance</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
