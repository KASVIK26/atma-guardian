import React, { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useHolidays } from '@/hooks/useLectureSessions';
import { format, addDays, isToday } from 'date-fns';
import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

interface DateSelectorProps {
  universityId: string;
  semesterId: string;
  onDateChange: (date: string) => void;
  selectedDate?: string;
  disabled?: boolean;
}

export const DateSelector: React.FC<DateSelectorProps> = ({
  universityId,
  semesterId,
  onDateChange,
  selectedDate,
  disabled = false,
}) => {
  const [showCalendar, setShowCalendar] = useState(false);
  const { holidays, isHoliday } = useHolidays(universityId, semesterId);

  const handleDateSelect = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    onDateChange(dateString);
    setShowCalendar(false);
  };

  const displayDate = selectedDate ? format(new Date(selectedDate), 'PPP') : 'Select a date';
  const isSelectedToday = selectedDate && isToday(new Date(selectedDate));

  // Disable holidays and past dates
  const isDateDisabled = (date: Date) => {
    const dateString = format(date, 'yyyy-MM-dd');
    return isHoliday(dateString) || date < new Date(new Date().setHours(0, 0, 0, 0));
  };

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-850 border-slate-700 shadow-lg">
      <CardHeader className="pb-3">
        <CardTitle className="text-base text-slate-100 flex items-center gap-2">
          <CalendarIcon className="w-5 h-5 text-cyan-400" />
          Date Selection
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Selected Date Display - Rounded */}
        <div className="p-3 bg-slate-900/60 border border-slate-700 rounded-xl">
          <div className="text-xs text-slate-400 mb-1 font-medium">Selected Date</div>
          <div className="flex items-center justify-between">
            <span className="text-slate-100 font-semibold text-sm">{displayDate}</span>
            {isSelectedToday && (
              <Badge variant="secondary" className="bg-cyan-900 text-cyan-200 text-xs">
                Today
              </Badge>
            )}
          </div>
        </div>

        {/* Calendar Toggle Button */}
        <Button
          onClick={() => setShowCalendar(!showCalendar)}
          disabled={disabled}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white text-sm py-2 rounded-lg"
        >
          {showCalendar ? 'Hide Calendar' : 'Show Calendar'}
        </Button>

        {/* Calendar */}
        {showCalendar && (
          <div className="space-y-3">
            <div className="bg-slate-900 border border-slate-700 rounded-xl p-4 flex justify-center overflow-x-auto">
              <Calendar
                mode="single"
                selected={selectedDate ? new Date(selectedDate) : undefined}
                onSelect={handleDateSelect}
                disabled={isDateDisabled}
                className="[&_.rdp]:text-slate-100 [&_.rdp-day_selected]:bg-cyan-600 [&_.rdp-day_today]:bg-blue-600 [&_.rdp-day_disabled]:text-slate-600 scale-90 origin-top"
              />
            </div>

            {/* Holiday Info */}
            {holidays.size > 0 && (
              <div className="p-3 bg-amber-950/30 border border-amber-700/30 rounded-lg flex gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-amber-100">
                  <div className="font-semibold mb-0.5">Note:</div>
                  <div>Grayed out dates are holidays or non-working days</div>
                </div>
              </div>
            )}

            {/* Quick Navigation */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(new Date())}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDateSelect(addDays(new Date(), 1))}
                className="border-slate-700 text-slate-300 hover:bg-slate-800"
              >
                Tomorrow
              </Button>
            </div>
          </div>
        )}

        {/* Info Box */}
        <div className="p-3 bg-slate-950/50 border border-slate-700/50 rounded-lg text-xs text-slate-300 space-y-1">
          <div className="font-semibold">Semester Calendar Information</div>
          <div>Total Holidays: <span className="text-slate-200 font-medium">{holidays.size}</span></div>
        </div>
      </CardContent>
    </Card>
  );
};
