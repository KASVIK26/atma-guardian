import { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, ChevronLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { withAuth } from '../lib/withAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useNavigate } from 'react-router-dom';

interface TimeSlot {
  id: string;
  time: string; // "10:00 AM"
  endTime: string; // "11:00 AM"
}

interface TimetableCell {
  id: string;
  dayIndex: number;
  timeSlotIndex: number;
  courseId?: string;
  batches: string[];
  instructorIds: string[];
  roomId?: string;
  day_of_week?: number;
  start_time?: string;
  end_time?: string;
}

interface Course {
  id: string;
  code: string;
  name: string;
}

interface Instructor {
  id: string;
  code: string;
  name: string;
}

interface Room {
  id: string;
  room_number: string;
  room_name?: string;
  building?: { name: string };
}

// Weekdays only (Mon-Fri, no Sat/Sun)
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Generate time slots from 9 AM to 6 PM
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  let hour = 9;
  
  while (hour < 18) {
    const startHour = hour % 12 || 12;
    const endHour = (hour + 1) % 12 || 12;
    const startPeriod = hour < 12 ? 'AM' : 'PM';
    const endPeriod = (hour + 1) < 12 ? 'AM' : 'PM';
    
    slots.push({
      id: `slot-${hour}`,
      time: `${startHour}:00 ${startPeriod}`,
      endTime: `${endHour}:00 ${endPeriod}`
    });
    
    hour++;
  }
  
  return slots;
};

function TimetableManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<any>(null);
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  
  const [timetable, setTimetable] = useState<TimetableCell[]>([]);
  const [timeSlots] = useState<TimeSlot[]>(generateTimeSlots());
  const [selectedDay, setSelectedDay] = useState(0);
  const [selectedSlot, setSelectedSlot] = useState(0);
  
  const [editingCell, setEditingCell] = useState<TimetableCell | null>(null);
  const [cellForm, setCellForm] = useState({
    courseId: '',
    batches: [] as string[],
    instructorIds: [] as string[],
    roomId: ''
  });

  useEffect(() => {
    if (currentPage !== 'timetable') {
      setCurrentPage('timetable');
    }
    
    // Get sectionId from URL or state
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sectionId');
    if (id) {
      setSectionId(id);
      fetchTimetableData(id);
    } else {
      toast.error('No section selected');
      navigate('/sections');
    }
  }, [currentPage, setCurrentPage]);

  const fetchTimetableData = async (id: string, showLoading: boolean = true) => {
    try {
      if (showLoading) {
        setLoading(true);
      }
      
      // Fetch section details (identified by program_id, branch_id, semester_id)
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select('id, code, name, university_id, program_id, branch_id, semester_id, batches')
        .eq('id', id)
        .single();
      
      if (sectionError || !section) {
        console.error('Error fetching section:', sectionError);
        toast.error('Failed to load section data');
        return;
      }
      
      setSectionData(section);
      console.log('Section loaded:', { id: section.id, university_id: section.university_id, branch_id: section.branch_id, semester_id: section.semester_id });

      // Fetch courses filtered by program_id and branch_id
      const { data: universityCourses, error: coursesError } = await supabase
        .from('courses')
        .select('id, code, name')
        .eq('university_id', section.university_id)
        .eq('program_id', section.program_id)
        .eq('branch_id', section.branch_id)
        .order('code');
      
      if (coursesError) {
        console.error('Error fetching courses:', coursesError);
      }
      setCourses(universityCourses || []);

      // Fetch instructors from instructors table
      const { data: universityInstructors, error: instructorsError } = await supabase
        .from('instructors')
        .select('id, name, code, email')
        .eq('university_id', section.university_id)
        .eq('is_active', true)
        .order('name', { ascending: true });
      
      if (instructorsError) {
        console.error('Error fetching instructors:', instructorsError);
      }
      
      const transformedInstructors: Instructor[] = (universityInstructors || []).map(instr => ({
        id: instr.id,
        code: instr.code || instr.email || instr.id,
        name: instr.name
      }));
      setInstructors(transformedInstructors);

      // Fetch rooms for this university
      const { data: universityRoomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('id, room_number, room_name')
        .eq('university_id', section.university_id)
        .order('room_number');
      
      if (roomsError) {
        console.error('Error fetching rooms:', roomsError);
      }
      
      // Transform rooms data to match Room interface
      const transformedRooms: Room[] = (universityRoomsData || []).map(room => ({
        id: room.id,
        room_number: room.room_number,
        building: { name: room.room_name || room.room_number }
      }));
      setRooms(transformedRooms);

      // Fetch existing timetable entries
      const { data: timetableEntries, error: timetableError } = await supabase
        .from('timetables')
        .select('id, course_id, section_id, room_id, instructor_ids, day_of_week, start_time, end_time, is_active, batches')
        .eq('section_id', id);
      
      if (timetableError) {
        console.error('Error fetching timetable entries:', timetableError);
      }
      
      // Transform timetable entries to cell format
      if (timetableEntries && timetableEntries.length > 0) {
        console.log('Timetable entries fetched:', timetableEntries.length);
        
        const transformedCells = timetableEntries.map((entry, idx) => {
          // day_of_week is 0-4 (0=Monday, 4=Friday) from database
          // Use it directly as dayIndex since DAYS array is 0-indexed
          const dayIndex = entry.day_of_week;
          
          // Find the time slot index based on start_time
          // start_time format: "10:00:00" or "10:00"
          // timeSlots start at 9 AM (hour 9), so hour 9 = index 0, hour 10 = index 1, etc.
          const timeStr = entry.start_time;
          const [hoursStr] = timeStr.split(':');
          const hour = parseInt(hoursStr);
          const timeSlotIndex = hour - 9; // Slots start at 9 AM
          
          console.log(`Entry ${idx}: day=${dayIndex}, time=${timeSlotIndex}, course=${entry.course_id}, instructor_ids=${entry.instructor_ids?.length}, batches=${entry.batches}`);
          
          return {
            id: entry.id,
            dayIndex,
            timeSlotIndex,
            courseId: entry.course_id,
            batches: entry.batches || [],
            instructorIds: entry.instructor_ids || [],
            roomId: entry.room_id,
            day_of_week: entry.day_of_week,
            start_time: entry.start_time,
            end_time: entry.end_time,
            section_id: entry.section_id
          };
        });
        
        console.log('Transformed cells:', transformedCells);
        setTimetable(transformedCells);
      } else {
        console.log('No timetable entries found');
        setTimetable([]);
      }
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      toast.error('Failed to load timetable data');
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  const handleCellClick = (dayIndex: number, timeSlotIndex: number) => {
    if (!editMode) return;
    
    setSelectedDay(dayIndex);
    setSelectedSlot(timeSlotIndex);
    
    // Find existing cell data
    const existingCell = timetable.find(
      c => c.dayIndex === dayIndex && c.timeSlotIndex === timeSlotIndex
    );
    
    if (existingCell) {
      setEditingCell(existingCell);
      setCellForm({
        courseId: existingCell.courseId || '',
        batches: existingCell.batches || [],
        instructorIds: existingCell.instructorIds,
        roomId: existingCell.roomId || ''
      });
    } else {
      setEditingCell(null);
      setCellForm({
        courseId: '',
        batches: [],
        instructorIds: [],
        roomId: ''
      });
    }
  };

  const handleSaveCell = async () => {
    if (!cellForm.courseId || !cellForm.roomId || cellForm.instructorIds.length === 0) {
      toast.error('Please fill all required fields');
      return;
    }

    try {
      const slot = timeSlots[selectedSlot];
      const dayOfWeek = selectedDay; // Use 0-4 index directly (0=Monday, 4=Friday)
      
      // Convert 12-hour format to 24-hour format
      // e.g., "11:00 AM" -> 11, "1:00 PM" -> 13
      const convertTo24Hour = (timeStr: string) => {
        const hourMatch = timeStr.match(/^(\d+):/);
        const periodMatch = timeStr.match(/(AM|PM)$/i);
        let hour = parseInt(hourMatch ? hourMatch[1] : '10');
        const isPM = periodMatch && periodMatch[1].toUpperCase() === 'PM';
        
        if (isPM && hour !== 12) {
          hour += 12; // Convert PM hours (1 PM = 13, 2 PM = 14, etc.)
        } else if (!isPM && hour === 12) {
          hour = 0; // 12 AM = 00
        }
        
        return hour;
      };
      
      const startHour24 = convertTo24Hour(slot.time);
      const endHour24 = convertTo24Hour(slot.endTime);
      
      const startTimeFormatted = `${String(startHour24).padStart(2, '0')}:00:00`;
      const endTimeFormatted = `${String(endHour24).padStart(2, '0')}:00:00`;
      
      console.log('Time formatting:', { slotTime: slot.time, startHour24, startTimeFormatted, endTimeFormatted });
      
      if (editingCell && editingCell.id && !editingCell.id.startsWith('cell-')) {
        // Existing cell - update it
        console.log('Updating existing cell:', editingCell.id, { dayOfWeek, selectedDay });
        
        const { error } = await supabase
          .from('timetables')
          .update({
            course_id: cellForm.courseId,
            instructor_ids: cellForm.instructorIds || [],
            room_id: cellForm.roomId || null,
            day_of_week: dayOfWeek,
            start_time: startTimeFormatted,
            end_time: endTimeFormatted,
            batches: cellForm.batches || null
          })
          .eq('id', editingCell.id);
        
        if (error) throw error;
        toast.success('Cell updated successfully');
      } else {
        // New cell - insert
        console.log('Creating new cell:', { selectedDay, dayOfWeek, startTime: startTimeFormatted, courseId: cellForm.courseId });
        
        // Match the actual timetables schema:
        // id, university_id, course_id, section_id, room_id, instructor_ids[], day_of_week, start_time, end_time, is_active, batches
        const insertPayload = {
          university_id: sectionData?.university_id,
          course_id: cellForm.courseId,
          section_id: sectionId,
          room_id: cellForm.roomId || null,
          instructor_ids: cellForm.instructorIds || [],
          day_of_week: dayOfWeek,
          start_time: startTimeFormatted,
          end_time: endTimeFormatted,
          is_active: true,
          batches: cellForm.batches || null
        };
        
        console.log('=== DETAILED INSERT LOGGING ===');
        console.log('Payload object keys:', Object.keys(insertPayload));
        console.log('Payload values:', insertPayload);
        console.log('Section data:', sectionData);
        console.log('Cell form:', cellForm);
        console.log('Formatted time:', { startTimeFormatted, endTimeFormatted });
        
        // Verify no unexpected fields
        const validFields = ['university_id', 'course_id', 'section_id', 'room_id', 'instructor_ids', 'day_of_week', 'start_time', 'end_time', 'is_active', 'batches'];
        const payloadKeys = Object.keys(insertPayload);
        const invalidKeys = payloadKeys.filter(key => !validFields.includes(key));
        if (invalidKeys.length > 0) {
          console.error('❌ INVALID KEYS DETECTED:', invalidKeys);
          throw new Error(`Invalid payload keys: ${invalidKeys.join(', ')}`);
        }
        console.log('✅ All payload keys are valid');
        
        console.log('Insert payload:', insertPayload);
        
        // Insert without specifying columns to avoid Supabase validation issues
        console.log('Attempting insert...');
        const { error, data } = await supabase
          .from('timetables')
          .insert([insertPayload]);
        
        if (error) {
          console.error('❌ INSERT ERROR ❌');
          console.error('Error object:', error);
          console.error('Error code:', error.code);
          console.error('Error message:', error.message);
          console.error('Error details:', error.details);
          console.error('Error hint:', error.hint);
          
          // Additional debugging
          console.error('Error keys:', Object.keys(error));
          console.error('Error toString:', error.toString());
          
          // Check if error is related to semester_id
          if (error.message?.includes('semester_id')) {
            console.error('⚠️ ERROR IS ABOUT semester_id - this should not be in timetables table!');
            console.error('Check: database triggers, foreign keys, or RLS policies');
          }
          
          throw error;
        }
        
        console.log('✅ Insert successful!');
        console.log('Returned data:', data);
        toast.success('Cell created successfully');
      }

      // Clear the form FIRST to close the edit panel immediately
      setEditingCell(null);
      setCellForm({ courseId: '', batches: [], instructorIds: [], roomId: '' });
      setSelectedDay(-1);
      setSelectedSlot(-1);
      
      // Then reload timetable from database without showing loading state
      // Use a small delay to let state updates process first
      console.log('Reloading timetable data...');
      setTimeout(() => {
        fetchTimetableData(sectionId, false).then(() => {
          console.log('Reload complete');
        });
      }, 0);
    } catch (error) {
      console.error('Error saving cell:', error);
      toast.error('Failed to save cell to database');
    }
  };

  const handleDeleteCell = async (dayIndex: number, timeSlotIndex: number) => {
    try {
      const cell = timetable.find(
        c => c.dayIndex === dayIndex && c.timeSlotIndex === timeSlotIndex
      );
      
      if (cell && cell.id && !cell.id.startsWith('cell-')) {
        // Delete auto-generated lecture sessions first
        const { error: lectureError } = await supabase
          .from('lecture_sessions')
          .delete()
          .eq('timetable_id', cell.id);
        
        if (lectureError) {
          console.warn('Warning deleting lecture sessions:', lectureError);
          // Continue with timetable deletion even if lecture session deletion fails
        }

        // Delete from database
        const { error } = await supabase
          .from('timetables')
          .delete()
          .eq('id', cell.id);
        
        if (error) throw error;
      }
      
      // Update local state
      setTimetable(prev => 
        prev.filter(c => !(c.dayIndex === dayIndex && c.timeSlotIndex === timeSlotIndex))
      );
      toast.success('Cell deleted');
    } catch (error) {
      console.error('Error deleting cell:', error);
      toast.error('Failed to delete cell');
    }
  };

  const getCellContent = (dayIndex: number, timeSlotIndex: number) => {
    const slot = timeSlots[timeSlotIndex];
    
    // Convert slot time (e.g., "2:00 PM") to 24-hour format
    const convertSlotTimeTo24Hour = (timeStr: string) => {
      const hourMatch = timeStr.match(/^(\d+):/);
      const isPM = timeStr.match(/(PM)$/i);
      let hour = parseInt(hourMatch ? hourMatch[1] : '10');
      
      if (isPM && hour !== 12) {
        hour += 12; // 1 PM → 13, 2 PM → 14, etc.
      } else if (!isPM && hour === 12) {
        hour = 0; // 12 AM → 0
      }
      
      return hour;
    };
    
    const slotHour24 = convertSlotTimeTo24Hour(slot.time);
    
    // Find ALL cells matching this day and time slot
    const matchingCells = timetable.filter(c => {
      if (c.dayIndex !== dayIndex) return false;
      
      // Match time slot by converting start_time hour to number and comparing
      if (c.start_time) {
        const [cellHourStr] = c.start_time.split(':');
        const cellHour = parseInt(cellHourStr);
        console.log(`Matching cell: slot hour=${slotHour24}, cell hour=${cellHour}`);
        return cellHour === slotHour24;
      }
      
      return c.timeSlotIndex === timeSlotIndex;
    });
    
    if (matchingCells.length === 0) return null;

    // If multiple cells, show the first one (or you could combine them)
    const cell = matchingCells[0];
    
    const course = courses.find(c => c.id === cell.courseId);
    const roomData = rooms.find(r => r.id === cell.roomId);

    return {
      course,
      batches: cell.batches,
      instructors: cell.instructorIds
        .map(id => instructors.find(i => i.id === id))
        .filter(Boolean),
      room: roomData,
      cell,
      cellCount: matchingCells.length
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading timetable...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen dark bg-background flex">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        sidebarItems={sidebarItems}
      />
      
      <div className="flex-1 flex flex-col overflow-hidden">
        <Navbar showProfileMenu />
        
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-full mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/university')}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Back
                </Button>
                
                <div>
                  <h1 className="text-3xl font-bold">Timetable Management</h1>
                  {sectionData && (
                    <p className="text-muted-foreground mt-1">
                      Section {sectionData.code || sectionData.name}
                    </p>
                  )}
                </div>
              </div>
              
              <Button
                onClick={() => {
                  if (editingCell) {
                    // If currently editing, save first
                    handleSaveCell();
                  } else {
                    setEditMode(!editMode);
                  }
                }}
                variant={editMode ? 'destructive' : 'default'}
                className="gap-2"
              >
                {editingCell ? (
                  <>
                    <Save className="h-4 w-4" />
                    Save Edit
                  </>
                ) : editMode ? (
                  <>
                    <X className="h-4 w-4" />
                    Cancel Edit
                  </>
                ) : (
                  <>
                    <Edit2 className="h-4 w-4" />
                    Edit Timetable
                  </>
                )}
              </Button>
            </div>

            {/* Main Timetable */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle>Weekly Timetable</CardTitle>
                <CardDescription>
                  {editMode ? 'Click on cells to add or edit classes' : 'View mode - Classes scheduled'}
                </CardDescription>
              </CardHeader>
              
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full border-collapse text-xs">
                  {/* Header */}
                  <thead>
                    <tr className="border-b-2 border-border bg-gradient-to-r from-primary/20 to-primary/10">
                      <th className="text-center px-3 py-3 font-bold bg-primary/30 whitespace-nowrap w-20 text-sm border-r">Time</th>
                      {DAYS.map((day, idx) => (
                        <th key={idx} className="text-center px-2 py-3 font-bold bg-primary/20 flex-1 whitespace-nowrap text-sm border-r">
                          <div className="font-bold text-primary">{day}</div>
                          <div className="text-xs text-muted-foreground">{day.substring(0, 3)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  
                  {/* Body */}
                  <tbody>
                    {timeSlots.map((slot, slotIdx) => (
                      <tr key={slot.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                        {/* Time Column */}
                        <td className="px-3 py-3 font-mono text-sm bg-muted/30 font-semibold whitespace-nowrap w-20 border-r sticky left-0">
                          <div className="text-center leading-tight font-bold text-base">{slot.time.substring(0, slot.time.length - 3)}</div>
                          <div className="text-center text-xs leading-tight text-muted-foreground">{slot.endTime.substring(0, slot.endTime.length - 3)}</div>
                        </td>
                        
                        {/* Day Columns */}
                        {DAYS.map((_, dayIdx) => {
                          const cellContent = getCellContent(dayIdx, slotIdx);
                          const isSelected = selectedDay === dayIdx && selectedSlot === slotIdx;
                          
                          return (
                            <td
                              key={`${dayIdx}-${slotIdx}`}
                              onClick={() => handleCellClick(dayIdx, slotIdx)}
                              className={`px-2 py-2 border-r border-border cursor-pointer transition-all flex-1 align-top overflow-hidden min-h-32 ${
                                editMode ? 'hover:bg-primary/20' : ''
                              } ${
                                isSelected && editMode ? 'bg-primary/30 border-2 border-primary shadow-lg' : ''
                              } ${
                                cellContent ? 'bg-transparent' : 'bg-background hover:bg-muted/30'
                              }`}
                            >
                              {cellContent ? (
                                <div className="space-y-0.5 text-xs flex flex-col justify-center h-full text-center p-1.5">
                                  {/* Course ID - Bold */}
                                  <div className="font-bold text-white text-sm leading-tight">
                                    {cellContent.course?.code}
                                  </div>
                                  
                                  {/* Batches */}
                                  {cellContent.batches && cellContent.batches.length > 0 && (
                                    <div className="font-semibold text-foreground text-xs leading-tight">
                                      {cellContent.batches.join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Instructor Codes */}
                                  {cellContent.instructors && cellContent.instructors.length > 0 && (
                                    <div className="font-semibold text-foreground text-xs leading-tight">
                                      {cellContent.instructors.map(inst => inst?.code).join(', ')}
                                    </div>
                                  )}
                                  
                                  {/* Room Code */}
                                  {cellContent.room && (
                                    <div className="font-semibold text-foreground text-xs leading-tight">
                                      {cellContent.room?.room_number}
                                    </div>
                                  )}
                                  
                                  {/* Edit Delete Buttons */}
                                  {editMode && (
                                    <div className="flex gap-1 mt-2 pt-1 border-t border-border w-full">
                                      <Button
                                        size="sm"
                                        className="flex-1 h-6 text-xs py-0 bg-blue-600 hover:bg-blue-700 text-white font-bold"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCellClick(dayIdx, slotIdx);
                                        }}
                                      >
                                        Edit
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="flex-1 h-6 text-xs py-0 bg-red-600 hover:bg-red-700 text-white font-bold"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteCell(dayIdx, slotIdx);
                                        }}
                                      >
                                        Delete
                                      </Button>
                                    </div>
                                  )}
                                </div>
                              ) : editMode ? (
                                <div className="text-center text-muted-foreground text-lg py-6 h-full flex items-center justify-center font-bold">
                                  + Add Class
                                </div>
                              ) : null}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Edit Panel */}
            {editMode && selectedDay !== -1 && (
              <Card className="border-primary/50 bg-primary/5">
                <CardHeader>
                  <CardTitle className="text-base">
                    Edit Cell • {DAYS[selectedDay]} • {timeSlots[selectedSlot].time}
                  </CardTitle>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  {/* Course Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Course</label>
                    <Select value={cellForm.courseId} onValueChange={(val) => setCellForm({...cellForm, courseId: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select course" />
                      </SelectTrigger>
                      <SelectContent>
                        {courses.map(course => (
                          <SelectItem key={course.id} value={course.id}>
                            {course.code} - {course.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Batch Selector - Multiple */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Batches (Multiple)</label>
                    <Select value={cellForm.batches[0] || ''} onValueChange={(val) => {
                      if (cellForm.batches.includes(val)) {
                        setCellForm({...cellForm, batches: cellForm.batches.filter(b => b !== val)});
                      } else {
                        setCellForm({...cellForm, batches: [...cellForm.batches, val]});
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select batches (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {sectionData?.batches && sectionData.batches.length > 0 ? (
                          sectionData.batches.map((batchNum, idx) => {
                            const batchLabel = `${sectionData.code}${idx + 1}`;
                            return (
                              <SelectItem key={batchLabel} value={batchLabel}>
                                <div className="flex items-center gap-2">
                                  {cellForm.batches.includes(batchLabel) && <span className="text-primary">✓</span>}
                                  {batchLabel}
                                </div>
                              </SelectItem>
                            );
                          })
                        ) : (
                          <SelectItem value="default" disabled>
                            No batches defined
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                    {cellForm.batches.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {cellForm.batches.map(batch => (
                          <div key={batch} className="inline-flex items-center gap-1 bg-primary/10 px-2 py-1 rounded text-xs">
                            {batch}
                            <button
                              onClick={() => setCellForm({...cellForm, batches: cellForm.batches.filter(b => b !== batch)})}
                              className="ml-1 hover:text-red-500"
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Instructors Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Instructors (Multiple)</label>
                    <Select value={cellForm.instructorIds[0] || ''} onValueChange={(val) => {
                      if (cellForm.instructorIds.includes(val)) {
                        setCellForm({...cellForm, instructorIds: cellForm.instructorIds.filter(id => id !== val)});
                      } else {
                        setCellForm({...cellForm, instructorIds: [...cellForm.instructorIds, val]});
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select instructors" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors.map(inst => (
                          <SelectItem key={inst.id} value={inst.id}>
                            {inst.name} ({inst.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {cellForm.instructorIds.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {cellForm.instructorIds.map(id => {
                          const inst = instructors.find(i => i.id === id);
                          return (
                            <Badge key={id} variant="secondary">
                              {inst?.name}
                              <button onClick={() => setCellForm({...cellForm, instructorIds: cellForm.instructorIds.filter(i => i !== id)})} className="ml-1">
                                ✕
                              </button>
                            </Badge>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Room Selector */}
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Room</label>
                    <Select value={cellForm.roomId} onValueChange={(val) => setCellForm({...cellForm, roomId: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select room" />
                      </SelectTrigger>
                      <SelectContent>
                        {rooms.map(room => (
                          <SelectItem key={room.id} value={room.id}>
                            {room.room_number} - {room.room_name || 'No name'} ({room.building?.name})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Save/Cancel */}
                  <div className="flex gap-2 pt-4">
                    <Button onClick={handleSaveCell} className="flex-1 gap-2">
                      <Save className="h-4 w-4" />
                      {editingCell ? 'Save Changes' : 'Add Cell'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingCell(null);
                        setCellForm({ courseId: '', batches: [], instructorIds: [], roomId: '' });
                      }}
                      className="flex-1"
                    >
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(TimetableManagement);
