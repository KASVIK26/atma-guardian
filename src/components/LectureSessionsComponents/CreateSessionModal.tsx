import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { Loader2, AlertCircle, Clock, BookOpen, Users, Info } from 'lucide-react';
import { LectureSession } from '@/types/database';

interface CreateSessionModalProps {
  sectionId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editingSession?: LectureSession | null;
}

interface CourseOption {
  id: string;
  code: string;
  name: string;
  type: string;
}

// Time options from 8 AM to 6 PM in 30-minute intervals
const TIME_OPTIONS = Array.from({ length: 21 }, (_, i) => {
  const hours = Math.floor(8 + i * 0.5);
  const minutes = (i % 2) === 0 ? '00' : '30';
  return `${String(hours).padStart(2, '0')}:${minutes}:00`;
});

export const CreateSessionModal: React.FC<CreateSessionModalProps> = ({
  sectionId,
  open,
  onOpenChange,
  onSuccess,
  editingSession = null,
}) => {
  // Form state
  const [formData, setFormData] = useState({
    selectedProgram: '',
    selectedBranch: '',
    selectedSemester: '',
    selectedSection: sectionId,
    selectedCourse: '',
    selectedRoom: '',
    selectedInstructors: [] as string[],
    sessionDate: '',
    startTime: '09:00:00',
    endTime: '10:00:00',
    isSpecialClass: true,
    totpRequired: true,
    isActive: true,
  });

  // Dropdown options state
  const [programs, setPrograms] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [semesters, setSemesters] = useState<any[]>([]);
  const [sections, setSections] = useState<any[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [instructors, setInstructors] = useState<any[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [selectedSectionData, setSelectedSectionData] = useState<any>(null);

  // Fetch user data and initial section info
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setFetching(true);
        const { data: { user: authUser } } = await supabase.auth.getUser();
        if (authUser) {
          const { data } = await supabase
            .from('users')
            .select('university_id')
            .eq('id', authUser.id)
            .single();
          if (data) setUserData(data);

          // Fetch programs for the university
          const { data: progData } = await supabase
            .from('programs')
            .select('id, code, name')
            .eq('university_id', data.university_id);
          if (progData) setPrograms(progData);

          // If editing, populate form from existing session
          if (editingSession) {
            console.log('📝 Loading session for editing:', editingSession.id);
            try {
              // Fetch timetable with all relationships if timetable_id exists
              let timetableData = editingSession.timetables as any;
              if (!timetableData && editingSession.timetable_id) {
                const { data: tt } = await supabase
                  .from('timetables')
                  .select('*, programs(*), branches(*), semesters(*), courses(*), rooms(*)')
                  .eq('id', editingSession.timetable_id)
                  .single();
                timetableData = tt;
              }

              // Get section data for the session
              const { data: sessionSection } = await supabase
                .from('sections')
                .select('id, name, program_id, branch_id, semester_id')
                .eq('id', editingSession.section_id)
                .single();

              const timetableStartTime = timetableData?.start_time || editingSession.start_time || '09:00:00';
              const timetableEndTime = timetableData?.end_time || editingSession.end_time || '10:00:00';
              const instructorIds = Array.isArray(editingSession.instructor_ids) 
                ? editingSession.instructor_ids 
                : (Array.isArray(timetableData?.instructor_ids) ? timetableData.instructor_ids : []);
              
              console.log('📋 Edit session data:', {
                program: timetableData?.programs?.id || sessionSection?.program_id,
                branch: timetableData?.branches?.id || sessionSection?.branch_id,
                semester: timetableData?.semesters?.id || sessionSection?.semester_id,
                section: sessionSection?.id,
                course: editingSession.course_id || timetableData?.course_id,
                room: editingSession.room_id || timetableData?.room_id,
                instructors: instructorIds,
              });

              setSelectedSectionData(sessionSection);
              setFormData(prev => ({
                ...prev,
                selectedProgram: timetableData?.programs?.id || sessionSection?.program_id || '',
                selectedBranch: timetableData?.branches?.id || sessionSection?.branch_id || '',
                selectedSemester: timetableData?.semesters?.id || sessionSection?.semester_id || '',
                selectedSection: editingSession.section_id || '',
                selectedCourse: editingSession.course_id || timetableData?.course_id || '',
                selectedRoom: editingSession.room_id || timetableData?.room_id || '',
                selectedInstructors: instructorIds,
                sessionDate: editingSession.session_date,
                startTime: timetableStartTime,
                endTime: timetableEndTime,
                totpRequired: editingSession.totp_required || true,
                isActive: !editingSession.is_cancelled,
              }));
            } catch (err) {
              console.error('Error loading edit session data:', err);
              toast({
                title: 'Error',
                description: 'Failed to load session data for editing',
                variant: 'destructive',
              });
            }
          } else {
            // Fetch current section details for creation
            const { data: sectionData } = await supabase
              .from('sections')
              .select('id, name, program_id, branch_id, semester_id')
              .eq('id', sectionId)
              .single();
            if (sectionData) {
              setSelectedSectionData(sectionData);
              setFormData(prev => ({
                ...prev,
                selectedProgram: sectionData.program_id,
                selectedBranch: sectionData.branch_id,
                selectedSemester: sectionData.semester_id,
              }));
            }
          }
        }
      } catch (err) {
        console.error('Error fetching initial data:', err);
        toast({
          title: 'Error',
          description: 'Failed to load form data',
          variant: 'destructive',
        });
      } finally {
        setFetching(false);
      }
    };

    if (open) {
      fetchInitialData();
    }
  }, [open, sectionId, editingSession]);

  // Fetch branches when program changes
  useEffect(() => {
    const fetchBranches = async () => {
      if (!formData.selectedProgram) {
        setBranches([]);
        return;
      }

      try {
        const { data } = await supabase
          .from('branches')
          .select('id, code, name')
          .eq('program_id', formData.selectedProgram);
        if (data) setBranches(data);
      } catch (err) {
        console.error('Error fetching branches:', err);
      }
    };

    fetchBranches();
  }, [formData.selectedProgram]);

  // Fetch semesters when program changes
  useEffect(() => {
    const fetchSemesters = async () => {
      if (!formData.selectedProgram) {
        setSemesters([]);
        return;
      }

      try {
        const { data } = await supabase
          .from('semesters')
          .select('id, name, academic_year')
          .eq('program_id', formData.selectedProgram);
        if (data) setSemesters(data);
      } catch (err) {
        console.error('Error fetching semesters:', err);
      }
    };

    fetchSemesters();
  }, [formData.selectedProgram]);

  // Fetch courses when program or branch changes
  useEffect(() => {
    const fetchCourses = async () => {
      if (!formData.selectedProgram) {
        setCourses([]);
        return;
      }

      try {
        // Courses are linked to program and branch, not semester
        // Filter by program_id (required) and optionally by branch_id
        console.log('Fetching courses with:', {
          program_id: formData.selectedProgram,
          branch_id: formData.selectedBranch,
        });

        let query = supabase
          .from('courses')
          .select('id, code, name, course_type, credit_hours')
          .eq('program_id', formData.selectedProgram);

        // If branch is selected, filter by branch as well
        if (formData.selectedBranch) {
          query = query.eq('branch_id', formData.selectedBranch);
        }

        const { data, error } = await query.order('code');

        if (error) {
          console.error('❌ Courses fetch error:', error);
          setCourses([]);
          return;
        }
        
        if (data) {
          console.log('✅ Courses fetched:', data.length);
          const transformed = data.map(course => ({
            id: course.id,
            code: course.code,
            name: course.name,
            type: course.course_type || 'lecture'
          }));
          setCourses(transformed);
        } else {
          setCourses([]);
        }
      } catch (err) {
        console.error('Error fetching courses:', err);
        setCourses([]);
      }
    };

    fetchCourses();
  }, [formData.selectedProgram, formData.selectedBranch]);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      if (!userData?.university_id) return;

      try {
        const { data } = await supabase
          .from('rooms')
          .select('id, room_number, capacity')
          .eq('university_id', userData.university_id);
        if (data) setRooms(data);
      } catch (err) {
        console.error('Error fetching rooms:', err);
      }
    };

    if (open && userData?.university_id) {
      fetchRooms();
    }
  }, [open, userData?.university_id]);

  // Fetch instructors by branch
  useEffect(() => {
    const fetchInstructors = async () => {
      if (!formData.selectedBranch) {
        setInstructors([]);
        return;
      }

      try {
        const { data } = await supabase
          .from('instructors')
          .select('id, code, name, email')
          .eq('branch_id', formData.selectedBranch)
          .order('name');
        
        if (data) {
          console.log('✅ Instructors fetched:', data.length);
          setInstructors(data);
        } else {
          setInstructors([]);
        }
      } catch (err) {
        console.error('Error fetching instructors:', err);
        setInstructors([]);
      }
    };

    fetchInstructors();
  }, [formData.selectedBranch]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!formData.selectedProgram) {
      toast({
        title: 'Validation Error',
        description: 'Please select a program',
        variant: 'destructive',
      });
      return false;
    }
    if (!formData.selectedBranch) {
      toast({
        title: 'Validation Error',
        description: 'Please select a branch',
        variant: 'destructive',
      });
      return false;
    }
    if (!formData.selectedSemester) {
      toast({
        title: 'Validation Error',
        description: 'Please select a semester',
        variant: 'destructive',
      });
      return false;
    }
    if (!formData.selectedCourse) {
      toast({
        title: 'Validation Error',
        description: 'Please select a course',
        variant: 'destructive',
      });
      return false;
    }
    if (!formData.selectedRoom) {
      toast({
        title: 'Validation Error',
        description: 'Please select a room',
        variant: 'destructive',
      });
      return false;
    }
    if (!formData.sessionDate) {
      toast({
        title: 'Validation Error',
        description: 'Please select a date',
        variant: 'destructive',
      });
      return false;
    }
    if (formData.startTime >= formData.endTime) {
      toast({
        title: 'Validation Error',
        description: 'Start time must be before end time',
        variant: 'destructive',
      });
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!validateForm()) return;

    setLoading(true);
    try {
      console.log('📝 Creating lecture session...', formData);

      const payload = {
        university_id: userData?.university_id,
        section_id: formData.selectedSection,
        course_id: formData.selectedCourse,
        room_id: formData.selectedRoom,
        timetable_id: null, // Special class - not from timetable
        session_date: formData.sessionDate,
        scheduled_start_time: formData.startTime,
        scheduled_end_time: formData.endTime,
        start_time: formData.startTime,
        end_time: formData.endTime,
        instructor_ids: formData.selectedInstructors,
        is_special_class: true, // Always true for special classes
        totp_required: formData.totpRequired, // TOTP requirement flag
        session_status: 'scheduled',
        is_active: formData.isActive,
        is_cancelled: false,
      };

      const { data: newSession, error: insertError } = await supabase
        .from('lecture_sessions')
        .insert(payload)
        .select()
        .single();

      if (insertError) throw insertError;

      console.log('✅ Lecture session created:', newSession?.id);

      toast({
        title: 'Success!',
        description: 'Lecture session created successfully',
      });

      // Reset form
      setFormData(prev => ({
        ...prev,
        selectedCourse: '',
        selectedRoom: '',
        selectedInstructors: [],
        sessionDate: '',
        startTime: '09:00:00',
        endTime: '10:00:00',
        isSpecialClass: true,
        totpRequired: true,
        isActive: true,
      }));

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

  const handleUpdate = async () => {
    if (!validateForm() || !editingSession) return;

    setLoading(true);
    try {
      console.log('📝 Updating lecture session...', editingSession.id);

      const payload = {
        course_id: formData.selectedCourse,
        room_id: formData.selectedRoom,
        session_date: formData.sessionDate,
        scheduled_start_time: formData.startTime,
        scheduled_end_time: formData.endTime,
        start_time: formData.startTime,
        end_time: formData.endTime,
        instructor_ids: formData.selectedInstructors,
        totp_required: formData.totpRequired,
        is_active: formData.isActive,
        is_cancelled: !formData.isActive,
      };

      const { error: updateError } = await supabase
        .from('lecture_sessions')
        .update(payload)
        .eq('id', editingSession.id);

      if (updateError) throw updateError;

      console.log('✅ Lecture session updated:', editingSession.id);

      toast({
        title: 'Success!',
        description: 'Lecture session updated successfully',
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      console.error('❌ Error updating session:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update session',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const selectedCourseData = courses.find(c => c.id === formData.selectedCourse);
  const selectedRoomData = rooms.find(r => r.id === formData.selectedRoom);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100 text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            {editingSession ? 'Edit Special Lecture Session' : 'Create Special Lecture Session'}
          </DialogTitle>
          <DialogDescription>
            {editingSession 
              ? 'Update the details of this special lecture session.'
              : 'Create a one-time lecture session outside of the regular timetable. Configure course, timing, and TOTP requirements.'}
          </DialogDescription>
        </DialogHeader>

        {fetching ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          </div>
        ) : (
          <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-4">
            {/* Academic Structure Section */}
            <div className="space-y-4 p-4 bg-slate-950/50 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4" />
                Academic Structure
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Program Select */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Program *
                  </label>
                  <Select
                    value={formData.selectedProgram}
                    onValueChange={(value) => handleInputChange('selectedProgram', value)}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {programs.map(prog => (
                        <SelectItem key={prog.id} value={prog.id}>
                          {prog.code} - {prog.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Select */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Branch *
                  </label>
                  <Select
                    value={formData.selectedBranch}
                    onValueChange={(value) => handleInputChange('selectedBranch', value)}
                    disabled={!formData.selectedProgram}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 disabled:opacity-50">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {branches.length === 0 ? (
                        <div className="p-2 text-center text-slate-400 text-sm">
                          Select program first
                        </div>
                      ) : (
                        branches.map(branch => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.code} - {branch.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Semester Select */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Semester *
                  </label>
                  <Select
                    value={formData.selectedSemester}
                    onValueChange={(value) => handleInputChange('selectedSemester', value)}
                    disabled={!formData.selectedProgram}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 disabled:opacity-50">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {semesters.length === 0 ? (
                        <div className="p-2 text-center text-slate-400 text-sm">
                          Select program first
                        </div>
                      ) : (
                        semesters.map(sem => (
                          <SelectItem key={sem.id} value={sem.id}>
                            {sem.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Section Select (Pre-filtered) */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Section *
                  </label>
                  <div className="px-3 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg">
                    <p className="font-medium">
                      {selectedSectionData?.name || 'Loading...'}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Pre-selected from main filter
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Course & Location Section */}
            <div className="space-y-4 p-4 bg-slate-950/50 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                Course & Location
              </h3>

              <div className="grid grid-cols-2 gap-4">
                {/* Course Select */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Course *
                  </label>
                  <Select
                    value={formData.selectedCourse}
                    onValueChange={(value) => handleInputChange('selectedCourse', value)}
                    disabled={!formData.selectedProgram}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 disabled:opacity-50">
                      <SelectValue placeholder="Select course" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {courses.length === 0 ? (
                        <div className="p-2 text-center text-slate-400 text-sm">
                          No courses available
                        </div>
                      ) : (
                        courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {/* Room Select */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Room *
                  </label>
                  <Select
                    value={formData.selectedRoom}
                    onValueChange={(value) => handleInputChange('selectedRoom', value)}
                    disabled={!formData.selectedProgram}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 disabled:opacity-50">
                      <SelectValue placeholder="Select room" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {rooms.map(room => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.room_number} (Cap: {room.capacity})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Course Preview */}
              {formData.selectedCourse && courses.find(c => c.id === formData.selectedCourse) && (
                <div className="p-3 bg-slate-950/50 rounded border border-slate-700/50">
                  <p className="text-xs text-slate-400 mb-2">Course Details</p>
                  <div className="space-y-1">
                    <p className="text-sm text-slate-100">
                      <span className="text-slate-400">Code:</span> {courses.find(c => c.id === formData.selectedCourse)?.code}
                    </p>
                    <p className="text-sm text-slate-100">
                      <span className="text-slate-400">Name:</span> {courses.find(c => c.id === formData.selectedCourse)?.name}
                    </p>
                  </div>
                </div>
              )}

              {/* Instructors Select */}
              <div className="space-y-2">
                <label className="block text-sm font-medium text-slate-300">
                  Instructors
                </label>
                <Select
                  value={formData.selectedInstructors?.[0] || ''}
                  onValueChange={(value) => {
                    if (value) {
                      const newInstructors = formData.selectedInstructors.includes(value)
                        ? formData.selectedInstructors.filter(id => id !== value)
                        : [...formData.selectedInstructors, value];
                      handleInputChange('selectedInstructors', newInstructors);
                    }
                  }}
                  disabled={!formData.selectedBranch}
                >
                  <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100 disabled:opacity-50">
                    <SelectValue placeholder="Select instructors" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {instructors.length === 0 ? (
                      <div className="p-2 text-center text-slate-400 text-sm">
                        No instructors available for this branch
                      </div>
                    ) : (
                      instructors.map(instructor => (
                        <SelectItem key={instructor.id} value={instructor.id}>
                          {instructor.code} - {instructor.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {formData.selectedInstructors.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {formData.selectedInstructors.map(instId => {
                      const inst = instructors.find(i => i.id === instId);
                      return inst ? (
                        <div
                          key={instId}
                          className="inline-flex items-center gap-2 px-3 py-1 bg-cyan-900/40 border border-cyan-600 rounded-full text-sm text-cyan-200"
                        >
                          {inst.code}
                          <button
                            onClick={() => handleInputChange('selectedInstructors', formData.selectedInstructors.filter(id => id !== instId))}
                            className="text-cyan-400 hover:text-cyan-300"
                          >
                            ×
                          </button>
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Schedule Section */}
            <div className="space-y-4 p-4 bg-slate-950/50 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                Schedule
              </h3>

              <div className="grid grid-cols-3 gap-4">
                {/* Date Select */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Date *
                  </label>
                  <input
                    type="date"
                    value={formData.sessionDate}
                    onChange={(e) => handleInputChange('sessionDate', e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-slate-100 rounded-lg focus:border-cyan-500 focus:outline-none"
                  />
                </div>

                {/* Start Time */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Start Time *
                  </label>
                  <Select
                    value={formData.startTime}
                    onValueChange={(value) => handleInputChange('startTime', value)}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>
                          {time.slice(0, 5)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* End Time */}
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    End Time *
                  </label>
                  <Select
                    value={formData.endTime}
                    onValueChange={(value) => handleInputChange('endTime', value)}
                  >
                    <SelectTrigger className="bg-slate-900 border-slate-600 text-slate-100">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {TIME_OPTIONS.map(time => (
                        <SelectItem key={time} value={time}>
                          {time.slice(0, 5)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Flags Section */}
            <div className="space-y-3 p-4 bg-slate-950/50 rounded-lg border border-slate-700/50">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4" />
                Session Flags
              </h3>

              <div className="space-y-3">
                {/* Special Class (Always true for this modal) */}
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded border border-slate-700/50">
                  <div className="w-5 h-5 bg-slate-600 rounded-sm flex items-center justify-center text-white text-xs">✓</div>
                  <label className="text-sm text-slate-100 flex-1">
                    <div className="font-medium text-slate-300">Special Class (Always Enabled)</div>
                    <div className="text-xs text-slate-400">This is a special/makeup class, not from regular timetable</div>
                  </label>
                </div>

                {/* TOTP Required */}
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded border border-slate-700/50">
                  <Checkbox
                    id="totp-required"
                    checked={formData.totpRequired}
                    onCheckedChange={(checked) =>
                      handleInputChange('totpRequired', checked === true)
                    }
                    className="border-slate-500"
                  />
                  <label
                    htmlFor="totp-required"
                    className="text-sm text-slate-100 cursor-pointer flex-1"
                  >
                    <div className="font-medium">TOTP Required</div>
                    <div className="text-xs text-slate-400">Require students to enter TOTP code for attendance</div>
                  </label>
                </div>

                {/* Is Active */}
                <div className="flex items-center gap-3 p-3 bg-slate-950/50 rounded border border-slate-700/50">
                  <Checkbox
                    id="is-active"
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      handleInputChange('isActive', checked === true)
                    }
                    className="border-slate-500"
                  />
                  <label
                    htmlFor="is-active"
                    className="text-sm text-slate-100 cursor-pointer flex-1"
                  >
                    <div className="font-medium">Active</div>
                    <div className="text-xs text-slate-400">Enable this session for attendance marking</div>
                  </label>
                </div>
              </div>
            </div>

            {/* Info Section */}
            <div className="flex gap-3 p-4 bg-slate-950/50 border border-slate-700/50 rounded-lg">
              <Info className="w-5 h-5 text-slate-400 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-slate-300">
                <p className="font-semibold mb-1">About Special Sessions</p>
                <p>This creates a lecture session independent of the timetable. Perfect for makeup classes, remedial sessions, and ad-hoc lectures. If TOTP is enabled, students will need to verify with TOTP code.</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="space-x-2 border-t border-slate-700 pt-4">
          <Button
            onClick={() => onOpenChange(false)}
            variant="outline"
            className="border-slate-600 text-slate-300 hover:bg-slate-800"
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            onClick={editingSession ? handleUpdate : handleCreate}
            disabled={
              loading ||
              !formData.selectedProgram ||
              !formData.selectedBranch ||
              !formData.selectedSemester ||
              !formData.selectedCourse ||
              !formData.sessionDate
            }
            className="bg-primary text-primary-foreground hover:bg-primary-dark hover:shadow-glow"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {editingSession ? 'Updating...' : 'Creating...'}
              </>
            ) : (
              editingSession ? 'Update Session' : 'Create Session'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
