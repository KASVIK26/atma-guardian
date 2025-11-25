import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { parseFile, TimetableEntry, StudentEnrollment } from "@/lib/fileParser";
import { 
  School, 
  MapPin, 
  Phone, 
  Mail, 
  Globe, 
  Users, 
  GraduationCap, 
  Building2,
  Plus,
  Edit,
  Trash2,
  Upload,
  FileText,
  Calendar,
  CalendarIcon,
  BookOpen,
  Settings,
  BarChart3,
  CheckCircle,
  AlertCircle,
  Clock,
  Download,
  Eye,
  Zap,
  FolderOpen,
  ChevronDown,
  ChevronRight,
  Layers
} from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { supabase } from '../lib/supabase';
import { toast } from 'sonner';
import { 
  ACADEMIC_PROGRAMS, 
  PROGRAM_BRANCHES, 
  ACADEMIC_YEARS,
  getBranchesByProgramCode,
  getYearsByProgramDuration,
  type AcademicProgram,
  type ProgramBranch
} from '@/data/academicStructure';

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Generate academic year options for dropdown
 * Returns 4 years starting from current year
 * Format: YYYY-YY (e.g., 2025-26, 2026-27, 2027-28, 2028-29)
 */
function generateAcademicYears(): string[] {
  const currentYear = new Date().getFullYear();
  const years: string[] = [];
  
  for (let i = 0; i < 4; i++) {
    const year = currentYear + i;
    const nextYear = (year % 100) + 1;
    years.push(`${year}-${String(nextYear).padStart(2, '0')}`);
  }
  
  return years;
}

/**
 * Calculate total days in a date range (inclusive of both dates)
 * Includes all days (weekdays and weekends)
 */
function calculateTotalDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 to include both start and end dates
  return diffDays;
}

/**
 * Calculate working days (excluding weekends - Saturday and Sunday)
 * Works on the total days, not considering holidays yet
 */
function calculateWorkingDays(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let workingDays = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dayOfWeek = d.getDay();
    // Skip Saturday (6) and Sunday (0)
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      workingDays++;
    }
  }
  
  return workingDays;
}

/**
 * Calculate working days minus holidays
 * @param startDate - Semester start date
 * @param endDate - Semester end date
 * @param holidays - Array of holiday dates (from academic_calendar)
 */
function calculateWorkingDaysMinusHolidays(startDate: string, endDate: string, holidays: string[] = []): number {
  let workingDays = calculateWorkingDays(startDate, endDate);
  
  if (holidays && holidays.length > 0) {
    const holidayDates = new Set(
      holidays.map(h => new Date(h).toISOString().split('T')[0])
    );
    
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      const dateStr = d.toISOString().split('T')[0];
      
      // If this working day is a holiday, subtract it
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && holidayDates.has(dateStr)) {
        workingDays--;
      }
    }
  }
  
  return workingDays;
}

/**
 * Calculate class days based on timetable entries
 * Counts unique days of week where classes are scheduled (0=Sun, 1=Mon, ..., 6=Sat)
 * Then calculates how many times those days occur in the semester
 */
function calculateClassDays(startDate: string, endDate: string, timetableEntries: any[] = []): number {
  if (!timetableEntries || timetableEntries.length === 0) {
    return 0;
  }
  
  // Get unique days of week where classes are scheduled
  const scheduledDaysOfWeek = new Set<number>();
  timetableEntries.forEach(entry => {
    // Assuming timetable has a day_of_week field (0-6)
    // Or calculate from entry dates if available
    if (entry.day_of_week !== undefined) {
      scheduledDaysOfWeek.add(entry.day_of_week);
    }
  });
  
  // Count occurrences of scheduled days in the date range
  const start = new Date(startDate);
  const end = new Date(endDate);
  let classDays = 0;
  
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (scheduledDaysOfWeek.has(d.getDay())) {
      classDays++;
    }
  }
  
  return classDays;
}

/**
 * Calculate effective percentage
 * Effective % = (Class Days / Working Days) × 100
 */
function calculateEffectivePercentage(classDays: number, workingDays: number): string {
  if (workingDays === 0) return '0';
  return ((classDays / workingDays) * 100).toFixed(1);
}

/**
 * Get unique academic years from semesters
 * Used to populate academic year filter dropdown
 */
function getUniqueAcademicYears(semestersData: any[]): string[] {
  const years = new Set<string>();
  semestersData.forEach(sem => {
    if (sem.academic_year) {
      years.add(sem.academic_year);
    }
  });
  return Array.from(years).sort().reverse(); // Most recent first
}

/**
 * Get semesters by academic year
 * Filters and returns semesters for a specific academic year
 */
function getSemestersByYear(semestersData: any[], academicYear: string): any[] {
  return semestersData.filter(s => s.academic_year === academicYear);
}

/**
 * Generate semester numbers based on program duration
 * For 4-year program: 1-8 semesters
 * For 5-year program: 1-10 semesters
 * For 2-year program: 1-4 semesters
 * Logic: number % 2 === 1 → Odd semester (Sem A), number % 2 === 0 → Even semester (Sem B)
 */
function generateSemesterNumbers(durationYears: number): number[] {
  const maxSemesters = durationYears * 2; // 2 semesters per year
  return Array.from({ length: maxSemesters }, (_, i) => i + 1);
}

/**
 * Get semester label based on number
 * Odd numbers = Sem A, Even numbers = Sem B
 */
function getSemesterLabel(semesterNumber: number): string {
  return semesterNumber % 2 === 1 ? 'Sem A' : 'Sem B';
}

function University({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [university, setUniversity] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [branches, setBranches] = useState([]);
  const [years, setYears] = useState([]);
  const [courses, setCourses] = useState([]);
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [dialogType, setDialogType] = useState('');

  // Form states
  const [programForm, setProgramForm] = useState({
    name: '',
    code: '',
    duration_years: 4,
    program_type: 'undergraduate'
  });

  const [branchForm, setBranchForm] = useState({
    program_id: '',
    name: '',
    code: ''
  });

  const [yearForm, setYearForm] = useState({
    academic_year: '',
    year_number: 1
  });

  const [semesterForm, setSemesterForm] = useState({
    program_id: '',
    academic_year: '',
    name: '',
    number: 1,
    start_date: '',
    end_date: ''
  });

  const [semesters, setSemesters] = useState([]);
  const [semesterHolidays, setSemesterHolidays] = useState<Record<string, string[]>>({}); // semester_id -> array of event_dates

  const [courseForm, setCourseForm] = useState({
    program_id: '',
    branch_id: '',
    course_code: '',
    course_name: '',
    credits: 3,
    course_type: 'theory',
    description: '',
    is_active: true
  });

  const [sectionForm, setSectionForm] = useState({
    program_id: '',
    branch_id: '',
    semester_id: '',
    name: '',
    code: '',
    capacity: 150,
    batches: 1,
    is_active: true,
    timetable_file: null,
    enrollment_file: null
  });

  // State for collapsed/expanded sections in courses display
  const [expandedCoursePrograms, setExpandedCoursePrograms] = useState<Set<string>>(new Set());
  const [expandedCourseBranches, setExpandedCourseBranches] = useState<Set<string>>(new Set());

  // State for collapsed/expanded sections in sections display
  const [expandedSectionPrograms, setExpandedSectionPrograms] = useState<string[]>([]);
  const [expandedSectionBranches, setExpandedSectionBranches] = useState<string[]>([]);

  // File parsing states
  const [parsingStatus, setParsingStatus] = useState({
    timetable: { status: 'idle', progress: 0, errors: [], data: [] },
    enrollment: { status: 'idle', progress: 0, errors: [], data: [] }
  });

  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);

  useEffect(() => {
    // Ensure the current page is set to university when this component mounts
    if (currentPage !== 'university') {
      setCurrentPage('university');
    }
    fetchData();
  }, [currentPage, setCurrentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: user } = await supabase.auth.getUser();
      console.log('[fetchData] Auth user:', user?.user?.id);
      
      if (user?.user) {
        // Get user's university - RLS policy handles filtering by auth.uid()
        const { data: userData } = await supabase
          .from('users')
          .select('university_id')
          .single();

        console.log('[fetchData] User data:', userData);

        if (userData?.university_id) {
          console.log('[fetchData] Fetching for university:', userData.university_id);
          setUniversityId(userData.university_id);
          
          // Fetch university details
          const { data: uniData, error: uniError } = await supabase
            .from('universities')
            .select('*')
            .eq('id', userData.university_id)
            .single();
          
          console.log('[fetchData] University data:', uniData, 'error:', uniError);
          setUniversity(uniData);

          // Fetch programs
          const { data: programsData, error: progError } = await supabase
            .from('programs')
            .select('*')
            .eq('university_id', userData.university_id)
            .order('created_at', { ascending: false });

          console.log('[fetchData] Programs:', programsData?.length || 0, 'error:', progError);
          setPrograms(programsData || []);

          // Fetch branches (simplified query to avoid RLS/join issues)
          const { data: branchesData, error: branchError } = await supabase
            .from('branches')
            .select('*')
            .eq('university_id', userData.university_id)
            .order('created_at', { ascending: false });

          console.log('[fetchData] Branches:', branchesData?.length || 0, 'error:', branchError);
          setBranches(branchesData || []);

          // Fetch semesters (not years - new schema uses semesters)
          const { data: semestersData, error: semError } = await supabase
            .from('semesters')
            .select('*')
            .eq('university_id', userData.university_id)
            .order('number', { ascending: true });

          console.log('[fetchData] Semesters:', semestersData?.length || 0, 'error:', semError);
          setSemesters(semestersData || []);
          setYears(semestersData || []); // For backward compatibility with UI

          // Fetch holidays for all semesters
          if (semestersData && semestersData.length > 0) {
            const semesterIds = semestersData.map(s => s.id);
            const { data: holidaysData, error: holidaysError } = await supabase
              .from('academic_calendar')
              .select('semester_id, event_date')
              .in('semester_id', semesterIds);
            
            if (!holidaysError && holidaysData) {
              // Group holidays by semester_id
              const holidaysBySemsesterId: Record<string, string[]> = {};
              semesterIds.forEach(id => {
                holidaysBySemsesterId[id] = [];
              });
              holidaysData.forEach(h => {
                if (holidaysBySemsesterId[h.semester_id]) {
                  holidaysBySemsesterId[h.semester_id].push(h.event_date);
                }
              });
              setSemesterHolidays(holidaysBySemsesterId);
              console.log('[fetchData] Holidays:', Object.keys(holidaysBySemsesterId).length, 'semesters with holidays');
            } else {
              console.log('[fetchData] Holidays fetch error:', holidaysError);
            }
          }

          // Fetch courses through branches (courses don't have university_id directly)
          const branchIds = (branchesData || []).map(b => b.id);
          console.log('[fetchData] Branch IDs for courses query:', branchIds);
          let coursesData = [];
          if (branchIds.length > 0) {
            const { data: coursesDataResult, error: coursesError } = await supabase
              .from('courses')
              .select('*')
              .in('branch_id', branchIds)
              .order('code', { ascending: true });
            console.log('[fetchData] Courses:', coursesDataResult?.length || 0, 'error:', coursesError);
            coursesData = coursesDataResult || [];
          } else {
            console.log('[fetchData] No branches found, skipping courses query');
          }

          setCourses(coursesData || []);

          // Fetch sections for this university
          // Sections are identified by program_id, branch_id, semester_id (not course_id)
          let sectionsData = [];
          const { data: sectionsDataResult, error: sectionsError } = await supabase
            .from('sections')
            .select('*')
            .order('created_at', { ascending: false });
          console.log('[fetchData] Sections:', sectionsDataResult?.length || 0, 'error:', sectionsError);
          sectionsData = sectionsDataResult || [];

          setSections(sectionsData || []);
          console.log('[fetchData] Final - sections:', sectionsData?.length || 0, 'branches:', branchIds.length);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load university data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProgram = async () => {
    try {
      // Validate inputs
      if (!programForm.name.trim()) {
        toast.error('Program name is required');
        return;
      }
      if (!programForm.code.trim()) {
        toast.error('Program code is required');
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      console.log('[Program Creation] Auth user:', user?.user?.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('university_id, role')
        .eq('id', user?.user?.id)
        .single();

      console.log('[Program Creation] User data:', userData);
      console.log('[Program Creation] User role:', userData?.role);

      if (userError || !userData?.university_id) {
        throw new Error('Unable to fetch user university information');
      }

      // Check if user is admin
      if (userData.role !== 'admin') {
        toast.error('Only admin users can create programs');
        return;
      }

      const payload = {
        ...programForm,
        university_id: userData.university_id
      };

      console.log('[Program Creation] Creating with payload:', payload);

      const { data, error } = await supabase
        .from('programs')
        .insert(payload)
        .select();

      console.log('[Program Creation] Response:', { data, error });

      if (error) {
        console.error('[Program Creation] Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      toast.success('Program created successfully');
      setDialogOpen(false);
      setProgramForm({ name: '', code: '', duration_years: 4, program_type: 'undergraduate' });
      fetchData();
    } catch (error: any) {
      console.error('[Program Creation] Full error:', error);
      const errorMsg = error?.message || error?.details || 'Failed to create program';
      toast.error(errorMsg);
    }
  };

  const handleCreateBranch = async () => {
    try {
      // Validate inputs
      if (!branchForm.program_id) {
        toast.error('Please select a program');
        return;
      }
      if (!branchForm.name.trim()) {
        toast.error('Branch name is required');
        return;
      }
      if (!branchForm.code.trim()) {
        toast.error('Branch code is required');
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      console.log('[Branch Creation] Auth user:', user?.user?.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('university_id, role')
        .eq('id', user?.user?.id)
        .single();

      console.log('[Branch Creation] User data:', userData);

      if (userError || !userData?.university_id) {
        throw new Error('Unable to fetch user university information');
      }

      if (userData.role !== 'admin') {
        toast.error('Only admin users can create branches');
        return;
      }

      const payload = {
        ...branchForm,
        university_id: userData.university_id
      };

      console.log('[Branch Creation] Creating with payload:', payload);

      const { data, error } = await supabase
        .from('branches')
        .insert(payload)
        .select();

      console.log('[Branch Creation] Response:', { data, error });

      if (error) {
        console.error('[Branch Creation] Supabase error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw error;
      }

      toast.success('Branch created successfully');
      setDialogOpen(false);
      setBranchForm({ program_id: '', name: '', code: '' });
      fetchData();
    } catch (error: any) {
      console.error('[Branch Creation] Full error:', error);
      const errorMsg = error?.message || error?.details || 'Failed to create branch';
      toast.error(errorMsg);
    }
  };

  // Years tab removed - academic years are now managed through semesters' academic_year field
  // const handleCreateYear = async () => { ... };

  const handleCreateSemester = async () => {
    try {
      if (!semesterForm.program_id || !semesterForm.academic_year || !semesterForm.name || !semesterForm.number || !semesterForm.start_date || !semesterForm.end_date) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (new Date(semesterForm.start_date) >= new Date(semesterForm.end_date)) {
        toast.error('End date must be after start date');
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      console.log('[Semester Creation] Auth user:', user?.user?.id);

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('id, university_id, role')
        .eq('id', user?.user?.id)
        .single();

      console.log('[Semester Creation] User data:', userData);

      if (userError || !userData?.university_id) {
        throw new Error('Unable to fetch user university information');
      }

      if (userData.role !== 'admin') {
        toast.error('Only admin users can create/edit semesters');
        return;
      }

      // If editing, perform UPDATE, otherwise INSERT
      if (editingSemesterId) {
        console.log('[Semester Update] Updating semester:', editingSemesterId);

        const { error } = await supabase
          .from('semesters')
          .update({
            academic_year: semesterForm.academic_year,
            number: semesterForm.number,
            name: semesterForm.name,
            start_date: semesterForm.start_date,
            end_date: semesterForm.end_date,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingSemesterId);

        if (error) {
          console.error('[Semester Update] Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        toast.success('Semester updated successfully');
      } else {
        // Create new semester
        const payload = {
          program_id: semesterForm.program_id,
          university_id: userData.university_id,
          academic_year: semesterForm.academic_year,
          number: semesterForm.number,
          name: semesterForm.name,
          start_date: semesterForm.start_date,
          end_date: semesterForm.end_date
        };

        console.log('[Semester Creation] Creating with payload:', payload);

        const { data, error } = await supabase
          .from('semesters')
          .insert(payload)
          .select();

        console.log('[Semester Creation] Response:', { data, error });

        if (error) {
          console.error('[Semester Creation] Supabase error details:', {
            message: error.message,
            details: error.details,
            hint: error.hint,
            code: error.code
          });
          throw error;
        }

        toast.success('Semester created successfully');
      }

      setDialogOpen(false);
      setEditingSemesterId(null);
      setSemesterForm({
        program_id: '',
        academic_year: '',
        number: 1,
        name: '',
        start_date: '',
        end_date: ''
      });
      fetchData();
    } catch (error: any) {
      console.error('[Semester Creation/Update] Full error:', error);
      const errorMsg = error?.message || error?.details || 'Failed to create/edit semester';
      toast.error(errorMsg);
    }
  };

  const handleDeleteSemester = async (semesterId: string) => {
    try {
      const { error } = await supabase
        .from('semesters')
        .delete()
        .eq('id', semesterId);

      if (error) throw error;

      toast.success('Semester deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting semester:', error);
      toast.error('Failed to delete semester');
    }
  };

  const handleEditSemester = (semester: any) => {
    console.log('[Edit Semester] Opening edit dialog for:', semester.id);
    setEditingSemesterId(semester.id);
    setSemesterForm({
      program_id: semester.program_id,
      academic_year: semester.academic_year,
      name: semester.name,
      number: semester.number,
      start_date: semester.start_date,
      end_date: semester.end_date
    });
    setDialogType('semester');
    setDialogOpen(true);
  };

  const handleCreateCourse = async () => {
    try {
      if (!courseForm.program_id) {
        toast.error('Please select a program');
        return;
      }
      if (!courseForm.branch_id) {
        toast.error('Please select a branch');
        return;
      }

      const validCourseTypes = ['theory', 'practical', 'project', 'seminar'];
      const courseType = courseForm.course_type?.toLowerCase() || 'theory';
      
      if (!validCourseTypes.includes(courseType)) {
        console.error('Invalid course type:', courseType);
        toast.error(`Invalid course type: ${courseType}. Must be one of: ${validCourseTypes.join(', ')}`);
        return;
      }

      const payload = {
        university_id: universityId,
        program_id: courseForm.program_id,
        branch_id: courseForm.branch_id,
        code: courseForm.course_code,
        name: courseForm.course_name,
        credit_hours: parseInt(String(courseForm.credits)) || 3,
        course_type: courseType,
        description: courseForm.description && courseForm.description.trim() ? courseForm.description.trim() : null,
        is_active: Boolean(courseForm.is_active)
      };

      console.log('Creating course with payload:', payload);
      console.log('Payload types:', {
        program_id: typeof payload.program_id,
        branch_id: typeof payload.branch_id,
        code: typeof payload.code,
        name: typeof payload.name,
        credit_hours: typeof payload.credit_hours,
        course_type: typeof payload.course_type,
        description: typeof payload.description,
        is_active: typeof payload.is_active
      });

      const { error, data } = await supabase
        .from('courses')
        .insert(payload);

      console.log('Create course response:', { error, data });

      if (error) {
        console.error('Course creation error details:', error);
        throw error;
      }

      toast.success('Course created successfully');
      setDialogOpen(false);
      setEditMode(false);
      setSelectedItem(null);
      setCourseForm({
        program_id: '',
        branch_id: '',
        course_code: '',
        course_name: '',
        credits: 3,
        course_type: 'theory',
        description: '',
        is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Error creating course:', error);
      toast.error('Failed to create course');
    }
  };

  const handleUpdateCourse = async () => {
    try {
      if (!selectedItem?.id || !courseForm.branch_id) {
        console.error('Invalid course data:', { editingItemId: selectedItem?.id, branch_id: courseForm.branch_id });
        toast.error('Invalid course data');
        return;
      }

      const validCourseTypes = ['theory', 'practical', 'project', 'seminar'];
      const courseType = courseForm.course_type?.toLowerCase() || 'theory';
      
      if (!validCourseTypes.includes(courseType)) {
        console.error('Invalid course type:', courseType);
        toast.error(`Invalid course type: ${courseType}. Must be one of: ${validCourseTypes.join(', ')}`);
        return;
      }

      const updateData = {
        university_id: universityId,
        program_id: courseForm.program_id,
        branch_id: courseForm.branch_id,
        code: courseForm.course_code,
        name: courseForm.course_name,
        credit_hours: parseInt(String(courseForm.credits)) || 3,
        course_type: courseType,
        description: courseForm.description && courseForm.description.trim() ? courseForm.description.trim() : null,
        is_active: Boolean(courseForm.is_active)
      };

      console.log('Updating course ID:', selectedItem.id);
      console.log('Update payload:', updateData);
      console.log('Payload types:', {
        program_id: typeof updateData.program_id,
        branch_id: typeof updateData.branch_id,
        code: typeof updateData.code,
        name: typeof updateData.name,
        credit_hours: typeof updateData.credit_hours,
        course_type: typeof updateData.course_type,
        description: typeof updateData.description,
        is_active: typeof updateData.is_active
      });

      const { error, data } = await supabase
        .from('courses')
        .update(updateData)
        .eq('id', selectedItem.id);

      console.log('Update course response:', { error, data });

      if (error) {
        console.error('Course update error details:', error);
        throw error;
      }

      toast.success('Course updated successfully');
      setDialogOpen(false);
      setEditMode(false);
      setSelectedItem(null);
      setEditingItem(null);
      setCourseForm({
        program_id: '',
        branch_id: '',
        course_code: '',
        course_name: '',
        credits: 3,
        course_type: 'theory',
        description: '',
        is_active: true
      });
      fetchData();
    } catch (error) {
      console.error('Error updating course:', error);
      toast.error('Failed to update course');
    }
  };

  const handleDeleteCourse = async (courseId: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;

    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', courseId);

      if (error) throw error;

      toast.success('Course deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting course:', error);
      toast.error('Failed to delete course');
    }
  };

  const handleDeleteSection = async (sectionId: string) => {
    if (!confirm('Are you sure you want to delete this section?')) return;

    try {
      const { error } = await supabase
        .from('sections')
        .delete()
        .eq('id', sectionId);

      if (error) throw error;

      toast.success('Section deleted successfully');
      fetchData();
    } catch (error) {
      console.error('Error deleting section:', error);
      toast.error('Failed to delete section');
    }
  };

  const toggleCourseProgram = (programId: string) => {
    const newExpanded = new Set(expandedCoursePrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedCoursePrograms(newExpanded);
  };

  const toggleCourseBranch = (branchKey: string) => {
    const newExpanded = new Set(expandedCourseBranches);
    if (newExpanded.has(branchKey)) {
      newExpanded.delete(branchKey);
    } else {
      newExpanded.add(branchKey);
    }
    setExpandedCourseBranches(newExpanded);
  };

  const handleCreateSection = async () => {
    try {
      // Validate required fields
      if (!sectionForm.program_id) {
        toast.error('Please select a program');
        return;
      }
      if (!sectionForm.branch_id) {
        toast.error('Please select a branch');
        return;
      }
      if (!sectionForm.semester_id) {
        toast.error('Please select a semester');
        return;
      }
      if (!sectionForm.name) {
        toast.error('Please enter a section name');
        return;
      }
      if (!sectionForm.code) {
        toast.error('Please enter a section code');
        return;
      }
      if (!sectionForm.capacity || sectionForm.capacity < 1) {
        toast.error('Please enter a valid capacity');
        return;
      }
      if (!sectionForm.batches || sectionForm.batches < 1) {
        toast.error('Please enter number of batches');
        return;
      }

      // Create array of batch numbers [1, 2, 3, ...] based on batches count
      const batchArray = Array.from({ length: sectionForm.batches }, (_, i) => i + 1);

      // Create the section with ALL required fields
      const sectionData = {
        university_id: universityId,
        program_id: sectionForm.program_id,
        branch_id: sectionForm.branch_id,
        semester_id: sectionForm.semester_id,
        name: sectionForm.name,
        code: sectionForm.code,
        capacity: sectionForm.capacity,
        batches: batchArray,
        is_active: sectionForm.is_active
      };

      console.log('Creating section with data:', sectionData);

      const { data: newSection, error: sectionError } = await supabase
        .from('sections')
        .insert(sectionData)
        .select()
        .single();

      if (sectionError) {
        console.error('Supabase Section Error:', {
          message: sectionError.message,
          code: sectionError.code,
          details: sectionError.details,
          hint: sectionError.hint,
          fullError: sectionError
        });
        throw sectionError;
      }

      toast.success('Section created successfully');

      // Process files if parsed data is available
      if (parsingStatus.timetable.data.length > 0 || parsingStatus.enrollment.data.length > 0) {
        toast.info('Processing timetable and enrollment data...');

        try {
          // Call Edge Function to process the parsed data
          const { data, error } = await supabase.functions.invoke('process-section-data', {
            body: {
              sectionId: newSection.id,
              universityId: newSection.university_id,
              userId: (await supabase.auth.getUser()).data.user?.id,
              timetableData: parsingStatus.timetable.data,
              enrollmentData: parsingStatus.enrollment.data,
              uploadInfo: {
                timetable: sectionForm.timetable_file ? {
                  filename: sectionForm.timetable_file.name,
                  fileId: null // Will be created in Edge Function if needed
                } : null,
                enrollment: sectionForm.enrollment_file ? {
                  filename: sectionForm.enrollment_file.name,
                  fileId: null // Will be created in Edge Function if needed
                } : null
              }
            }
          });

          if (error) {
            console.error('Edge function error:', error);
            toast.error('Section created but failed to process files completely');
          } else if (data?.success) {
            const results = data.results;
            toast.success(
              `Section created successfully! Processed ${results.timetableProcessed} timetable entries, ` +
              `${results.enrollmentProcessed} students, and created ${results.lectureSessionsCreated} lecture sessions.`
            );
            
            if (results.errors.length > 0) {
              console.warn('Processing warnings:', results.errors);
              toast.warning(`Some items had issues: ${results.errors.slice(0, 3).join(', ')}`);
            }
          }
        } catch (processError) {
          console.error('Processing error:', processError);
          toast.error('Section created but failed to process uploaded files');
        }
      }

      // Reset form and close dialog
      setDialogOpen(false);
      setSectionForm({ 
        program_id: '',
        branch_id: '',
        semester_id: '',
        name: '',
        code: '',
        capacity: 150,
        batches: 1,
        is_active: true,
        timetable_file: null,
        enrollment_file: null
      });
      
      // Reset parsing status
      setParsingStatus({
        timetable: { status: 'idle', progress: 0, errors: [], data: [] },
        enrollment: { status: 'idle', progress: 0, errors: [], data: [] }
      });

      fetchData();
    } catch (error) {
      console.error('Error creating section:', error);
      console.error('Error details:', {
        message: error?.message,
        code: error?.code,
        status: error?.status,
        details: error?.details,
        hint: error?.hint
      });
      toast.error(`Failed to create section: ${error?.message || 'Unknown error'}`);
    }
  };

  const uploadSectionFile = async (sectionId, file, fileType) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${sectionId}/${fileType}_${Date.now()}.${fileExt}`;
      
      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('section-files')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('section_files')
        .insert({
          section_id: sectionId,
          file_name: file.name,
          file_path: uploadData.path,
          file_type: fileType,
          file_size: file.size,
          uploaded_by: (await supabase.auth.getUser()).data.user?.id
        });

      if (dbError) throw dbError;

      return uploadData;
    } catch (error) {
      console.error('Error uploading file:', error);
      throw error;
    }
  };

  // Edit Functions
  const handleEditProgram = async () => {
    try {
      const { error } = await supabase
        .from('programs')
        .update(programForm)
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Program updated successfully');
      setDialogOpen(false);
      setEditMode(false);
      setSelectedItem(null);
      setProgramForm({ name: '', code: '', duration_years: 4, program_type: 'undergraduate' });
      fetchData();
    } catch (error) {
      console.error('Error updating program:', error);
      toast.error('Failed to update program');
    }
  };

  const handleEditBranch = async () => {
    try {
      const { error } = await supabase
        .from('branches')
        .update(branchForm)
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Branch updated successfully');
      setDialogOpen(false);
      setEditMode(false);
      setSelectedItem(null);
      setBranchForm({ program_id: '', name: '', code: '' });
      fetchData();
    } catch (error) {
      console.error('Error updating branch:', error);
      toast.error('Failed to update branch');
    }
  };

  const handleEditYear = async () => {
    try {
      const { error } = await supabase
        .from('years')
        .update(yearForm)
        .eq('id', selectedItem.id);

      if (error) throw error;

      toast.success('Academic year updated successfully');
      setDialogOpen(false);
      setEditMode(false);
      setSelectedItem(null);
      setYearForm({ academic_year: '', year_number: 1 });
      fetchData();
    } catch (error) {
      console.error('Error updating year:', error);
      toast.error('Failed to update academic year');
    }
  };

  const handleEditSection = async () => {
    try {
      // Create array of batch numbers [1, 2, 3, ...] based on batches count
      const batchArray = Array.from({ length: sectionForm.batches }, (_, i) => i + 1);

      const sectionData = {
        // Don't update university_id
        program_id: sectionForm.program_id,
        branch_id: sectionForm.branch_id,
        semester_id: sectionForm.semester_id,
        name: sectionForm.name,
        code: sectionForm.code,
        capacity: sectionForm.capacity,
        batches: batchArray,
        is_active: sectionForm.is_active
      };

      console.log('Updating section with data:', sectionData);

      const { error } = await supabase
        .from('sections')
        .update(sectionData)
        .eq('id', selectedItem.id);

      if (error) {
        console.error('Supabase Section Update Error:', {
          message: error.message,
          code: error.code,
          details: error.details,
          hint: error.hint,
          fullError: error
        });
        throw error;
      }

      // Upload new files if provided
      if (sectionForm.timetable_file) {
        await uploadSectionFile(selectedItem.id, sectionForm.timetable_file, 'timetable');
      }

      if (sectionForm.enrollment_file) {
        await uploadSectionFile(selectedItem.id, sectionForm.enrollment_file, 'enrollment');
      }

      toast.success('Section updated successfully');
      setDialogOpen(false);
      setEditMode(false);
      setSelectedItem(null);
      setSectionForm({ 
        program_id: '',
        branch_id: '',
        semester_id: '',
        name: '',
        code: '',
        capacity: 150,
        batches: 1,
        is_active: true,
        timetable_file: null,
        enrollment_file: null
      });
      fetchData();
    } catch (error) {
      console.error('Error updating section:', error);
      toast.error('Failed to update section');
    }
  };

  // Helper functions to open dialogs
  const openEditDialog = (type, item) => {
    setEditMode(true);
    setViewMode(false);
    setSelectedItem(item);
    setDialogType(type);
    
    // Populate form with existing data
    if (type === 'program') {
      setProgramForm({
        name: item.name,
        code: item.code,
        duration_years: item.duration_years,
        program_type: item.program_type
      });
    } else if (type === 'branch') {
      setBranchForm({
        program_id: item.program_id,
        name: item.name,
        code: item.code
      });
    } else if (type === 'year') {
      setYearForm({
        academic_year: item.academic_year,
        year_number: item.year_number
      });
    } else if (type === 'course') {
      console.log('Loading course for edit:', {
        id: item.id,
        course_type: item.course_type,
        course_type_lowercase: item.course_type?.toLowerCase()
      });
      setCourseForm({
        program_id: item.program_id,
        branch_id: item.branch_id,
        course_code: item.code,
        course_name: item.name,
        credits: item.credit_hours,
        course_type: item.course_type?.toLowerCase() || 'theory',
        description: item.description || '',
        is_active: item.is_active
      });
    } else if (type === 'section') {
      setSectionForm({
        program_id: item.program_id,
        branch_id: item.branch_id,
        semester_id: item.semester_id,
        name: item.name,
        code: item.code,
        capacity: item.capacity,
        batches: item.batches?.length || 1,
        is_active: item.is_active,
        timetable_file: null,
        enrollment_file: null
      });
    }
    
    setDialogOpen(true);
  };

  const openViewDialog = (type, item) => {
    setViewMode(true);
    setEditMode(false);
    setSelectedItem(item);
    setDialogType(type);
    setDialogOpen(true);
  };

  const openDialog = (type) => {
    setEditMode(false);
    setViewMode(false);
    setSelectedItem(null);
    setDialogType(type);
    
    // Reset forms based on dialog type
    if (type === 'course') {
      setCourseForm({
        program_id: '',
        branch_id: '',
        course_code: '',
        course_name: '',
        credits: 3,
        course_type: 'theory',
        description: '',
        is_active: true
      });
    } else if (type === 'section') {
      setSectionForm({
        program_id: '',
        branch_id: '',
        semester_id: '',
        name: '',
        code: '',
        capacity: 150,
        batches: 1,
        is_active: true,
        timetable_file: null,
        enrollment_file: null
      });
    }
    
    setDialogOpen(true);
  };

  // Open timetable/enrollment management page for a specific section
  const openSectionFileDialog = (sectionId: string, fileType: 'timetable' | 'enrollment') => {
    if (fileType === 'timetable') {
      navigate(`/timetable?sectionId=${sectionId}`);
    } else if (fileType === 'enrollment') {
      navigate(`/enrollment?sectionId=${sectionId}`);
    }
  };

  // File handling functions
  const handleFileUpload = async (file: File, type: 'timetable' | 'enrollment') => {
    if (!file) return;

    // Update parsing status
    setParsingStatus(prev => ({
      ...prev,
      [type]: { status: 'parsing', progress: 10, errors: [], data: [] }
    }));

    try {
      // Parse the file on client side
      const result = await parseFile(file, type);
      
      if (result.success) {
        setParsingStatus(prev => ({
          ...prev,
          [type]: { 
            status: 'completed', 
            progress: 100, 
            errors: result.errors, 
            data: result.data 
          }
        }));

        // Update form with file
        setSectionForm(prev => ({
          ...prev,
          [`${type}_file`]: file
        }));

        toast.success(`${type} file parsed successfully! Found ${result.totalRecords} records.`);
      } else {
        setParsingStatus(prev => ({
          ...prev,
          [type]: { 
            status: 'error', 
            progress: 0, 
            errors: result.errors, 
            data: [] 
          }
        }));
        toast.error(`Failed to parse ${type} file: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      setParsingStatus(prev => ({
        ...prev,
        [type]: { 
          status: 'error', 
          progress: 0, 
          errors: [error.message], 
          data: [] 
        }
      }));
      toast.error(`Error parsing ${type} file: ${error.message}`);
    }
  };

  const resetFileStatus = (type: 'timetable' | 'enrollment') => {
    setParsingStatus(prev => ({
      ...prev,
      [type]: { status: 'idle', progress: 0, errors: [], data: [] }
    }));
    setSectionForm(prev => ({
      ...prev,
      [`${type}_file`]: null
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen dark bg-background flex">
        <Sidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          currentPage={currentPage}
          setCurrentPage={setCurrentPage}
          sidebarItems={sidebarItems}
        />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Loading university data...</p>
          </div>
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
        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <PageHeader
              title={university?.name || 'University Management'}
              description="Manage your university structure and academic data"
              icon={<School />}
              badge={{
                text: university?.is_active ? 'Active' : 'Inactive',
                variant: university?.is_active ? 'default' : 'secondary'
              }}
            />

            {/* Tabs */}
            <div className="bg-card rounded-lg border">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-7">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="programs">Programs</TabsTrigger>
                  <TabsTrigger value="branches">Branches</TabsTrigger>
                  <TabsTrigger value="semesters">Semesters</TabsTrigger>
                  <TabsTrigger value="courses">Courses</TabsTrigger>
                  <TabsTrigger value="sections">Sections</TabsTrigger>
                  <TabsTrigger value="files">File Management</TabsTrigger>
                </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="p-6 mt-0 space-y-6">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Total Programs</CardTitle>
                      <GraduationCap className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{programs.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Active programs running
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Branches</CardTitle>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{branches.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Specialized branches
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Sections</CardTitle>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{sections.length}</div>
                      <p className="text-xs text-muted-foreground">
                        Active sections
                      </p>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                      <CardTitle className="text-sm font-medium">Section Files</CardTitle>
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">0</div>
                      <p className="text-xs text-muted-foreground">
                        Files per section
                      </p>
                    </CardContent>
                  </Card>
                </div>

                {/* University Details */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center">
                        <School className="w-5 h-5 mr-2 text-primary" />
                        University Information
                      </CardTitle>
                      <Button
                        variant={editMode && selectedItem?.type === 'university' ? 'outline' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          if (editMode && selectedItem?.type === 'university') {
                            setEditMode(false);
                            setSelectedItem(null);
                          } else {
                            setEditMode(true);
                            setSelectedItem({ type: 'university', id: university?.id });
                          }
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {editMode && selectedItem?.type === 'university' ? (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <div>
                            <Label className="text-sm font-medium">University Name</Label>
                            <Input
                              value={university?.name || ''}
                              onChange={(e) => {
                                console.log('[Name onChange] New name value:', e.target.value);
                                setUniversity({...university, name: e.target.value});
                              }}
                              placeholder="Enter university name"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">University Code</Label>
                            <Input
                              value={university?.short_code || ''}
                              onChange={(e) => {
                                console.log('[Code onChange] New code value:', e.target.value);
                                setUniversity({...university, short_code: e.target.value});
                              }}
                              placeholder="Enter university code"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Location</Label>
                            <Input
                              value={university?.address || ''}
                              onChange={(e) => {
                                console.log('[Address onChange] New address value:', e.target.value);
                                setUniversity({...university, address: e.target.value});
                              }}
                              placeholder="Enter location"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Contact Email</Label>
                            <Input
                              value={university?.email || ''}
                              onChange={(e) => {
                                console.log('[Email onChange] New email value:', e.target.value);
                                setUniversity({...university, email: e.target.value});
                              }}
                              placeholder="Enter contact email"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Contact Phone</Label>
                            <Input
                              value={university?.phone_number || ''}
                              onChange={(e) => {
                                console.log('[Phone onChange] New phone value:', e.target.value);
                                setUniversity({...university, phone_number: e.target.value});
                              }}
                              placeholder="Enter contact phone"
                            />
                          </div>
                          <div>
                            <Label className="text-sm font-medium">Timezone</Label>
                            <Input
                              value={university?.timezone || ''}
                              onChange={(e) => {
                                console.log('[Timezone onChange] New timezone value:', e.target.value);
                                setUniversity({...university, timezone: e.target.value});
                              }}
                              placeholder="Enter timezone"
                            />
                          </div>
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditMode(false);
                              setSelectedItem(null);
                              fetchData();
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={async () => {
                              try {
                                console.log('Update clicked, university state:', university);
                                console.log('Update data:', {
                                  name: university?.name,
                                  short_code: university?.short_code,
                                  address: university?.address,
                                  email: university?.email,
                                  phone_number: university?.phone_number,
                                  timezone: university?.timezone,
                                  id: university?.id
                                });

                                if (!university?.id) {
                                  toast.error('University ID not found');
                                  return;
                                }

                                const updatePayload = {
                                  name: university.name || '',
                                  short_code: university.short_code || '',
                                  address: university.address || '',
                                  email: university.email || '',
                                  phone_number: university.phone_number || '',
                                  timezone: university.timezone || ''
                                };

                                console.log('Sending update payload:', updatePayload);
                                console.log('University ID:', university.id);

                                // First try: update with select
                                let { data, error } = await supabase
                                  .from('universities')
                                  .update(updatePayload)
                                  .eq('id', university.id)
                                  .select();

                                console.log('Update response (with select):', { data, error });

                                // If select returned empty but no error, it still succeeded
                                // Just means the row wasn't returned, but update happened
                                if (error) {
                                  console.error('Supabase error:', error);
                                  throw error;
                                }

                                if (!data || data.length === 0) {
                                  console.warn('Update returned no data - this is OK, update still succeeded');
                                  // If select didn't return data, fetch it separately to confirm
                                  const { data: confirmData, error: confirmError } = await supabase
                                    .from('universities')
                                    .select('*')
                                    .eq('id', university.id)
                                    .single();
                                  
                                  console.log('Confirmation fetch:', { confirmData, confirmError });
                                  console.log('Confirmation fetch - email field:', confirmData?.email);
                                  console.log('Confirmation fetch - full object:', JSON.stringify(confirmData, null, 2));
                                  if (confirmError) {
                                    throw confirmError;
                                  }
                                  if (confirmData) {
                                    setUniversity(confirmData);
                                  }
                                }

                                toast.success('University information updated successfully');
                                setEditMode(false);
                                setSelectedItem(null);
                                console.log('Calling fetchData...');
                                await fetchData();
                                console.log('fetchData completed');
                              } catch (error) {
                                console.error('Error updating university:', error);
                                toast.error('Failed to update university information: ' + (error?.message || 'Unknown error'));
                              }
                            }}
                          >
                            Update
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                          <Label className="text-sm font-medium">University Name</Label>
                          <p className="text-sm text-muted-foreground">{university?.name || '--'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">University Code</Label>
                          <p className="text-sm text-muted-foreground">{university?.short_code || '--'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Location</Label>
                          <p className="text-sm text-muted-foreground">{university?.address || '--'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Contact Email</Label>
                          <p className="text-sm text-muted-foreground">{university?.email || '--'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Contact Phone</Label>
                          <p className="text-sm text-muted-foreground">{university?.phone_number || '--'}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium">Timezone</Label>
                          <p className="text-sm text-muted-foreground">{university?.timezone || '--'}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Programs Tab */}
              <TabsContent value="programs" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Academic Programs</h2>
                  <Button onClick={() => openDialog('program')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Program
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {programs.map((program) => (
                    <Card key={program.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{program.name}</CardTitle>
                            <CardDescription>{program.code}</CardDescription>
                          </div>
                          <Badge variant={program.is_active ? "default" : "secondary"}>
                            {program.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Duration:</span>
                          <span>{program.duration_years} years</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Type:</span>
                          <span className="capitalize">{program.program_type}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Branches:</span>
                          <span>{branches.filter(b => b.program_id === program.id).length}</span>
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openEditDialog('program', program)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openViewDialog('program', program)}
                          >
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Branches Tab */}
              <TabsContent value="branches" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Program Branches</h2>
                  <Button onClick={() => openDialog('branch')} disabled={programs.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Branch
                  </Button>
                </div>

                {programs.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to create at least one program before adding branches.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {branches.map((branch) => (
                      <Card key={branch.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{branch.name}</CardTitle>
                              <CardDescription>{branch.code}</CardDescription>
                            </div>
                            <Badge variant={branch.is_active ? "default" : "secondary"}>
                              {branch.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Program:</span>
                            <span>{programs.find(p => p.id === branch.program_id)?.name || '--'}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Courses:</span>
                            <span>{courses.filter(c => c.branch_id === branch.id).length}</span>
                          </div>
                          <div className="flex space-x-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => openEditDialog('branch', branch)}
                            >
                              <Edit className="w-3 h-3 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => openViewDialog('branch', branch)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Semesters Tab */}
              <TabsContent value="semesters" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Semesters</h2>
                  <Button onClick={() => {
                    setEditingSemesterId(null);
                    openDialog('semester');
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Semester
                  </Button>
                </div>

                {semesters.length === 0 ? (
                  <div className="text-center py-12">
                    <Calendar className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Semesters Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Create semesters to define teaching periods and manage academic calendars.
                    </p>
                    <Button onClick={() => openDialog('semester')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Semester
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {[...new Set(semesters.map(s => s.academic_year))].sort().reverse().map((academic_year) => {
                      const yearSemesters = semesters.filter(s => s.academic_year === academic_year);

                      return (
                        <div key={academic_year} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-lg">{academic_year}</h3>
                            <Badge variant="outline" className="ml-auto">{yearSemesters.length} semesters</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {yearSemesters.map((semester) => {
                              // Calculate metrics from semester dates and data
                              const totalDays = calculateTotalDays(semester.start_date, semester.end_date);
                              
                              // Get holidays for this semester from state
                              const holidayDates = semesterHolidays[semester.id] || [];
                              const workingDays = calculateWorkingDaysMinusHolidays(
                                semester.start_date, 
                                semester.end_date,
                                holidayDates
                              );

                              return (
                                <Card key={semester.id} className="hover:shadow-md transition-shadow">
                                  <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex-1">
                                        <CardTitle className="text-base">{semester.academic_year} - {semester.name}</CardTitle>
                                        <CardDescription>
                                          {new Date(semester.start_date).toLocaleDateString()} - {new Date(semester.end_date).toLocaleDateString()}
                                        </CardDescription>
                                      </div>
                                      <Badge 
                                        variant={semester.status === 'ongoing' ? 'default' : semester.status === 'completed' ? 'secondary' : 'outline'}
                                        className="whitespace-nowrap"
                                      >
                                        {semester.status}
                                      </Badge>
                                    </div>
                                  </CardHeader>
                                  <CardContent className="space-y-3">
                                    <div className="grid grid-cols-2 gap-3 text-sm">
                                      <div className="space-y-1 p-2 rounded bg-muted/50">
                                        <p className="text-xs text-muted-foreground">Start Date</p>
                                        <p className="font-semibold text-sm">{new Date(semester.start_date).toLocaleDateString()}</p>
                                      </div>
                                      <div className="space-y-1 p-2 rounded bg-muted/50">
                                        <p className="text-xs text-muted-foreground">End Date</p>
                                        <p className="font-semibold text-sm">{new Date(semester.end_date).toLocaleDateString()}</p>
                                      </div>
                                      <div className="space-y-1 p-2 rounded bg-muted/50">
                                        <p className="text-xs text-muted-foreground">Total Days</p>
                                        <p className="font-semibold text-lg">{totalDays}</p>
                                      </div>
                                      <div className="space-y-1 p-2 rounded bg-muted/50">
                                        <p className="text-xs text-muted-foreground">Working Days</p>
                                        <p className="font-semibold text-lg">{workingDays}</p>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2 pt-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="flex-1"
                                        onClick={() => navigate(`/calendar?year=${semester.academic_year}&semester=${semester.id}&name=${encodeURIComponent(semester.name)}`)}
                                      >
                                        <CalendarIcon className="w-3 h-3 mr-1" />
                                        Calendar
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleEditSemester(semester)}
                                      >
                                        <Edit className="w-3 h-3" />
                                      </Button>
                                      <Button 
                                        variant="ghost" 
                                        size="sm"
                                        className="text-destructive hover:text-destructive"
                                        onClick={() => handleDeleteSemester(semester.id)}
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Courses Tab */}
              <TabsContent value="courses" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Courses</h2>
                  <Button onClick={() => openDialog('course')} disabled={branches.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Course
                  </Button>
                </div>

                {branches.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to create at least one branch before adding courses.
                    </AlertDescription>
                  </Alert>
                ) : courses.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Courses Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start by creating your first course to organize academic content for your branches.
                    </p>
                    <Button onClick={() => openDialog('course')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Course
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Organize by Programs */}
                    {programs.map((program) => {
                      const programCourses = courses.filter(c => c.program_id === program.id);
                      if (programCourses.length === 0) return null;

                      const programBranches = Array.from(new Set(programCourses.map(c => c.branch_id)));
                      const isExpanded = expandedCoursePrograms.has(program.id);

                      return (
                        <div key={program.id} className="bg-card rounded-lg border border-border overflow-hidden">
                          {/* Program Header - Collapsible */}
                          <button
                            onClick={() => toggleCourseProgram(program.id)}
                            className="w-full px-6 py-4 hover:bg-muted/50 transition-colors flex items-center justify-between bg-muted/30 border-b border-border/50"
                          >
                            <div className="flex items-center gap-3 flex-1 text-left">
                              {isExpanded ? (
                                <ChevronDown className="h-5 w-5 text-primary flex-shrink-0" />
                              ) : (
                                <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                              )}
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">
                                  {program.code} - {program.name}
                                </h3>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {programCourses.length} course{programCourses.length !== 1 ? 's' : ''}
                                </p>
                              </div>
                            </div>
                          </button>

                          {/* Program Content */}
                          {isExpanded && (
                            <div className="divide-y divide-border/50">
                              {programBranches.map((branchId) => {
                                const branch = branches.find(b => b.id === branchId);
                                const branchCourses = programCourses.filter(c => c.branch_id === branchId);
                                const branchKey = `${program.id}-${branchId}`;
                                const branchExpanded = expandedCourseBranches.has(branchKey);

                                return (
                                  <div key={branchId}>
                                    {/* Branch Header - Collapsible */}
                                    <button
                                      onClick={() => toggleCourseBranch(branchKey)}
                                      className="w-full px-6 py-3 hover:bg-muted/30 transition-colors flex items-center justify-between bg-background"
                                    >
                                      <div className="flex items-center gap-3 flex-1 text-left">
                                        {branchExpanded ? (
                                          <ChevronDown className="h-4 w-4 text-primary/70 flex-shrink-0" />
                                        ) : (
                                          <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        )}
                                        <div>
                                          <h4 className="font-medium text-foreground">
                                            {branch?.code} - {branch?.name}
                                          </h4>
                                          <p className="text-xs text-muted-foreground mt-0.5">
                                            {branchCourses.length} course{branchCourses.length !== 1 ? 's' : ''}
                                          </p>
                                        </div>
                                      </div>
                                    </button>

                                    {/* Branch Courses Grid */}
                                    {branchExpanded && (
                                      <div className="p-6 bg-muted/5">
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                          {branchCourses.map((course) => (
                                            <Card key={course.id} className="hover:shadow-md transition-shadow">
                                              <CardHeader>
                                                <div className="flex justify-between items-start gap-2">
                                                  <div className="flex-1">
                                                    <CardTitle className="text-base">{course.code}</CardTitle>
                                                    <CardDescription className="line-clamp-1">{course.name}</CardDescription>
                                                  </div>
                                                  <Badge variant={course.is_active ? "default" : "secondary"} className="whitespace-nowrap">
                                                    {course.is_active ? "Active" : "Inactive"}
                                                  </Badge>
                                                </div>
                                              </CardHeader>
                                              <CardContent className="space-y-3">
                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                  <div className="space-y-1">
                                                    <p className="text-muted-foreground">Credits</p>
                                                    <p className="font-semibold text-base">{course.credit_hours || course.credits}</p>
                                                  </div>
                                                  <div className="space-y-1">
                                                    <p className="text-muted-foreground">Type</p>
                                                    <p className="font-semibold text-xs capitalize bg-blue-100/20 text-blue-300 px-2 py-1 rounded-md w-fit">{course.course_type}</p>
                                                  </div>
                                                </div>
                                                
                                                {course.description && (
                                                  <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                                                )}
                                                
                                                <div className="flex space-x-2 pt-2">
                                                  <Button 
                                                    variant="outline" 
                                                    size="sm" 
                                                    className="flex-1"
                                                    onClick={() => openEditDialog('course', course)}
                                                  >
                                                    <Edit className="w-3 h-3 mr-1" />
                                                    Edit
                                                  </Button>
                                                  <Button 
                                                    variant="destructive" 
                                                    size="sm" 
                                                    className="flex-1"
                                                    onClick={() => handleDeleteCourse(course.id)}
                                                  >
                                                    <Trash2 className="w-3 h-3 mr-1" />
                                                    Delete
                                                  </Button>
                                                </div>
                                              </CardContent>
                                            </Card>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Sections Tab */}
              <TabsContent value="sections" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-white">Sections</h2>
                  <Button onClick={() => openDialog('section')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {sections.length === 0 ? (
                  <div className="text-center py-12">
                    <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100 mb-2">No Sections Yet</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                      Start by creating your first section to organize students.
                    </p>
                    <Button onClick={() => openDialog('section')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Section
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {programs.map((program) => {
                      const programBranches = branches.filter(b => b.program_id === program.id);
                      const programSections = sections.filter(s => s.program_id === program.id);
                      if (programSections.length === 0) return null;

                      const isProgramExpanded = expandedSectionPrograms?.includes(program.id);

                      return (
                        <div key={program.id} className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                          {/* Program Header */}
                          <div 
                            className="p-4 bg-slate-100 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
                            onClick={() => setExpandedSectionPrograms(prev => 
                              prev?.includes(program.id) 
                                ? prev.filter(id => id !== program.id)
                                : [...(prev || []), program.id]
                            )}
                          >
                            <div className="flex items-center gap-3">
                              {isProgramExpanded ? (
                                <ChevronDown className="w-5 h-5 text-primary" />
                              ) : (
                                <ChevronRight className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                              )}
                              <GraduationCap className="w-5 h-5 text-primary" />
                              <h3 className="font-semibold text-base text-slate-900 dark:text-white">{program.name}</h3>
                              <Badge variant="outline" className="ml-auto text-slate-700 dark:text-slate-300">
                                {programSections.length} sections
                              </Badge>
                            </div>
                          </div>

                          {/* Program Content */}
                          {isProgramExpanded && (
                            <div className="p-4 bg-white dark:bg-slate-950 space-y-4">
                              {programBranches.map((branch) => {
                                const branchSections = programSections.filter(s => s.branch_id === branch.id);
                                if (branchSections.length === 0) return null;

                                const isBranchExpanded = expandedSectionBranches?.includes(branch.id);

                                return (
                                  <div key={branch.id} className="border border-slate-300 dark:border-slate-700 border-dashed rounded-lg overflow-hidden">
                                    {/* Branch Header */}
                                    <div 
                                      className="p-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-300 dark:border-slate-700 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                                      onClick={() => setExpandedSectionBranches(prev =>
                                        prev?.includes(branch.id)
                                          ? prev.filter(id => id !== branch.id)
                                          : [...(prev || []), branch.id]
                                      )}
                                    >
                                      <div className="flex items-center gap-3 ml-4">
                                        {isBranchExpanded ? (
                                          <ChevronDown className="w-4 h-4 text-primary" />
                                        ) : (
                                          <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-400" />
                                        )}
                                        <Layers className="w-4 h-4 text-blue-500" />
                                        <h4 className="font-medium text-sm text-slate-900 dark:text-white">{branch.name}</h4>
                                        <Badge variant="secondary" className="ml-auto text-xs">
                                          {branchSections.length} sections
                                        </Badge>
                                      </div>
                                    </div>

                                    {/* Branch Content - Semesters */}
                                    {isBranchExpanded && (
                                      <div className="p-4 bg-white dark:bg-slate-950 space-y-4">
                                        {semesters.map((semester) => {
                                          const semesterSections = branchSections.filter(s => s.semester_id === semester.id);
                                          if (semesterSections.length === 0) return null;

                                          return (
                                            <div key={semester.id} className="space-y-3 pb-4 border-b border-slate-200 dark:border-slate-800 last:border-b-0">
                                              {/* Semester Label */}
                                              <div className="flex items-center gap-2 mb-2">
                                                <Calendar className="w-4 h-4 text-amber-500" />
                                                <h5 className="text-sm font-semibold text-slate-900 dark:text-white">{semester.name}</h5>
                                                <Badge variant="outline" className="text-xs ml-auto text-slate-700 dark:text-slate-300">
                                                  {semesterSections.length}
                                                </Badge>
                                              </div>

                                              {/* Sections Grid */}
                                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 ml-2">
                                                {semesterSections.map((section) => (
                                                  <Card key={section.id} className="hover:shadow-md transition-shadow bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                                                    <CardHeader className="pb-3">
                                                      <div className="flex justify-between items-start gap-2">
                                                        <div className="flex-1">
                                                          <CardTitle className="text-sm text-slate-900 dark:text-white">{section.name}</CardTitle>
                                                          <CardDescription className="text-xs text-slate-600 dark:text-slate-400">{section.code}</CardDescription>
                                                        </div>
                                                        <Badge 
                                                          variant={section.is_active ? "default" : "secondary"}
                                                          className="whitespace-nowrap text-xs"
                                                        >
                                                          {section.is_active ? "Active" : "Inactive"}
                                                        </Badge>
                                                      </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3">
                                                      <div className="grid grid-cols-2 gap-2 text-xs">
                                                        <div className="space-y-1">
                                                          <p className="text-slate-600 dark:text-slate-400 text-xs">Capacity</p>
                                                          <p className="font-semibold text-slate-900 dark:text-white">{section.capacity}</p>
                                                        </div>
                                                        <div className="space-y-1">
                                                          <p className="text-slate-600 dark:text-slate-400 text-xs">Batches</p>
                                                          <p className="font-semibold text-slate-900 dark:text-white">{section.batches?.length || 0}</p>
                                                        </div>
                                                      </div>
                                                      
                                                      {section.batches && section.batches.length > 0 && (
                                                        <div className="text-xs space-y-1 p-2 bg-slate-100 dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700">
                                                          <p className="text-slate-600 dark:text-slate-400 font-medium">Batch Names</p>
                                                          <p className="font-mono text-slate-900 dark:text-slate-200 font-semibold text-sm">
                                                            {section.batches.map(b => `A${b}`).join(', ')}
                                                          </p>
                                                        </div>
                                                      )}
                                                      
                                                      <div className="flex flex-col space-y-2 pt-3 border-t border-slate-200 dark:border-slate-800">
                                                        <div className="flex space-x-2">
                                                          <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="flex-1"
                                                            onClick={() => openEditDialog('section', section)}
                                                          >
                                                            <Edit className="w-3 h-3 mr-1" />
                                                            Edit
                                                          </Button>
                                                          <Button 
                                                            variant="ghost" 
                                                            size="sm"
                                                            onClick={() => handleDeleteSection(section.id)}
                                                          >
                                                            <Trash2 className="w-3 h-3" />
                                                          </Button>
                                                        </div>
                                                        
                                                        <div className="grid grid-cols-2 gap-2">
                                                          <Button 
                                                            variant="secondary" 
                                                            size="sm"
                                                            onClick={() => openSectionFileDialog(section.id, 'timetable')}
                                                          >
                                                            <Calendar className="w-3 h-3 mr-1" />
                                                            Timetable
                                                          </Button>
                                                          <Button 
                                                            variant="secondary" 
                                                            size="sm"
                                                            onClick={() => openSectionFileDialog(section.id, 'enrollment')}
                                                          >
                                                            <Users className="w-3 h-3 mr-1" />
                                                            Enrollment
                                                          </Button>
                                                        </div>
                                                      </div>
                                                    </CardContent>
                                                  </Card>
                                                ))}
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Files Tab */}
              <TabsContent value="files" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">File Management & History</h2>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Download className="w-4 h-4 mr-2" />
                      Export Report
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </Button>
                  </div>
                </div>

                {/* File Statistics */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        <div>
                          <p className="text-sm font-medium">Total Files</p>
                          <p className="text-2xl font-bold">0</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-5 h-5 text-green-500" />
                        <div>
                          <p className="text-sm font-medium">Timetables</p>
                          <p className="text-2xl font-bold">0</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <Users className="w-5 h-5 text-orange-500" />
                        <div>
                          <p className="text-sm font-medium">Enrollments</p>
                          <p className="text-2xl font-bold">0</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500" />
                        <div>
                          <p className="text-sm font-medium">Active Sections</p>
                          <p className="text-2xl font-bold">
                            {sections?.filter(s => s.is_active).length || 0}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* File History Table */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center">
                      <Clock className="w-5 h-5 mr-2" />
                      Recent File Activities
                    </CardTitle>
                    <CardDescription>
                      View and manage all uploaded files across sections
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Section</TableHead>
                          <TableHead>File Type</TableHead>
                          <TableHead>File Name</TableHead>
                          <TableHead>Size</TableHead>
                          <TableHead>Uploaded</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <div className="flex flex-col items-center space-y-2">
                              <FileText className="w-8 h-8 text-muted-foreground" />
                              <p className="text-muted-foreground">Section files will appear here</p>
                              <p className="text-sm text-muted-foreground">
                                Files uploaded through sections will be displayed in this table
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <BarChart3 className="w-5 h-5 mr-2" />
                        File Analytics
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-sm">Storage Used</span>
                          <span className="text-sm font-medium">0 MB</span>
                        </div>
                        <Progress value={75} className="h-2" />
                        <div className="text-xs text-muted-foreground">
                          75% of allocated storage used
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Settings className="w-5 h-5 mr-2" />
                        File Management
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <Button variant="outline" className="w-full justify-start">
                          <Upload className="w-4 h-4 mr-2" />
                          Bulk Upload Files
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Download className="w-4 h-4 mr-2" />
                          Export All Data
                        </Button>
                        <Button variant="outline" className="w-full justify-start">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Cleanup Old Files
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col">
          {dialogType === 'program' && (
            <>
              <DialogHeader>
                <DialogTitle>Add New Program</DialogTitle>
                <DialogDescription>
                  Create a new academic program for your university.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="program-name" className="text-right">
                    Program Name
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="program-name"
                      value={programForm.name}
                      onChange={(e) => setProgramForm({...programForm, name: e.target.value})}
                      className="w-full"
                      placeholder="e.g., Bachelor's in Technology"
                    />
                    <p className="text-xs text-gray-500 mt-1">e.g., Bachelor's in Technology, Master's in Technology</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="program-code" className="text-right">
                    Program Code
                  </Label>
                  <div className="col-span-3">
                    <Input
                      id="program-code"
                      value={programForm.code}
                      onChange={(e) => setProgramForm({...programForm, code: e.target.value})}
                      className="w-full"
                      placeholder="e.g., B.Tech"
                    />
                    <p className="text-xs text-gray-500 mt-1">e.g., B.Tech, M.Tech, PhD, Diploma</p>
                  </div>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="program-type" className="text-right">
                    Program Type
                  </Label>
                  <Select 
                    value={programForm.program_type} 
                    onValueChange={(value) => setProgramForm({...programForm, program_type: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select program type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="undergraduate">Undergraduate (B.Tech)</SelectItem>
                      <SelectItem value="postgraduate">Postgraduate (M.Tech)</SelectItem>
                      <SelectItem value="phd">PhD</SelectItem>
                      <SelectItem value="diploma">Diploma</SelectItem>
                      <SelectItem value="certificate">Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="duration" className="text-right">
                    Duration (Years)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    value={programForm.duration_years}
                    onChange={(e) => setProgramForm({...programForm, duration_years: parseInt(e.target.value)})}
                    className="col-span-3"
                    min="1"
                    max="10"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleCreateProgram}
                  disabled={!programForm.name || !programForm.code}
                >
                  Create Program
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'branch' && (
            <>
              <DialogHeader>
                <DialogTitle>Add New Branch</DialogTitle>
                <DialogDescription>
                  Add a new branch specialization to an existing program.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branch-program" className="text-right">
                    Program
                  </Label>
                  <Select 
                    value={branchForm.program_id} 
                    onValueChange={(value) => setBranchForm({...branchForm, program_id: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.name} ({program.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branch-name" className="text-right">
                    Branch Name
                  </Label>
                  <Input
                    id="branch-name"
                    value={branchForm.name}
                    onChange={(e) => setBranchForm({...branchForm, name: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Computer Science Engineering"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="branch-code" className="text-right">
                    Branch Code
                  </Label>
                  <Input
                    id="branch-code"
                    value={branchForm.code}
                    onChange={(e) => setBranchForm({...branchForm, code: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., CSE"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={handleCreateBranch}
                  disabled={!branchForm.program_id || !branchForm.name || !branchForm.code}
                >
                  Create Branch
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'semester' && (
            <>
              <DialogHeader>
                <DialogTitle>{editingSemesterId ? 'Edit Semester' : 'Add Semester'}</DialogTitle>
                <DialogDescription>
                  {editingSemesterId 
                    ? 'Update semester details including dates and name.'
                    : 'Create a new semester for a program with academic year, semester number, and dates.'
                  }
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2 py-4">
                
                {/* Program Selection */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sem-program" className="text-right">
                      Program <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={semesterForm.program_id} 
                      onValueChange={(value) => setSemesterForm({...semesterForm, program_id: value})}
                      disabled={!!editingSemesterId}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select program" />
                      </SelectTrigger>
                      <SelectContent>
                        {programs.map((program) => (
                          <SelectItem key={program.id} value={program.id}>
                            {program.name} - {program.duration_years} years
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  {editingSemesterId && <p className="text-xs text-gray-500 ml-[26%]">Cannot change program for existing semester</p>}
                </div>

                {/* Academic Year Selection */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sem-year" className="text-right">
                      Academic Year <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={semesterForm.academic_year} 
                      onValueChange={(value) => setSemesterForm({...semesterForm, academic_year: value})}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select academic year" />
                      </SelectTrigger>
                      <SelectContent>
                        {generateAcademicYears().map((year) => (
                          <SelectItem key={year} value={year}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-500 ml-[26%]">Format: YYYY-YY (e.g., 2025-26)</p>
                </div>

                {/* Semester Number Selection */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sem-number" className="text-right">
                      Semester # <span className="text-red-500">*</span>
                    </Label>
                    <Select 
                      value={semesterForm.number.toString()} 
                      onValueChange={(value) => {
                        const num = parseInt(value);
                        const semLabel = getSemesterLabel(num);
                        const semName = `${semLabel} - ${semesterForm.academic_year || 'Year'}`;
                        setSemesterForm({...semesterForm, number: num, name: semName});
                      }}
                    >
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select semester number" />
                      </SelectTrigger>
                      <SelectContent>
                        {semesterForm.program_id && programs.find(p => p.id === semesterForm.program_id) ? (
                          generateSemesterNumbers(programs.find(p => p.id === semesterForm.program_id)?.duration_years || 4).map((num) => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} ({getSemesterLabel(num)})
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="1">1 (Sem A)</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-gray-500 ml-[26%]">Odd = Sem A, Even = Sem B</p>
                </div>

                {/* Semester Name */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sem-name" className="text-right">
                      Semester Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sem-name"
                      value={semesterForm.name}
                      onChange={(e) => setSemesterForm({...semesterForm, name: e.target.value})}
                      className="col-span-3"
                      placeholder="e.g., Sem A - 2025-26"
                    />
                  </div>
                  <p className="text-xs text-gray-500 ml-[26%]">Hint: Fall 2025, Spring 2025, Summer 2025</p>
                </div>

                {/* Start Date */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sem-start" className="text-right">
                      Start Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sem-start"
                      type="date"
                      value={semesterForm.start_date}
                      onChange={(e) => setSemesterForm({...semesterForm, start_date: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                </div>

                {/* End Date */}
                <div className="space-y-1">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="sem-end" className="text-right">
                      End Date <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      id="sem-end"
                      type="date"
                      value={semesterForm.end_date}
                      onChange={(e) => setSemesterForm({...semesterForm, end_date: e.target.value})}
                      className="col-span-3"
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline"
                  onClick={() => {
                    setDialogOpen(false);
                    setEditingSemesterId(null);
                    setSemesterForm({
                      program_id: '',
                      academic_year: '',
                      number: 1,
                      name: '',
                      start_date: '',
                      end_date: ''
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  onClick={handleCreateSemester}
                  disabled={!semesterForm.program_id || !semesterForm.academic_year || !semesterForm.number || !semesterForm.start_date || !semesterForm.end_date}
                >
                  {editingSemesterId ? 'Update Semester' : 'Create Semester'}
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'course' && (
            <>
              <DialogHeader>
                <DialogTitle>{editMode ? 'Edit Course' : 'Add New Course'}</DialogTitle>
                <DialogDescription>
                  {editMode ? 'Update course information.' : 'Create a new course for your branches.'}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course-program" className="text-right">
                    Program <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={courseForm.program_id} 
                    onValueChange={(value) => setCourseForm({...courseForm, program_id: value, branch_id: ''})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.code} - {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course-branch" className="text-right">
                    Branch <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={courseForm.branch_id} 
                    onValueChange={(value) => setCourseForm({...courseForm, branch_id: value})}
                    disabled={!courseForm.program_id}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder={courseForm.program_id ? "Select branch" : "Select a program first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {branches
                        .filter(b => b.program_id === courseForm.program_id)
                        .map((branch) => (
                          <SelectItem key={branch.id} value={branch.id}>
                            {branch.code} - {branch.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course-code" className="text-right">
                    Course Code <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="course-code"
                    value={courseForm.course_code}
                    onChange={(e) => setCourseForm({...courseForm, course_code: e.target.value.toUpperCase()})}
                    className="col-span-3"
                    placeholder="CS101"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course-name" className="text-right">
                    Course Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="course-name"
                    value={courseForm.course_name}
                    onChange={(e) => setCourseForm({...courseForm, course_name: e.target.value})}
                    className="col-span-3"
                    placeholder="Introduction to Programming"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course-credits" className="text-right">
                    Credits <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="course-credits"
                    type="number"
                    min="1"
                    max="10"
                    value={courseForm.credits}
                    onChange={(e) => setCourseForm({...courseForm, credits: parseInt(e.target.value)})}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course-type" className="text-right">
                    Course Type <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={courseForm.course_type} 
                    onValueChange={(value) => {
                      console.log('University.tsx - Course type changed to:', value);
                      setCourseForm({...courseForm, course_type: value});
                    }}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theory">Theory</SelectItem>
                      <SelectItem value="practical">Practical</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                      <SelectItem value="seminar">Seminar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-start gap-4">
                  <Label htmlFor="course-description" className="text-right mt-2">
                    Description
                  </Label>
                  <textarea
                    id="course-description"
                    value={courseForm.description}
                    onChange={(e) => setCourseForm({...courseForm, description: e.target.value})}
                    className="col-span-3 px-3 py-2 border border-input rounded-md bg-background resize-none"
                    placeholder="Course description..."
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Active</Label>
                  <div className="col-span-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={courseForm.is_active}
                        onChange={(e) => setCourseForm({...courseForm, is_active: e.target.checked})}
                        className="rounded w-4 h-4"
                      />
                      <span className="text-sm">Mark as active</span>
                    </label>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  type="submit" 
                  onClick={editMode ? handleUpdateCourse : handleCreateCourse}
                  disabled={!courseForm.program_id || !courseForm.branch_id || !courseForm.course_code || !courseForm.course_name}
                >
                  {editMode ? 'Update' : 'Create'} Course
                </Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'section' && (
            <>
              <DialogHeader className="pb-6">
                <DialogTitle className="text-xl font-semibold">
                  {editMode ? 'Edit Section' : viewMode ? 'View Section' : 'Add New Section'}
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  {editMode ? 'Update section information and upload new files.' : 
                   viewMode ? 'View section details and files.' :
                   'Create a new section for students within a branch and year.'}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-2 max-h-[60vh] overflow-y-auto">
                {/* Section Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-medium">Section Information</h3>
                  </div>
                  
                  {/* Academic Structure Section */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4 border border-border/50">
                    <h3 className="text-sm font-semibold text-foreground">Academic Structure</h3>
                    
                    {/* Program Selection */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Program <span className="text-red-500">*</span></Label>
                        <Select 
                          value={sectionForm.program_id} 
                          onValueChange={(value) => setSectionForm({...sectionForm, program_id: value, branch_id: ''})}
                          disabled={viewMode}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder="Select program" />
                          </SelectTrigger>
                          <SelectContent>
                            {programs.map((program) => (
                              <SelectItem key={program.id} value={program.id}>
                                {program.code} - {program.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Branch Selection */}
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Branch <span className="text-red-500">*</span></Label>
                        <Select 
                          value={sectionForm.branch_id} 
                          onValueChange={(value) => setSectionForm({...sectionForm, branch_id: value})}
                          disabled={!sectionForm.program_id || viewMode}
                        >
                          <SelectTrigger className="h-9">
                            <SelectValue placeholder={sectionForm.program_id ? "Select branch" : "Select a program first"} />
                          </SelectTrigger>
                          <SelectContent>
                            {branches
                              .filter(b => b.program_id === sectionForm.program_id)
                              .map((branch) => (
                                <SelectItem key={branch.id} value={branch.id}>
                                  {branch.code} - {branch.name}
                                </SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Semester Selection */}
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Semester <span className="text-red-500">*</span></Label>
                      <Select 
                        value={sectionForm.semester_id} 
                        onValueChange={(value) => setSectionForm({...sectionForm, semester_id: value})}
                        disabled={viewMode}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select semester" />
                        </SelectTrigger>
                        <SelectContent>
                          {semesters.map((semester) => (
                            <SelectItem key={semester.id} value={semester.id}>
                              {semester.number} - {semester.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Section Details Section */}
                  <div className="bg-muted/30 rounded-lg p-4 space-y-4 border border-border/50">
                    <h3 className="text-sm font-semibold text-foreground">Section Details</h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Section Name <span className="text-red-500">*</span></Label>
                        <Input
                          value={sectionForm.name}
                          onChange={(e) => setSectionForm({...sectionForm, name: e.target.value})}
                          placeholder="A, B, C..."
                          readOnly={viewMode}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Section Code <span className="text-red-500">*</span></Label>
                        <Input
                          value={sectionForm.code}
                          onChange={(e) => setSectionForm({...sectionForm, code: e.target.value})}
                          placeholder="e.g., SEC-A, CS-B"
                          readOnly={viewMode}
                          className="h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Capacity <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          value={sectionForm.capacity}
                          onChange={(e) => setSectionForm({...sectionForm, capacity: parseInt(e.target.value)})}
                          min="10"
                          max="500"
                          readOnly={viewMode}
                          className="h-9"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Number of Batches <span className="text-red-500">*</span></Label>
                        <Input
                          type="number"
                          value={sectionForm.batches}
                          onChange={(e) => setSectionForm({...sectionForm, batches: Math.max(1, parseInt(e.target.value) || 1)})}
                          min="1"
                          max="10"
                          readOnly={viewMode}
                          className="h-9"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Batches will be: {Array.from({ length: sectionForm.batches }, (_, i) => `${sectionForm.name}${i + 1}`).join(', ')}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sectionForm.is_active}
                          onChange={(e) => setSectionForm({...sectionForm, is_active: e.target.checked})}
                          disabled={viewMode}
                          className="rounded w-4 h-4"
                        />
                        <span className="text-sm font-medium">Active</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter className="pt-6 border-t mt-auto flex-shrink-0">
                <div className="flex gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  {!viewMode && (
                    <Button 
                      type="submit" 
                      onClick={editMode ? handleEditSection : handleCreateSection}
                      disabled={!sectionForm.program_id || !sectionForm.branch_id || !sectionForm.semester_id || !sectionForm.name || !sectionForm.code || !sectionForm.capacity || !sectionForm.batches}
                      className="min-w-[120px]"
                    >
                      {editMode ? 'Update Section' : 'Create Section'}
                    </Button>
                  )}
                </div>
              </DialogFooter>
            </>
          )}

          </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(University);
