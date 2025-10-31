import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { Calendar as CalendarIcon, Plus, Trash2, AlertCircle, Check, Edit, ChevronLeft, ChevronRight, X } from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface CalendarEvent {
  id: string;
  event_date: string;
  event_type: string;
  event_name: string;
  description?: string;
  created_at?: string;
}

function AcademicCalendar({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [semesterStart, setSemesterStart] = useState('');
  const [semesterEnd, setSemesterEnd] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedSemester, setSelectedSemester] = useState('1');
  const [years, setYears] = useState<any[]>([]);
  const [universityId, setUniversityId] = useState<string>('');
  const [semesters, setSemesters] = useState<any[]>([]);
  const [currentSemesterId, setCurrentSemesterId] = useState<string>('');
  const [isEditingDates, setIsEditingDates] = useState(false);
  const [editingHolidayId, setEditingHolidayId] = useState<string | null>(null);
  const [editingHolidayName, setEditingHolidayName] = useState('');
  const [isAddingHoliday, setIsAddingHoliday] = useState(false);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');

  useEffect(() => {
    if (currentPage !== 'calendar') {
      setCurrentPage('calendar');
    }
    fetchUniversityAndYears();
  }, [currentPage, setCurrentPage]);

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      const academicYear = currentMonth < 6 
        ? `${currentYear - 1}-${currentYear}`
        : `${currentYear}-${currentYear + 1}`;
      
      const foundYear = years.find(y => y.academic_year === academicYear);
      if (foundYear) {
        setSelectedYear(foundYear.academic_year);
      } else {
        setSelectedYear(years[0]?.academic_year || '');
      }
      
      setSelectedSemester('1');
    }
  }, [years, selectedYear]);

  useEffect(() => {
    if (selectedYear && selectedSemester && universityId) {
      const num = parseInt(selectedSemester);
      const sem = semesters.find(s => s.academic_year === selectedYear && s.semester_number === num);
      if (sem) {
        setCurrentSemesterId(sem.id);
        setSemesterStart(sem.start_date);
        setSemesterEnd(sem.end_date);
        fetchEvents();
      }
    }
  }, [selectedYear, selectedSemester, semesters, universityId]);

  const fetchUniversityAndYears = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('university_id')
        .eq('id', user?.id)
        .single();

      if (userData) {
        setUniversityId(userData.university_id);

        const { data: yearsData } = await supabase
          .from('years')
          .select('id, academic_year, year_number')
          .eq('university_id', userData.university_id)
          .order('academic_year', { ascending: false });

        setYears(yearsData || []);

        const { data: semestersData } = await supabase
          .from('semesters')
          .select('*')
          .eq('university_id', userData.university_id)
          .order('academic_year', { ascending: false });

        setSemesters(semestersData || []);
      }
    } catch (error) {
      console.error('Error fetching university data:', error);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      if (!currentSemesterId) {
        setEvents([]);
        return;
      }

      const { data: eventsData, error } = await supabase
        .from('academic_calendar')
        .select('id, event_date, event_type, event_name, description')
        .eq('semester_id', currentSemesterId)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('Fetch events error:', error);
        toast.error('Failed to fetch events');
      }

      setEvents(eventsData || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to fetch calendar events');
    } finally {
      setLoading(false);
    }
  };

  const handleSetSemester = async () => {
    try {
      if (!semesterStart || !semesterEnd || !selectedYear) {
        toast.error('Please select semester dates and year');
        return;
      }

      const startDate = new Date(semesterStart);
      const endDate = new Date(semesterEnd);

      if (startDate >= endDate) {
        toast.error('End date must be after start date');
        return;
      }

      if (isEditingDates && currentSemesterId) {
        const { error } = await supabase
          .from('semesters')
          .update({
            start_date: semesterStart,
            end_date: semesterEnd,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentSemesterId);

        if (error) throw error;

        toast.success('Semester dates updated successfully!');
        setSemesterStart('');
        setSemesterEnd('');
        setDialogOpen(false);
        fetchUniversityAndYears();
        return;
      }

      const conflictingDates = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        const dayOfWeek = current.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

        if (!isWeekend) {
          // Convert to local date string for comparison
          const year = current.getFullYear();
          const month = String(current.getMonth() + 1).padStart(2, '0');
          const day = String(current.getDate()).padStart(2, '0');
          const currentDateStr = `${year}-${month}-${day}`;
          
          const existingEvent = events.find(e => e.event_date === currentDateStr);
          if (existingEvent) {
            conflictingDates.push({
              date: new Date(current),
              event: existingEvent
            });
          }
        }

        current.setDate(current.getDate() + 1);
      }

      if (conflictingDates.length > 0) {
        const toInsert = conflictingDates.map(item => {
          // Convert to local date string
          const year = item.date.getFullYear();
          const month = String(item.date.getMonth() + 1).padStart(2, '0');
          const day = String(item.date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          return {
            university_id: universityId,
            academic_year: selectedYear,
            event_date: dateStr,
            event_type: 'holiday',
            event_name: item.event.event_name,
            description: `Holiday conflicting with classes: ${item.event.description || ''}`
          };
        });

        const { error } = await supabase
          .from('academic_calendar')
          .insert(toInsert);

        if (error) throw error;

        toast.success(`Semester set. ${conflictingDates.length} conflicting holidays marked.`);
      } else {
        toast.success('Semester set. No conflicting holidays found.');
      }

      setSemesterStart('');
      setSemesterEnd('');
      setDialogOpen(false);
      fetchEvents();
    } catch (error) {
      console.error('Error setting semester:', error);
      toast.error('Failed to set semester');
    }
  };

  const handleMarkHoliday = async (date: Date) => {
    try {
      if (!universityId || !selectedYear) {
        toast.error('Please select semester and year first');
        return;
      }

      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      if (isWeekend) {
        toast.error('Cannot mark weekends as holidays');
        return;
      }

      // Convert to local date string (YYYY-MM-DD) without timezone conversion
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

      console.log('Checking for existing event:', { dateStr, events: events.map(e => e.event_date) });

      // Check if already marked
      const existingEvent = events.find(e => e.event_date === dateStr);
      if (existingEvent) {
        // Already exists - don't auto-insert, let user edit via table
        toast.info(`Holiday already marked for ${dateStr}`);
        return;
      }

      console.log('Setting new holiday form:', { dateStr, dayName });
      // Show form to add new holiday
      setNewHolidayDate(dateStr);
      setNewHolidayName(`Holiday - ${dayName}`);
      setIsAddingHoliday(true);
    } catch (error: any) {
      console.error('Error marking holiday:', error?.message || error);
      toast.error(error?.message || 'Failed to mark holiday');
    }
  };

  const handleAddHoliday = async () => {
    try {
      if (!newHolidayDate || !newHolidayName.trim()) {
        toast.error('Please enter holiday name and date');
        return;
      }

      if (!universityId) {
        toast.error('University ID not loaded');
        return;
      }

      if (!selectedYear) {
        toast.error('Academic year not selected');
        return;
      }

      const insertPayload = {
        university_id: universityId,
        semester_id: currentSemesterId,
        event_date: newHolidayDate,
        event_type: 'holiday',
        event_name: newHolidayName.trim(),
        description: `Holiday - ${newHolidayName.trim()}`
      };

      console.log('Adding holiday with payload:', insertPayload);

      // Insert without select to avoid RLS column enforcement
      const { data, error } = await supabase
        .from('academic_calendar')
        .insert([insertPayload], { count: 'exact' });

      console.log('Insert response - Data:', data);
      console.log('Insert response - Error:', error);

      if (error) {
        console.error('Insert failed:', error);
        
        // Try fetching to see if it actually inserted despite error
        setTimeout(() => fetchEvents(), 500);
        
        toast.error(`Error: ${error.message}`);
        return;
      }

      console.log('Holiday added successfully');
      toast.success('Holiday added successfully');
      setNewHolidayDate('');
      setNewHolidayName('');
      setIsAddingHoliday(false);
      fetchEvents();
    } catch (error: any) {
      console.error('Error adding holiday:', error?.message || error);
      toast.error(error?.message || 'Failed to add holiday');
    }
  };

  const handleCancelAdd = () => {
    setIsAddingHoliday(false);
    setNewHolidayDate('');
    setNewHolidayName('');
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('academic_calendar')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Event deleted');
      fetchEvents();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const handleUpdateEventName = async (eventId: string, newName: string) => {
    try {
      if (!newName.trim()) {
        toast.error('Holiday name cannot be empty');
        return;
      }

      const { error } = await supabase
        .from('academic_calendar')
        .update({ event_name: newName })
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Holiday name updated');
      setEditingHolidayId(null);
      setEditingHolidayName('');
      fetchEvents();
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update holiday');
    }
  };

  // Generate months that fall within semester date range
  const getSemesterMonths = () => {
    if (!semesterStart || !semesterEnd) return [];

    const start = new Date(semesterStart);
    const end = new Date(semesterEnd);
    const months = [];
    const current = new Date(start.getFullYear(), start.getMonth(), 1);

    while (current <= end) {
      months.push(new Date(current));
      current.setMonth(current.getMonth() + 1);
    }

    return months;
  };

  const generateCalendarDays = (date: Date) => {
    const days: any[] = [];
    const daysInMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
    const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).getDay();

    // Normalize dates to midnight for comparison
    const semStart = new Date(semesterStart);
    semStart.setHours(0, 0, 0, 0);
    const semEnd = new Date(semesterEnd);
    semEnd.setHours(23, 59, 59, 999);

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
      days.push(null);
    }

    // Days of month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateObj = new Date(date.getFullYear(), date.getMonth(), day);
      dateObj.setHours(0, 0, 0, 0);
      
      // Convert to local date string (YYYY-MM-DD) without timezone conversion
      const year = dateObj.getFullYear();
      const month = String(dateObj.getMonth() + 1).padStart(2, '0');
      const dayStr = String(dateObj.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayStr}`;
      
      const dayOfWeek = dateObj.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
      const event = events.find(e => e.event_date === dateStr);
      const isInSemester = dateObj >= semStart && dateObj <= semEnd;

      days.push({
        date: dateObj,
        dateStr,
        isHoliday: !!event,
        isWeekend,
        event,
        isInSemester
      });
    }

    return days;
  };

  const semesterMonths = getSemesterMonths();

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
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <PageHeader
              title="Academic Calendar"
              description="Manage academic events, holidays, and important dates"
              icon={<CalendarIcon />}
            />

            {/* Controls */}
            <Card>
              <CardHeader>
                <CardTitle>Calendar Setup</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Academic Year</Label>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {years.map(year => (
                          <SelectItem key={year.id} value={year.academic_year}>
                            {year.academic_year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold mb-2 block">Semester</Label>
                    <Select value={selectedSemester} onValueChange={setSelectedSemester}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Sem A (1, 3, 5, 7...)</SelectItem>
                        <SelectItem value="2">Sem B (2, 4, 6, 8...)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div></div>

                  <Button onClick={() => {
                    setIsEditingDates(false);
                    setDialogOpen(true);
                  }} className="gap-2 h-10 mt-auto">
                    {currentSemesterId ? (
                      <>
                        <Edit className="h-4 w-4" />
                        Edit Dates
                      </>
                    ) : (
                      <>
                        <Plus className="h-4 w-4" />
                        Set Semester Dates
                      </>
                    )}
                  </Button>
                </div>

                {/* Legend */}
                <div className="grid grid-cols-4 gap-3 pt-4 border-t">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-red-500/20 border border-red-500"></div>
                    <span>Weekend (Sat-Sun)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 bg-green-500/20 border border-green-500"></div>
                    <span>Public Holiday</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-xs font-semibold text-muted-foreground">•••</span>
                    <span>Non-semester dates (hidden)</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Click any weekday to mark holiday
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Semester-focused Calendar Grid */}
            {semesterMonths.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle>Semester Calendar ({semesterStart} to {semesterEnd})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-8 overflow-x-auto">
                    <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                      {semesterMonths.map((monthDate, idx) => {
                        const monthName = monthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
                        const calendarDays = generateCalendarDays(monthDate);

                        return (
                          <div key={idx} className="w-full">
                            <h3 className="text-sm font-semibold mb-4 text-center">{monthName}</h3>
                            <div className="grid grid-cols-7 gap-2">
                              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                                <div key={day} className="text-center text-xs font-semibold p-2 text-muted-foreground">
                                  {day}
                                </div>
                              ))}

                              {calendarDays.map((entry, idx) => {
                                if (!entry) {
                                  return <div key={`empty-${idx}`} className="aspect-square"></div>;
                                }

                                if (!entry.isInSemester) {
                                  return <div key={`outside-${idx}`} className="aspect-square"></div>;
                                }

                                return (
                                  <div
                                    key={entry.dateStr}
                                    onClick={() => !entry.isWeekend && handleMarkHoliday(entry.date)}
                                    className={`
                                      aspect-square p-2 rounded-lg border text-xs font-medium cursor-pointer
                                      transition-all duration-200 flex items-center justify-center
                                      ${entry.isWeekend ? 'bg-red-500/10 border-red-500 text-muted-foreground cursor-not-allowed' : ''}
                                      ${entry.isHoliday && !entry.isWeekend ? 'bg-green-500/30 border-green-500 text-green-700 dark:text-green-300 font-bold' : ''}
                                      ${entry.isHoliday && entry.isWeekend ? 'bg-red-500/20 border-red-500' : ''}
                                      ${entry && !entry.isHoliday && !entry.isWeekend ? 'border-muted hover:bg-muted/50' : ''}
                                    `}
                                    title={entry.event?.event_name || ''}
                                  >
                                    {entry.date.getDate()}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-8">
                  <p className="text-center text-muted-foreground">Please set semester dates to view calendar</p>
                </CardContent>
              </Card>
            )}

            {/* Holidays Table */}
            <Card>
              <CardHeader>
                <CardTitle>Public Holidays ({events.length})</CardTitle>
                <CardDescription>Click on a calendar date to add, or manage holidays in the table below</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Day</TableHead>
                        <TableHead>Holiday Name</TableHead>
                        <TableHead className="w-32">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Add New Holiday Row */}
                      {isAddingHoliday && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell>
                            <input
                              type="date"
                              value={newHolidayDate}
                              onChange={(e) => setNewHolidayDate(e.target.value)}
                              className="px-2 py-1 border rounded text-sm bg-background w-full"
                            />
                          </TableCell>
                          <TableCell>
                            {newHolidayDate ? new Date(newHolidayDate).toLocaleDateString('en-US', { weekday: 'long' }).split(',')[0] : '-'}
                          </TableCell>
                          <TableCell>
                            <input
                              type="text"
                              value={newHolidayName}
                              onChange={(e) => setNewHolidayName(e.target.value)}
                              placeholder="Enter holiday name"
                              className="px-2 py-1 border rounded text-sm bg-background w-full"
                              autoFocus
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                onClick={handleAddHoliday}
                                className="bg-green-600 hover:bg-green-700"
                              >
                                <Check className="h-4 w-4 mr-1" />
                                Add
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={handleCancelAdd}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Cancel
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )}

                      {/* Existing Holidays */}
                      {events.length === 0 && !isAddingHoliday ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                            No holidays marked yet. Click on a calendar date to add one.
                          </TableCell>
                        </TableRow>
                      ) : (
                        events.map(event => {
                          const eventDate = new Date(event.event_date);
                          const dayName = eventDate.toLocaleDateString('en-US', { weekday: 'long' });
                          const isEditing = editingHolidayId === event.id;

                          return (
                            <TableRow key={event.id} className="hover:bg-muted/50">
                              <TableCell className="font-medium">{event.event_date}</TableCell>
                              <TableCell>{dayName}</TableCell>
                              <TableCell>
                                {isEditing ? (
                                  <div className="flex gap-2">
                                    <input
                                      type="text"
                                      value={editingHolidayName}
                                      onChange={(e) => setEditingHolidayName(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                          handleUpdateEventName(event.id, editingHolidayName);
                                        } else if (e.key === 'Escape') {
                                          setEditingHolidayId(null);
                                        }
                                      }}
                                      className="px-2 py-1 border rounded text-sm flex-1 bg-background"
                                      autoFocus
                                    />
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleUpdateEventName(event.id, editingHolidayName)}
                                    >
                                      <Check className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => setEditingHolidayId(null)}
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div
                                    onClick={() => {
                                      setEditingHolidayId(event.id);
                                      setEditingHolidayName(event.event_name);
                                    }}
                                    className="cursor-pointer hover:underline"
                                  >
                                    {event.event_name}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                      setEditingHolidayId(event.id);
                                      setEditingHolidayName(event.event_name);
                                    }}
                                    disabled={isEditing}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteEvent(event.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Add Holiday Button */}
                {!isAddingHoliday && (
                  <Button
                    onClick={() => setIsAddingHoliday(true)}
                    className="mt-4 gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Add Holiday
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Semester Setup Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{isEditingDates ? 'Edit Semester Dates' : 'Set Semester Dates'}</DialogTitle>
            <DialogDescription>
              {isEditingDates 
                ? 'Update the start and end dates for this semester. System will automatically recalculate working days and class days.'
                : 'Select the start and end dates for this semester. Any holidays falling on weekdays (Mon-Fri) will be automatically marked.'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="start-date">Semester Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={semesterStart}
                onChange={(e) => setSemesterStart(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="end-date">Semester End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={semesterEnd}
                onChange={(e) => setSemesterEnd(e.target.value)}
              />
            </div>

            <div className="p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs text-muted-foreground mb-2">
                <Check className="h-4 w-4 inline mr-2 text-green-600" />
                {isEditingDates ? 'Dates will be updated in the system' : 'Automatically detects conflicting holidays on weekdays'}
              </p>
              <p className="text-xs text-muted-foreground">
                <AlertCircle className="h-4 w-4 inline mr-2 text-amber-500" />
                Weekends (Sat-Sun) are ignored
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setDialogOpen(false);
              setSemesterStart('');
              setSemesterEnd('');
              setIsEditingDates(false);
            }}>Cancel</Button>
            <Button onClick={handleSetSemester}>{isEditingDates ? 'Update Dates' : 'Set Semester'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(AcademicCalendar);
