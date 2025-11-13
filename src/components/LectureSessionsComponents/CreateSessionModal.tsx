import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertCircle } from 'lucide-react';

interface CreateSessionModalProps {
  sectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface TimetableOption {
  id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  course_name: string;
  course_code: string;
  instructor_name: string;
}

const DAY_NAMES = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  sectionId,
  open,
  onOpenChange,
  onSuccess,
}) => {
  const [timetables, setTimetables] = useState<TimetableOption[]>([]);
  const [selectedTimetable, setSelectedTimetable] = useState<string>('');
  const [date, setDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSpecialClass, setIsSpecialClass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);

  // Fetch timetables for the section
  useEffect(() => {
    if (!open || !sectionId) return;

    const fetchTimetables = async () => {
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from('timetables')
          .select(`
            id,
            day_of_week,
            start_time,
            end_time,
            courses (course_name, course_code),
            users (full_name)
          `)
          .eq('section_id', sectionId)
          .eq('is_active', true);

        if (error) throw error;

        if (data) {
          const formatted = data.map((tt: any) => ({
            id: tt.id,
            day_of_week: tt.day_of_week,
            start_time: tt.start_time,
            end_time: tt.end_time,
            course_name: tt.courses?.course_name || 'Unknown',
            course_code: tt.courses?.course_code || 'N/A',
            instructor_name: tt.users?.full_name || 'Unknown',
          }));
          setTimetables(formatted);
        }
      } catch (err) {
        console.error('Error fetching timetables:', err);
        toast({
          title: 'Error',
          description: 'Failed to load timetables',
          variant: 'destructive',
        });
      } finally {
        setFetching(false);
      }
    };

    fetchTimetables();
  }, [open, sectionId]);

  const handleCreate = async () => {
    if (!selectedTimetable || !date) {
      toast({
        title: 'Validation Error',
        description: 'Please select both timetable and date',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const notesWithFlag = isSpecialClass
        ? `[SPECIAL CLASS] ${notes || ''}`
        : notes;

      console.log('📝 Creating lecture session...');
      const { data: newSession, error: insertError } = await supabase
        .from('lecture_sessions')
        .insert({
          timetable_id: selectedTimetable,
          scheduled_date: date,
          session_status: 'scheduled',
          notes: notesWithFlag || null,
          totp_refresh_interval: 30,
          otp_mode: 'dynamic', // Default to dynamic mode for auto-refresh
        })
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Lecture session created:', newSession?.id);

      // Generate TOTP code for this session
      if (newSession?.id) {
        try {
          console.log('🔑 Generating TOTP code for session:', newSession.id);
          const { data: totpResult, error: totpError } = await supabase.functions.invoke(
            'generate-totp-code',
            {
              body: {
                lecture_session_id: newSession.id,
                mode: 'dynamic',
              },
            }
          );

          if (totpError) {
            console.error('⚠️  Warning: Failed to generate TOTP code:', totpError);
            // Don't fail the whole operation if TOTP generation fails
            toast({
              title: 'Session Created',
              description: 'Lecture session created but TOTP generation had an issue',
              variant: 'default',
            });
          } else {
            console.log('✅ TOTP code generated successfully:', totpResult?.totp_code);
            toast({
              title: 'Success! 🎉',
              description: 'Lecture session created and TOTP code generated',
            });
          }
        } catch (totpErr) {
          console.error('⚠️  TOTP generation error:', totpErr);
          // Still show success for session creation
          toast({
            title: 'Session Created',
            description: 'Lecture session created. TOTP code will be generated on first access.',
          });
        }
      } else {
        toast({
          title: 'Success!',
          description: 'Lecture session created successfully',
        });
      }

      // Reset form
      setSelectedTimetable('');
      setDate('');
      setNotes('');
      setIsSpecialClass(false);

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('❌ Error creating session:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to create session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedTimetableData = timetables.find(t => t.id === selectedTimetable);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">Create New Lecture Session</DialogTitle>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Select Timetable */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Select Timetable Entry
              </label>
              <Select value={selectedTimetable} onValueChange={setSelectedTimetable}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-slate-100">
                  <SelectValue placeholder="Choose a timetable entry" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {timetables.length === 0 ? (
                    <SelectItem value="_empty" disabled>
                      No timetables available
                    </SelectItem>
                  ) : (
                    timetables.map(tt => (
                      <SelectItem key={tt.id} value={tt.id}>
                        <span className="text-slate-100">
                          {DAY_NAMES[tt.day_of_week]} {tt.start_time}-{tt.end_time} - {tt.course_code}
                        </span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Timetable Preview */}
            {selectedTimetableData && (
              <Card className="bg-slate-800 border-slate-700">
                <CardContent className="pt-6">
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-slate-500">Day</p>
                      <p className="text-slate-100 font-semibold">
                        {DAY_NAMES[selectedTimetableData.day_of_week]}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Time</p>
                      <p className="text-slate-100 font-semibold">
                        {selectedTimetableData.start_time} - {selectedTimetableData.end_time}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Course</p>
                      <p className="text-slate-100 font-semibold">
                        {selectedTimetableData.course_code} - {selectedTimetableData.course_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-500">Instructor</p>
                      <p className="text-slate-100 font-semibold">
                        {selectedTimetableData.instructor_name}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Select Date */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Scheduled Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 text-slate-100 rounded-lg focus:border-cyan-500 focus:outline-none"
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="block text-sm font-medium text-slate-300">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Add any notes or remarks about this session (e.g., makeup class, rescheduled, etc.)"
                className="bg-slate-800 border-slate-700 text-slate-100"
              />
            </div>

            {/* Special Class Checkbox */}
            <div className="flex items-center gap-3 p-3 bg-amber-950 border border-amber-700 rounded-lg">
              <Checkbox
                id="special-class"
                checked={isSpecialClass}
                onCheckedChange={(checked) => setIsSpecialClass(checked === true)}
                className="border-slate-600"
              />
              <label
                htmlFor="special-class"
                className="text-sm text-amber-100 cursor-pointer flex-1"
              >
                Mark as Special Class (Makeup/Remedial)
              </label>
            </div>

            {/* Info Alert */}
            <div className="flex gap-3 p-3 bg-blue-950 border border-blue-700 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-100">
                <p className="font-semibold mb-1">ℹ️ TOTP Code Generation</p>
                <p>A TOTP secret will be automatically generated for this session. The code will be available in the session details.</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="space-x-2">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-700"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            disabled={loading || !selectedTimetable || !date}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Session'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
