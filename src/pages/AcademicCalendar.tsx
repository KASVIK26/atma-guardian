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
  const [selectedSemester, setSelectedSemester] = useState(''); // Now stores semester ID, not number
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
  const [newHolidayEventType, setNewHolidayEventType] = useState('holiday');
  const [newHolidayDescription, setNewHolidayDescription] = useState('');
  const [isHolidayModalOpen, setIsHolidayModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0); // Force refresh trigger
  const [selectedDateStart, setSelectedDateStart] = useState<string | null>(null); // For date range selection
  const [selectedDateEnd, setSelectedDateEnd] = useState<string | null>(null); // For date range selection

  // Helper function to get semester label (Sem A for odd, Sem B for even)
  const getSemesterLabel = (semesterNumber: number): string => {
    return semesterNumber % 2 === 1 ? 'Sem A' : 'Sem B';
  };

  useEffect(() => {
    if (currentPage !== 'calendar') {
      setCurrentPage('calendar');
    }
    fetchUniversityAndYears();
  }, [currentPage, setCurrentPage]);

  useEffect(() => {
    if (years.length > 0 && !selectedYear) {
      console.log('📅 Setting default year and semester...');
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      
      const academicYear = currentMonth < 6 
        ? `${currentYear - 1}-${currentYear}`
        : `${currentYear}-${currentYear + 1}`;
      
      const foundYear = years.find(y => y.academic_year === academicYear);
      if (foundYear) {
        console.log('📅 Found current academic year:', foundYear.academic_year);
        setSelectedYear(foundYear.academic_year);
      } else {
        console.log('📅 Using first available year:', years[0]?.academic_year);
        setSelectedYear(years[0]?.academic_year || '');
      }
      
      console.log('📅 Default values set');
    }
  }, [years, selectedYear]);

  useEffect(() => {
    // Auto-select first semester of selected year if year changes
    if (selectedYear && semesters.length > 0 && !selectedSemester) {
      const semestersForYear = semesters.filter(s => s.academic_year === selectedYear);
      if (semestersForYear.length > 0) {
        // Sort by number to get first semester
        semestersForYear.sort((a, b) => a.number - b.number);
        console.log('📅 Auto-selecting first semester:', semestersForYear[0].id);
        setSelectedSemester(semestersForYear[0].id);
      }
    }
  }, [selectedYear, semesters, selectedSemester]);

  useEffect(() => {
    console.log('📅 Semester/Year changed:', { selectedYear, selectedSemester, universityId, semestersCount: semesters.length });
    
    if (selectedYear && selectedSemester && universityId && semesters.length > 0) {
      // selectedSemester now contains the semester ID directly
      const sem = semesters.find(s => s.id === selectedSemester);
      
      if (sem) {
        console.log('📅 Found semester:', { id: sem.id, start: sem.start_date, end: sem.end_date });
        setCurrentSemesterId(sem.id);
        setSemesterStart(sem.start_date);
        setSemesterEnd(sem.end_date);
        
        // Immediately fetch events with the semester ID
        fetchEventsForSemester(sem.id);
      } else {
        console.log('❌ Semester not found for ID:', selectedSemester);
      }
    } else {
      console.log('⏳ Waiting for required data...');
    }
  }, [selectedYear, selectedSemester, semesters, universityId, refreshTrigger]);

  const fetchUniversityAndYears = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('university_id')
        .single();

      if (userData) {
        setUniversityId(userData.university_id);

        // Fetch semesters to get unique academic_year values
        const { data: semestersData } = await supabase
          .from('semesters')
          .select('*')
          .eq('university_id', userData.university_id)
          .order('academic_year', { ascending: false });

        setSemesters(semestersData || []);

        // Extract unique academic_year values and format them for the years dropdown
        if (semestersData && semestersData.length > 0) {
          const uniqueYears = Array.from(
            new Map(
              semestersData.map(sem => [
                sem.academic_year,
                {
                  id: `year_${sem.academic_year}`,
                  academic_year: sem.academic_year,
                  year_number: 1
                }
              ])
            ).values()
          ).sort((a, b) => b.academic_year.localeCompare(a.academic_year));

          setYears(uniqueYears);
        } else {
          setYears([]);
        }
      }
    } catch (error) {
      console.error('Error fetching university data:', error);
    }
  };

  // New function: Fetch events for a specific semester ID
  const fetchEventsForSemester = async (semesterId: string) => {
    try {
      setLoading(true);
      
      // Force clear state before fetching new data
      setEvents([]);
      
      if (!semesterId) {
        console.log('⏳ No semester ID provided, skipping fetch');
        setLoading(false);
        return;
      }

      console.log('📅 Fetching events for semester ID:', semesterId);

      const { data: eventsData, error } = await supabase
        .from('academic_calendar')
        .select()
        .eq('semester_id', semesterId)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('❌ Fetch events error:', error);
        toast.error('Failed to fetch events');
        return;
      }

      console.log('✅ Events fetched:', eventsData?.length || 0, 'events');
      
      // Ensure state update with fresh data
      setEvents(eventsData || []);
    } catch (error) {
      console.error('❌ Error fetching events:', error);
      toast.error('Failed to fetch calendar events');
    } finally {
      setLoading(false);
    }
  };

  // Original function: Fetch events using currentSemesterId state
  const fetchEvents = async () => {
    try {
      setLoading(true);
      
      // Force clear state before fetching new data
      setEvents([]);
      
      if (!currentSemesterId) {
        return;
      }

      console.log('📅 Fetching events for semester:', currentSemesterId);

      const { data: eventsData, error } = await supabase
        .from('academic_calendar')
        .select()
        .eq('semester_id', currentSemesterId)
        .order('event_date', { ascending: true });

      if (error) {
        console.error('❌ Fetch events error:', error);
        toast.error('Failed to fetch events');
        return;
      }

      console.log('✅ Events fetched:', eventsData?.length || 0, 'events');
      
      // Ensure state update with fresh data
      setEvents(eventsData || []);
    } catch (error) {
      console.error('❌ Error fetching events:', error);
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
            semester_id: currentSemesterId,
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

      console.log('Date selection:', { dateStr, selectedDateStart, selectedDateEnd });

      // Check if already marked
      const existingEvent = events.find(e => e.event_date === dateStr);
      if (existingEvent) {
        toast.info(`Holiday already marked for ${dateStr}`);
        return;
      }

      // Smart date range selection logic
      if (!selectedDateStart) {
        // First tap - select start date (yellow)
        setSelectedDateStart(dateStr);
        console.log('First tap - date selected (yellow):', dateStr);
      } else if (dateStr === selectedDateStart && !selectedDateEnd) {
        // Second tap on same date - open modal with same date as start and end (green -> modal)
        console.log('Second tap on same date - opening modal:', dateStr);
        setSelectedDateEnd(dateStr); // Set end = start for single date
        setNewHolidayDate(dateStr);
        setNewHolidayName('');
        setNewHolidayEventType('holiday');
        setNewHolidayDescription('');
        setIsHolidayModalOpen(true);
      } else if (!selectedDateEnd) {
        // Tap on different date - select range end
        const startDate = new Date(selectedDateStart);
        const endDate = new Date(dateStr);
        
        if (endDate < startDate) {
          // If end is before start, swap them
          setSelectedDateEnd(selectedDateStart);
          setSelectedDateStart(dateStr);
          console.log('Range selected (reversed):', dateStr, '-', selectedDateStart);
        } else {
          setSelectedDateEnd(dateStr);
          console.log('Range selected:', selectedDateStart, '-', dateStr);
          // Open modal to confirm range
          setNewHolidayDate(selectedDateStart);
          setNewHolidayName('');
          setNewHolidayEventType('holiday');
          setNewHolidayDescription('');
          setIsHolidayModalOpen(true);
        }
      } else {
        // Range already selected - reset and start new selection
        setSelectedDateStart(dateStr);
        setSelectedDateEnd(null);
        console.log('Reset selection, new start date:', dateStr);
      }
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

      if (!currentSemesterId) {
        toast.error('Semester not selected');
        return;
      }

      // If date range is selected, add holiday for each date in range
      let datesToAdd: string[] = [];
      
      if (selectedDateStart && selectedDateEnd) {
        // Add for each date in range
        const startDate = new Date(selectedDateStart);
        const endDate = new Date(selectedDateEnd);
        const currentDate = new Date(startDate);
        
        while (currentDate <= endDate) {
          const year = currentDate.getFullYear();
          const month = String(currentDate.getMonth() + 1).padStart(2, '0');
          const day = String(currentDate.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${day}`;
          
          // Check if it's not a weekend
          const dayOfWeek = currentDate.getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          
          if (!isWeekend) {
            datesToAdd.push(dateStr);
          }
          
          currentDate.setDate(currentDate.getDate() + 1);
        }
      } else {
        datesToAdd = [newHolidayDate];
      }

      // Create insert payloads for all dates
      // For both single and range, insert individual rows with event_date only
      const insertPayloads = datesToAdd.map(dateStr => ({
        university_id: universityId,
        semester_id: currentSemesterId,
        event_date: dateStr,
        event_type: newHolidayEventType,
        event_name: newHolidayName.trim(),
        description: newHolidayDescription.trim() || newHolidayName.trim()
      }));

      console.log('📝 Adding holidays with payload:', insertPayloads);

      // Insert the holidays
      const { error, data } = await supabase
        .from('academic_calendar')
        .insert(insertPayloads)
        .select();

      if (error) {
        console.error('❌ Insert failed:', error);
        toast.error(`Error: ${error.message}`);
        return;
      }

      console.log('✅ Holidays added successfully:', data);
      
      // Clear form immediately
      setNewHolidayDate('');
      setNewHolidayName('');
      setNewHolidayEventType('holiday');
      setNewHolidayDescription('');
      setIsAddingHoliday(false);
      setIsHolidayModalOpen(false);
      setSelectedDateStart(null);
      setSelectedDateEnd(null);
      
      // Show success toast
      toast.success(`${datesToAdd.length} holiday(s) added successfully!`);
      
      // Force refresh with small delay to ensure DB has committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Increment refresh trigger to force component re-fetch
      setRefreshTrigger(prev => prev + 1);
      
      console.log('✅ Calendar refresh triggered');
    } catch (error: any) {
      console.error('❌ Error adding holiday:', error?.message || error);
      toast.error(error?.message || 'Failed to add holiday');
    }
  };

  const handleCancelAdd = () => {
    setIsAddingHoliday(false);
    setIsHolidayModalOpen(false);
    setNewHolidayDate('');
    setNewHolidayName('');
    setNewHolidayEventType('holiday');
    setNewHolidayDescription('');
    setSelectedDateStart(null);
    setSelectedDateEnd(null);
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('academic_calendar')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      toast.success('Event deleted');
      setRefreshTrigger(prev => prev + 1);
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
      setRefreshTrigger(prev => prev + 1);
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
                <CardTitle>Update Semester Dates</CardTitle>
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
                        {selectedYear && semesters.length > 0 && 
                          semesters
                            .filter(s => s.academic_year === selectedYear)
                            .sort((a, b) => a.number - b.number)
                            .map((sem) => (
                              <SelectItem key={sem.id} value={sem.id}>
                                {getSemesterLabel(sem.number)} ({sem.number}) - {sem.name}
                              </SelectItem>
                            ))
                        }
                      </SelectContent>
                    </Select>
                  </div>

                  <div></div>

                  <Button 
                    onClick={() => {
                      setIsEditingDates(false);
                      setDialogOpen(true);
                    }} 
                    disabled={!selectedSemester}
                    className="gap-2 h-10 mt-auto"
                  >
                    {currentSemesterId ? (
                      <>
                        <Edit className="h-4 w-4" />
                        Update Dates
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

                                // Check if date is in selected range
                                const isSelectedStart = entry.dateStr === selectedDateStart;
                                const isSelectedEnd = entry.dateStr === selectedDateEnd;
                                const isSingleDateSelected = selectedDateStart === selectedDateEnd && selectedDateStart === entry.dateStr;
                                const isInRange = selectedDateStart && selectedDateEnd && 
                                  new Date(entry.dateStr) >= new Date(selectedDateStart) && 
                                  new Date(entry.dateStr) <= new Date(selectedDateEnd) &&
                                  !entry.isWeekend;

                                return (
                                  <div
                                    key={entry.dateStr}
                                    onClick={() => !entry.isWeekend && handleMarkHoliday(entry.date)}
                                    className={`
                                      aspect-square p-2 rounded-lg border-2 text-xs font-medium cursor-pointer
                                      transition-all duration-200 flex items-center justify-center
                                      ${entry.isWeekend ? 'bg-red-500/10 border-red-500 text-muted-foreground cursor-not-allowed' : ''}
                                      ${entry.isHoliday && !entry.isWeekend ? 'bg-green-500/30 border-green-500 text-green-700 dark:text-green-300 font-bold' : ''}
                                      ${entry.isHoliday && entry.isWeekend ? 'bg-red-500/20 border-red-500' : ''}
                                      ${isSingleDateSelected ? 'border-green-500 bg-green-500/30 border-2 shadow-md' : ''}
                                      ${isSelectedStart && !isSingleDateSelected ? 'border-yellow-400 bg-yellow-400/20' : ''}
                                      ${isSelectedEnd && !isSingleDateSelected ? 'border-yellow-400 bg-yellow-400/20' : ''}
                                      ${isInRange && !isSelectedStart && !isSelectedEnd && !isSingleDateSelected ? 'border-yellow-300 bg-yellow-300/10' : ''}
                                      ${entry && !entry.isHoliday && !entry.isWeekend && !isSelectedStart && !isSelectedEnd && !isInRange && !isSingleDateSelected ? 'border-muted hover:bg-muted/50' : ''}
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
                      {/* Existing Holidays */}
                      {events.length === 0 ? (
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
                <Button
                  onClick={() => {
                    setNewHolidayDate('');
                    setNewHolidayName('');
                    setNewHolidayEventType('holiday');
                    setNewHolidayDescription('');
                    setIsHolidayModalOpen(true);
                  }}
                  className="mt-4 gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add Holiday
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Add Holiday Dialog */}
      <Dialog open={isHolidayModalOpen} onOpenChange={setIsHolidayModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Holiday</DialogTitle>
            <DialogDescription>
              {selectedDateStart && selectedDateEnd
                ? `Add holiday for date range: ${selectedDateStart} to ${selectedDateEnd}`
                : selectedDateStart
                ? `Add holiday for date: ${selectedDateStart}`
                : 'Enter holiday details'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Date Display */}
            {selectedDateStart && (
              <div className="p-3 rounded-lg bg-muted/50 border">
                <p className="text-xs font-semibold text-muted-foreground mb-1">Selected Date(s)</p>
                <p className="text-sm font-medium">
                  {selectedDateStart}
                  {selectedDateEnd && selectedDateEnd !== selectedDateStart && ` to ${selectedDateEnd}`}
                </p>
              </div>
            )}

            {/* Holiday Name */}
            <div>
              <Label htmlFor="holiday-name">Holiday Name <span className="text-red-500">*</span></Label>
              <Input
                id="holiday-name"
                value={newHolidayName}
                onChange={(e) => setNewHolidayName(e.target.value)}
                placeholder="e.g., Diwali, Christmas"
              />
            </div>

            {/* Event Type */}
            <div>
              <Label htmlFor="event-type">Event Type</Label>
              <Select value={newHolidayEventType} onValueChange={setNewHolidayEventType}>
                <SelectTrigger id="event-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="holiday">Holiday</SelectItem>
                  <SelectItem value="exam">Exam</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="holiday-desc">Description (Optional)</Label>
              <Input
                id="holiday-desc"
                value={newHolidayDescription}
                onChange={(e) => setNewHolidayDescription(e.target.value)}
                placeholder="Add any additional details"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCancelAdd}>
              Cancel
            </Button>
            <Button onClick={handleAddHoliday} className="bg-green-600 hover:bg-green-700">
              <Check className="h-4 w-4 mr-2" />
              Add Holiday
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
