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
  FolderOpen
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

function University({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
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
    academic_year: '',
    semester_number: 1,
    semester_name: 'Sem A',
    start_date: '',
    end_date: ''
  });

  const [semesters, setSemesters] = useState([]);

  const [courseForm, setCourseForm] = useState({
    branch_id: '',
    course_code: '',
    course_name: '',
    credits: 3,
    course_type: 'theory',
    semester: 1,
    description: '',
    is_active: true
  });

  const [sectionForm, setSectionForm] = useState({
    branch_id: '',
    year_id: '',
    name: '',
    max_students: 150,
    timetable_file: null,
    enrollment_file: null
  });

  // File parsing states
  const [parsingStatus, setParsingStatus] = useState({
    timetable: { status: 'idle', progress: 0, errors: [], data: [] },
    enrollment: { status: 'idle', progress: 0, errors: [], data: [] }
  });

  const [editMode, setEditMode] = useState(false);
  const [viewMode, setViewMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

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
      
      if (user?.user) {
        // Get user's university
        const { data: userData } = await supabase
          .from('users')
          .select('university_id')
          .eq('id', user.user.id)
          .single();

        if (userData?.university_id) {
          // Fetch university details
          const { data: uniData } = await supabase
            .from('universities')
            .select('*')
            .eq('id', userData.university_id)
            .single();
          
          setUniversity(uniData);

          // Fetch programs
          const { data: programsData } = await supabase
            .from('programs')
            .select('*')
            .eq('university_id', userData.university_id)
            .order('created_at', { ascending: false });

          setPrograms(programsData || []);

          // Fetch branches with program info
          const { data: branchesData } = await supabase
            .from('branches')
            .select(`
              *,
              programs (name, code)
            `)
            .in('program_id', (programsData || []).map(p => p.id))
            .order('created_at', { ascending: false });

          setBranches(branchesData || []);

          // Fetch years
          const { data: yearsData } = await supabase
            .from('years')
            .select('*')
            .eq('university_id', userData.university_id)
            .order('academic_year', { ascending: false });

          setYears(yearsData || []);

          // Fetch courses
          const { data: coursesData } = await supabase
            .from('courses')
            .select(`
              *,
              branches (name, code, programs (name))
            `)
            .in('branch_id', (branchesData || []).map(b => b.id))
            .order('course_code', { ascending: true });

          setCourses(coursesData || []);

          // Fetch sections with branch and year info
          const { data: sectionsData } = await supabase
            .from('sections')
            .select(`
              *,
              branches (name, code, programs (name)),
              years (academic_year, year_number)
            `)
            .in('branch_id', (branchesData || []).map(b => b.id))
            .order('created_at', { ascending: false });

          setSections(sectionsData || []);
          console.log('Fetched sections:', sectionsData);
          console.log('Branch IDs used for filter:', (branchesData || []).map(b => b.id));

          // Fetch semesters
          const { data: semestersData } = await supabase
            .from('semesters')
            .select('*')
            .eq('university_id', userData.university_id)
            .order('academic_year', { ascending: false })
            .order('semester_number', { ascending: true });

          setSemesters(semestersData || []);
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
      const { data: user } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('university_id')
        .eq('id', user.user.id)
        .single();

      const { error } = await supabase
        .from('programs')
        .insert({
          ...programForm,
          university_id: userData.university_id
        });

      if (error) throw error;

      toast.success('Program created successfully');
      setDialogOpen(false);
      setProgramForm({ name: '', code: '', duration_years: 4, program_type: 'undergraduate' });
      fetchData();
    } catch (error) {
      console.error('Error creating program:', error);
      toast.error('Failed to create program');
    }
  };

  const handleCreateBranch = async () => {
    try {
      const { error } = await supabase
        .from('branches')
        .insert(branchForm);

      if (error) throw error;

      toast.success('Branch created successfully');
      setDialogOpen(false);
      setBranchForm({ program_id: '', name: '', code: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating branch:', error);
      toast.error('Failed to create branch');
    }
  };

  const handleCreateYear = async () => {
    try {
      const { data: user } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('university_id')
        .eq('id', user.user.id)
        .single();

      const { error } = await supabase
        .from('years')
        .insert({
          ...yearForm,
          university_id: userData.university_id
        });

      if (error) throw error;

      toast.success('Academic year created successfully');
      setDialogOpen(false);
      setYearForm({ academic_year: '', year_number: 1 });
      fetchData();
    } catch (error) {
      console.error('Error creating year:', error);
      toast.error('Failed to create academic year');
    }
  };

  const handleCreateSemester = async () => {
    try {
      if (!semesterForm.academic_year || !semesterForm.start_date || !semesterForm.end_date) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (new Date(semesterForm.start_date) >= new Date(semesterForm.end_date)) {
        toast.error('End date must be after start date');
        return;
      }

      const { data: user } = await supabase.auth.getUser();
      const { data: userData } = await supabase
        .from('users')
        .select('university_id')
        .eq('id', user.user.id)
        .single();

      const { error } = await supabase
        .from('semesters')
        .insert({
          university_id: userData.university_id,
          academic_year: semesterForm.academic_year,
          semester_number: semesterForm.semester_number,
          semester_name: semesterForm.semester_name,
          start_date: semesterForm.start_date,
          end_date: semesterForm.end_date,
          created_by: user.user.id
        });

      if (error) throw error;

      toast.success('Semester created successfully');
      setDialogOpen(false);
      setSemesterForm({
        academic_year: '',
        semester_number: 1,
        semester_name: '',
        start_date: '',
        end_date: ''
      });
      fetchData();
    } catch (error) {
      console.error('Error creating semester:', error);
      toast.error('Failed to create semester');
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

  const handleCreateCourse = async () => {
    try {
      if (!courseForm.branch_id) {
        toast.error('Please select a branch');
        return;
      }

      const { error } = await supabase
        .from('courses')
        .insert({
          branch_id: courseForm.branch_id,
          course_code: courseForm.course_code,
          course_name: courseForm.course_name,
          credits: courseForm.credits,
          course_type: courseForm.course_type,
          semester: courseForm.semester,
          description: courseForm.description,
          is_active: courseForm.is_active
        });

      if (error) throw error;

      toast.success('Course created successfully');
      setDialogOpen(false);
      setCourseForm({
        branch_id: '',
        course_code: '',
        course_name: '',
        credits: 3,
        course_type: 'theory',
        semester: 1,
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
      if (!editingItem?.id || !courseForm.branch_id) {
        toast.error('Invalid course data');
        return;
      }

      const { error } = await supabase
        .from('courses')
        .update({
          branch_id: courseForm.branch_id,
          course_code: courseForm.course_code,
          course_name: courseForm.course_name,
          credits: courseForm.credits,
          course_type: courseForm.course_type,
          semester: courseForm.semester,
          description: courseForm.description,
          is_active: courseForm.is_active
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      toast.success('Course updated successfully');
      setDialogOpen(false);
      setCourseForm({
        branch_id: '',
        course_code: '',
        course_name: '',
        credits: 3,
        course_type: 'theory',
        semester: 1,
        description: '',
        is_active: true
      });
      setEditingItem(null);
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

  const handleCreateSection = async () => {
    try {
      // First create the section
      const sectionData = {
        branch_id: sectionForm.branch_id,
        year_id: sectionForm.year_id,
        name: sectionForm.name,
        max_students: sectionForm.max_students,
        is_active: true
      };

      const { data: newSection, error: sectionError } = await supabase
        .from('sections')
        .insert(sectionData)
        .select()
        .single();

      if (sectionError) throw sectionError;

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
        branch_id: '', 
        year_id: '', 
        name: '', 
        max_students: 150,
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
      toast.error('Failed to create section');
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
      const sectionData = {
        branch_id: sectionForm.branch_id,
        year_id: sectionForm.year_id,
        name: sectionForm.name,
        max_students: sectionForm.max_students
      };

      const { error } = await supabase
        .from('sections')
        .update(sectionData)
        .eq('id', selectedItem.id);

      if (error) throw error;

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
        branch_id: '', 
        year_id: '', 
        name: '', 
        max_students: 60,
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
      setCourseForm({
        branch_id: item.branch_id,
        course_code: item.course_code,
        course_name: item.course_name,
        credits: item.credits,
        course_type: item.course_type,
        semester: item.semester,
        description: item.description || '',
        is_active: item.is_active
      });
    } else if (type === 'section') {
      setSectionForm({
        branch_id: item.branch_id,
        year_id: item.year_id,
        name: item.name,
        max_students: item.max_students,
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
    setDialogOpen(true);
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
                <TabsList className="grid w-full grid-cols-8">
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="programs">Programs</TabsTrigger>
                  <TabsTrigger value="branches">Branches</TabsTrigger>
                  <TabsTrigger value="years">Years</TabsTrigger>
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
                    <CardTitle className="flex items-center">
                      <School className="w-5 h-5 mr-2 text-primary" />
                      University Information
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-sm font-medium">University Name</Label>
                        <p className="text-sm text-muted-foreground">{university?.name}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">University Code</Label>
                        <p className="text-sm text-muted-foreground">{university?.code}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Location</Label>
                        <p className="text-sm text-muted-foreground">{university?.location}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Contact Email</Label>
                        <p className="text-sm text-muted-foreground">{university?.contact_email}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Contact Phone</Label>
                        <p className="text-sm text-muted-foreground">{university?.contact_phone}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium">Timezone</Label>
                        <p className="text-sm text-muted-foreground">{university?.timezone}</p>
                      </div>
                    </div>
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
                            <span>{branch.programs?.name}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Sections:</span>
                            <span>{sections.filter(s => s.branch_id === branch.id).length}</span>
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

              {/* Years Tab */}
              <TabsContent value="years" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Academic Years</h2>
                  <Button onClick={() => openDialog('year')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Academic Year
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {years.map((year) => (
                    <Card key={year.id} className="hover:shadow-lg transition-shadow">
                      <CardHeader>
                        <div className="flex justify-between items-start">
                          <div>
                            <CardTitle className="text-lg">{year.academic_year}</CardTitle>
                            <CardDescription>Year {year.year_number}</CardDescription>
                          </div>
                          <Badge variant={year.is_active ? "default" : "secondary"}>
                            {year.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Sections:</span>
                          <span>{sections.filter(s => s.year_id === year.id).length}</span>
                        </div>
                        <div className="flex space-x-2 pt-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="flex-1"
                            onClick={() => openEditDialog('year', year)}
                          >
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </TabsContent>

              {/* Semesters Tab */}
              <TabsContent value="semesters" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Semesters</h2>
                  <Button onClick={() => openDialog('semester')}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Semester
                  </Button>
                </div>

                {years.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      Please create an academic year first before adding semesters.
                    </AlertDescription>
                  </Alert>
                ) : semesters.length === 0 ? (
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
                    {years.map((year) => {
                      const yearSemesters = semesters.filter(s => s.academic_year === year.academic_year);
                      if (yearSemesters.length === 0) return null;

                      return (
                        <div key={year.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-lg">{year.academic_year}</h3>
                            <Badge variant="outline" className="ml-auto">{yearSemesters.length} semesters</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {yearSemesters.map((semester) => {
                              const totalDays = semester.total_days || 0;
                              const workingDays = semester.working_days || 0;
                              const classDays = semester.class_days || 0;
                              const effectivePercentage = workingDays > 0 ? ((classDays / workingDays) * 100).toFixed(1) : 0;

                              return (
                                <Card key={semester.id} className="hover:shadow-md transition-shadow">
                                  <CardHeader>
                                    <div className="flex justify-between items-start gap-2">
                                      <div className="flex-1">
                                        <CardTitle className="text-base">{semester.semester_name}</CardTitle>
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
                                        <p className="text-xs text-muted-foreground">Total Days</p>
                                        <p className="font-semibold text-lg">{totalDays}</p>
                                      </div>
                                      <div className="space-y-1 p-2 rounded bg-muted/50">
                                        <p className="text-xs text-muted-foreground">Working Days</p>
                                        <p className="font-semibold text-lg">{workingDays}</p>
                                      </div>
                                      <div className="space-y-1 p-2 rounded bg-blue-500/10">
                                        <p className="text-xs text-muted-foreground">Class Days</p>
                                        <p className="font-semibold text-lg">{classDays}</p>
                                      </div>
                                      <div className="space-y-1 p-2 rounded bg-green-500/10">
                                        <p className="text-xs text-muted-foreground">Effective</p>
                                        <p className="font-semibold text-lg">{effectivePercentage}%</p>
                                      </div>
                                    </div>
                                    <div className="flex space-x-2 pt-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="flex-1"
                                        onClick={() => navigate(`/calendar?semester=${semester.id}`)}
                                      >
                                        <CalendarIcon className="w-3 h-3 mr-1" />
                                        Calendar
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
                  <div className="space-y-6">
                    {branches.map((branch) => {
                      const branchCourses = courses.filter(c => c.branch_id === branch.id);
                      if (branchCourses.length === 0) return null;

                      return (
                        <div key={branch.id} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold">{branch.code} - {branch.name}</h3>
                            <Badge variant="outline" className="ml-auto">{branchCourses.length} courses</Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {branchCourses.map((course) => (
                              <Card key={course.id} className="hover:shadow-md transition-shadow">
                                <CardHeader>
                                  <div className="flex justify-between items-start gap-2">
                                    <div className="flex-1">
                                      <CardTitle className="text-base">{course.course_code}</CardTitle>
                                      <CardDescription className="line-clamp-1">{course.course_name}</CardDescription>
                                    </div>
                                    <Badge variant={course.is_active ? "default" : "secondary"} className="whitespace-nowrap">
                                      {course.is_active ? "Active" : "Inactive"}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                  <div className="grid grid-cols-3 gap-2 text-xs">
                                    <div className="space-y-1">
                                      <p className="text-muted-foreground">Credits</p>
                                      <p className="font-semibold text-base">{course.credits}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-muted-foreground">Semester</p>
                                      <p className="font-semibold text-base">{course.semester}</p>
                                    </div>
                                    <div className="space-y-1">
                                      <p className="text-muted-foreground">Type</p>
                                      <p className="font-semibold text-xs capitalize">{course.course_type}</p>
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
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* Sections Tab */}
              <TabsContent value="sections" className="p-6 mt-0 space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-semibold">Sections</h2>
                  <Button onClick={() => openDialog('section')} disabled={branches.length === 0 || years.length === 0}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Section
                  </Button>
                </div>

                {branches.length === 0 || years.length === 0 ? (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      You need to create at least one branch and one academic year before adding sections.
                    </AlertDescription>
                  </Alert>
                ) : sections.length === 0 ? (
                  <div className="text-center py-12">
                    <GraduationCap className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium text-muted-foreground mb-2">No Sections Yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Start by creating your first section to organize students within branches and years.
                    </p>
                    <Button onClick={() => openDialog('section')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Section
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {sections.map((section) => (
                      <Card key={section.id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{section.name}</CardTitle>
                              <CardDescription>
                                {section.branches?.programs?.name} - {section.branches?.name}
                              </CardDescription>
                            </div>
                            <Badge variant={section.is_active ? "default" : "secondary"}>
                              {section.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Academic Year:</span>
                            <span>{section.years?.academic_year}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Year:</span>
                            <span>Year {section.years?.year_number}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Max Students:</span>
                            <span>{section.max_students}</span>
                          </div>
                          <div className="flex space-x-2 pt-2">
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
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => openViewDialog('section', section)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              View
                            </Button>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border">
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="gap-1"
                              onClick={() => navigate(`/timetable?sectionId=${section.id}`)}
                            >
                              <Calendar className="w-3 h-3" />
                              Timetable
                            </Button>
                            <Button 
                              variant="secondary" 
                              size="sm" 
                              className="gap-1"
                              onClick={() => navigate(`/enrollment?sectionId=${section.id}`)}
                            >
                              <Users className="w-3 h-3" />
                              Enrollment
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
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
                  <Input
                    id="program-name"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({...programForm, name: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Computer Science Engineering"
                  />
                </div>
                
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="program-code" className="text-right">
                    Program Code
                  </Label>
                  <Input
                    id="program-code"
                    value={programForm.code}
                    onChange={(e) => setProgramForm({...programForm, code: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., CSE"
                  />
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
                      <SelectItem value="undergraduate">Undergraduate</SelectItem>
                      <SelectItem value="postgraduate">Postgraduate</SelectItem>
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

          {dialogType === 'year' && (
            <>
              <DialogHeader>
                <DialogTitle>Add Academic Year</DialogTitle>
                <DialogDescription>
                  Create a new academic year for the university.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="year-academic" className="text-right">
                    Academic Year
                  </Label>
                  <Input
                    id="year-academic"
                    value={yearForm.academic_year}
                    onChange={(e) => setYearForm({...yearForm, academic_year: e.target.value})}
                    className="col-span-3"
                    placeholder="2024-25"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="year-number" className="text-right">
                    Year Level
                  </Label>
                  <Input
                    id="year-number"
                    type="number"
                    value={yearForm.year_number}
                    onChange={(e) => setYearForm({...yearForm, year_number: parseInt(e.target.value)})}
                    className="col-span-3"
                    min="1"
                    max="6"
                    placeholder="1, 2, 3, 4..."
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="submit" onClick={handleCreateYear}>Create Year</Button>
              </DialogFooter>
            </>
          )}

          {dialogType === 'semester' && (
            <>
              <DialogHeader>
                <DialogTitle>Add Semester</DialogTitle>
                <DialogDescription>
                  Create a new semester with start and end dates. The system will automatically calculate working days and class days.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sem-year" className="text-right">
                    Academic Year <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={semesterForm.academic_year} 
                    onValueChange={(value) => setSemesterForm({...semesterForm, academic_year: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select year" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((year) => (
                        <SelectItem key={year.id} value={year.academic_year}>
                          {year.academic_year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sem-number" className="text-right">
                    Semester # <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={semesterForm.semester_number.toString()} 
                    onValueChange={(value) => {
                      const num = parseInt(value);
                      const semName = num % 2 === 1 ? 'Sem A' : 'Sem B';
                      setSemesterForm({...semesterForm, semester_number: num, semester_name: semName});
                    }}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select semester" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Sem A (1, 3, 5, 7...)</SelectItem>
                      <SelectItem value="2">Sem B (2, 4, 6, 8...)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="sem-name" className="text-right">
                    Semester Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="sem-name"
                    value={semesterForm.semester_name}
                    onChange={(e) => setSemesterForm({...semesterForm, semester_name: e.target.value})}
                    className="col-span-3"
                    placeholder="e.g., Fall 2024"
                  />
                </div>

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
              <DialogFooter>
                <Button type="submit" onClick={handleCreateSemester}>Create Semester</Button>
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
                  <Label htmlFor="course-branch" className="text-right">
                    Branch <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={courseForm.branch_id} 
                    onValueChange={(value) => setCourseForm({...courseForm, branch_id: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {branches.map((branch) => (
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
                  <Label htmlFor="course-semester" className="text-right">
                    Semester <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="course-semester"
                    type="number"
                    min="1"
                    max="8"
                    value={courseForm.semester}
                    onChange={(e) => setCourseForm({...courseForm, semester: parseInt(e.target.value)})}
                    className="col-span-3"
                  />
                </div>

                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="course-type" className="text-right">
                    Course Type <span className="text-red-500">*</span>
                  </Label>
                  <Select 
                    value={courseForm.course_type} 
                    onValueChange={(value) => setCourseForm({...courseForm, course_type: value})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="theory">Theory</SelectItem>
                      <SelectItem value="practical">Practical</SelectItem>
                      <SelectItem value="hybrid">Hybrid</SelectItem>
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
                  disabled={!courseForm.branch_id || !courseForm.course_code || !courseForm.course_name}
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
                {/* Section Information - 4 inputs in one row */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="w-5 h-5 text-primary" />
                    <h3 className="text-lg font-medium">Section Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Branch</Label>
                      <Select 
                        value={sectionForm.branch_id} 
                        onValueChange={(value) => setSectionForm({...sectionForm, branch_id: value})}
                        disabled={viewMode}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select branch" />
                        </SelectTrigger>
                        <SelectContent>
                          {branches.map((branch) => (
                            <SelectItem key={branch.id} value={branch.id}>
                              {branch.name} ({branch.code})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Academic Year</Label>
                      <Select 
                        value={sectionForm.year_id} 
                        onValueChange={(value) => setSectionForm({...sectionForm, year_id: value})}
                        disabled={viewMode}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                          {years.map((year) => (
                            <SelectItem key={year.id} value={year.id}>
                              {year.academic_year} - Year {year.year_number}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Section Name</Label>
                      <Input
                        value={sectionForm.name}
                        onChange={(e) => setSectionForm({...sectionForm, name: e.target.value})}
                        placeholder="A, B, C..."
                        readOnly={viewMode}
                        className="h-9"
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-sm font-medium">Max Students</Label>
                      <Input
                        type="number"
                        value={sectionForm.max_students}
                        onChange={(e) => setSectionForm({...sectionForm, max_students: parseInt(e.target.value)})}
                        min="10"
                        max="200"
                        readOnly={viewMode}
                        className="h-9"
                      />
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
                      disabled={!sectionForm.branch_id || !sectionForm.year_id || !sectionForm.name}
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
