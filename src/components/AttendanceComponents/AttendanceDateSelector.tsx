import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { format, parse } from 'date-fns';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface AttendanceDateSelectorProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const AttendanceDateSelector: React.FC<AttendanceDateSelectorProps> = ({
  selectedDate,
  onDateChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handlePreviousDay = () => {
    const current = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const previous = new Date(current);
    previous.setDate(previous.getDate() - 1);
    onDateChange(format(previous, 'yyyy-MM-dd'));
  };

  const handleNextDay = () => {
    const current = parse(selectedDate, 'yyyy-MM-dd', new Date());
    const next = new Date(current);
    next.setDate(next.getDate() + 1);
    onDateChange(format(next, 'yyyy-MM-dd'));
  };

  const handleOtherDate = (e: React.ChangeEvent<HTMLInputElement>) => {
    onDateChange(e.target.value);
    setIsOpen(false);
  };

  const displayDate = format(parse(selectedDate, 'yyyy-MM-dd', new Date()), 'MMM dd, yyyy');

  return (
    <Card className="bg-slate-900 border-slate-700 shadow-lg">
      <CardHeader>
        <CardTitle className="text-lg text-slate-100">Date Selection</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Current Date Display */}
        <div className="flex items-center justify-center p-3 bg-slate-800 rounded-lg border border-slate-700">
          <Calendar className="w-5 h-5 text-blue-400 mr-3" />
          <span className="text-slate-100 font-medium">{displayDate}</span>
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1 bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            onClick={handlePreviousDay}
          >
            ← Previous
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            onClick={handleNextDay}
          >
            Next →
          </Button>
        </div>

        {/* Custom Date Picker */}
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className="w-full bg-slate-800 border-slate-700 text-slate-100 hover:bg-slate-700"
            >
              Pick Date
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-full p-3 bg-slate-800 border-slate-700">
            <input
              type="date"
              value={selectedDate}
              onChange={handleOtherDate}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-slate-100"
            />
          </PopoverContent>
        </Popover>
      </CardContent>
    </Card>
  );
};
