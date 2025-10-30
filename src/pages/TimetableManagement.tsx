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
}

interface Course {
  id: string;
  course_code: string;
  course_name: string;
  semester: number;
}

interface Instructor {
  id: string;
  full_name: string;
  instructor_code: string;
}

interface Room {
  id: string;
  room_number: string;
  room_name?: string;
  building?: { name: string };
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

// Generate time slots from 10 AM to 6 PM
const generateTimeSlots = (): TimeSlot[] => {
  const slots: TimeSlot[] = [];
  let hour = 10;
  
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

  const fetchTimetableData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch section details
      const { data: section } = await supabase
        .from('sections')
        .select('*, branches(name, code), years(academic_year, year_number)')
        .eq('id', id)
        .single();
      
      setSectionData(section);

      // Fetch courses for this section's branch and year
      const { data: branchCourses } = await supabase
        .from('courses')
        .select('*')
        .eq('branch_id', section.branch_id)
        .order('course_code');
      
      setCourses(branchCourses || []);

      // Fetch instructors for this branch
      const { data: branchInstructors } = await supabase
        .from('instructors')
        .select('id, full_name, instructor_code')
        .order('full_name');
      
      setInstructors(branchInstructors || []);

      // Fetch rooms
      const { data: allRooms } = await supabase
        .from('rooms')
        .select('*, building:buildings(name)')
        .order('room_number');
      
      setRooms(allRooms || []);

      // Fetch existing timetable entries
      const { data: timetableEntries } = await supabase
        .from('timetables')
        .select('*')
        .eq('section_id', id);
      
      // TODO: Transform timetable entries to cell format
      setTimetable(timetableEntries || []);
    } catch (error) {
      console.error('Error fetching timetable data:', error);
      toast.error('Failed to load timetable data');
    } finally {
      setLoading(false);
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
      const newCell: TimetableCell = {
        id: editingCell?.id || `cell-${Date.now()}`,
        dayIndex: selectedDay,
        timeSlotIndex: selectedSlot,
        courseId: cellForm.courseId,
        batches: cellForm.batches,
        instructorIds: cellForm.instructorIds,
        roomId: cellForm.roomId
      };

      if (editingCell) {
        // Update existing
        setTimetable(prev => prev.map(c => c.id === editingCell.id ? newCell : c));
        toast.success('Cell updated');
      } else {
        // Add new
        setTimetable(prev => [...prev, newCell]);
        toast.success('Cell added');
      }

      setEditingCell(null);
      setCellForm({ courseId: '', batches: [], instructorIds: [], roomId: '' });
    } catch (error) {
      console.error('Error saving cell:', error);
      toast.error('Failed to save cell');
    }
  };

  const handleDeleteCell = (dayIndex: number, timeSlotIndex: number) => {
    setTimetable(prev => 
      prev.filter(c => !(c.dayIndex === dayIndex && c.timeSlotIndex === timeSlotIndex))
    );
    toast.success('Cell deleted');
  };

  const getCellContent = (dayIndex: number, timeSlotIndex: number) => {
    const cell = timetable.find(
      c => c.dayIndex === dayIndex && c.timeSlotIndex === timeSlotIndex
    );
    
    if (!cell) return null;

    const course = courses.find(c => c.id === cell.courseId);
    const roomData = rooms.find(r => r.id === cell.roomId);

    return {
      course,
      batches: cell.batches,
      instructors: cell.instructorIds
        .map(id => instructors.find(i => i.id === id))
        .filter(Boolean),
      room: roomData,
      cell
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
                      {sectionData.branches.code} - Section {sectionData.name} • Year {sectionData.years.year_number} ({sectionData.years.academic_year})
                    </p>
                  )}
                </div>
              </div>
              
              <Button
                onClick={() => setEditMode(!editMode)}
                variant={editMode ? 'destructive' : 'default'}
                className="gap-2"
              >
                {editMode ? (
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
            <Card>
              <CardHeader>
                <CardTitle>Weekly Timetable</CardTitle>
                <CardDescription>
                  {editMode ? 'Click on cells to add or edit classes' : 'View mode - Classes scheduled'}
                </CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    {/* Header */}
                    <thead>
                      <tr className="border-b-2 border-border">
                        <th className="text-left px-4 py-3 font-semibold bg-muted/50 w-24">Time</th>
                        {DAYS.map((day, idx) => (
                          <th key={idx} className="text-center px-2 py-3 font-semibold bg-muted/50 min-w-[200px]">
                            {day}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    
                    {/* Body */}
                    <tbody>
                      {timeSlots.map((slot, slotIdx) => (
                        <tr key={slot.id} className="border-b border-border">
                          {/* Time Column */}
                          <td className="px-4 py-3 font-mono text-sm bg-muted/20 font-semibold">
                            <div className="text-center">{slot.time}</div>
                            <div className="text-center text-xs text-muted-foreground">to</div>
                            <div className="text-center">{slot.endTime}</div>
                          </td>
                          
                          {/* Day Columns */}
                          {DAYS.map((_, dayIdx) => {
                            const cellContent = getCellContent(dayIdx, slotIdx);
                            const isSelected = selectedDay === dayIdx && selectedSlot === slotIdx;
                            
                            return (
                              <td
                                key={`${dayIdx}-${slotIdx}`}
                                onClick={() => handleCellClick(dayIdx, slotIdx)}
                                className={`px-2 py-2 border-r border-border cursor-pointer transition-colors min-w-[200px] ${
                                  editMode ? 'hover:bg-primary/10' : ''
                                } ${
                                  isSelected && editMode ? 'bg-primary/20 border-2 border-primary' : ''
                                } ${
                                  cellContent ? 'bg-green-50/20' : 'bg-background'
                                }`}
                              >
                                {cellContent ? (
                                  <div className="space-y-1 text-xs">
                                    {/* Course */}
                                    <div className="font-semibold text-primary">
                                      {cellContent.course?.course_code}
                                    </div>
                                    
                                    {/* Batches */}
                                    {cellContent.batches && cellContent.batches.length > 0 && (
                                      <div className="text-muted-foreground">
                                        Batches: {cellContent.batches.join(', ')}
                                      </div>
                                    )}
                                    
                                    {/* Instructors */}
                                    <div className="space-y-0.5">
                                      {cellContent.instructors.map(inst => (
                                        <div key={inst?.id} className="text-muted-foreground">
                                          👨‍🏫 {inst?.full_name}
                                        </div>
                                      ))}
                                    </div>
                                    
                                    {/* Room */}
                                    <div className="text-muted-foreground">
                                      📍 {cellContent.room?.room_number}
                                    </div>
                                    
                                    {/* Edit Delete Buttons */}
                                    {editMode && (
                                      <div className="flex gap-1 mt-1 pt-1 border-t border-border/50">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          className="flex-1 h-6 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleCellClick(dayIdx, slotIdx);
                                          }}
                                        >
                                          Edit
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          className="flex-1 h-6 text-xs"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteCell(dayIdx, slotIdx);
                                          }}
                                        >
                                          Del
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                ) : editMode ? (
                                  <div className="text-center text-muted-foreground text-xs py-8">
                                    Click to add
                                  </div>
                                ) : null}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Edit Panel */}
            {editMode && editingCell !== undefined && (
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
                            {course.course_code} - {course.course_name}
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
                        {['A1', 'A2', 'B1', 'B2', 'C1', 'C2'].map(batch => (
                          <SelectItem key={batch} value={batch}>
                            <div className="flex items-center gap-2">
                              {cellForm.batches.includes(batch) && <span className="text-primary">✓</span>}
                              {batch}
                            </div>
                          </SelectItem>
                        ))}
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
                            {inst.full_name} ({inst.instructor_code})
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
                              {inst?.full_name}
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
                      Save Cell
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setEditingCell(null);
                        setCellForm({ courseId: '', batches: [], instructorIds: [], roomId: '' });
                      }}
                      className="flex-1"
                    >
                      Cancel
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
