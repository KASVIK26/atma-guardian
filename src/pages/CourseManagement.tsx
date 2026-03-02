import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, BookMarked, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { PageHeader } from '@/components/layout/PageHeader';
import { withAuth } from '../lib/withAuth';

interface Course {
  id: string;
  university_id: string;
  program_id: string;
  branch_id: string;
  code: string;
  name: string;
  description: string;
  credit_hours: number;
  course_type: string;
  semester: number;
  is_active: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
  program_id: string;
}

interface Year {
  id: string;
  academic_year: string;
  year_number: number;
}

function CourseManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [expandedPrograms, setExpandedPrograms] = useState<Set<string>>(new Set());
  const [expandedBranches, setExpandedBranches] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    program_id: '',
    branch_id: '',
    course_code: '',
    course_name: '',
    credits: 3,
    course_type: 'theory',
    description: '',
    is_active: true
  });

  useEffect(() => {
    if (currentPage !== 'courses') {
      setCurrentPage('courses');
    }
    fetchInitialData();
  }, [currentPage, setCurrentPage]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('User not authenticated');

      // Fetch user's university_id - Use limit(1) to handle RLS
      const { data: userDataArray, error: userError } = await supabase
        .from('users')
        .select('university_id')
        .eq('id', user.id)
        .limit(1);

      const userData = userDataArray && userDataArray.length > 0 ? userDataArray[0] : null;
      if (userError) throw userError;
      
      const universityId = userData?.university_id;
      setUniversityId(universityId);

      // Fetch programs for this university
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, code, name')
        .eq('university_id', universityId)
        .order('name');

      if (programsError) throw programsError;
      setPrograms(programsData || []);

      // Fetch years for this university
      const { data: yearsData, error: yearsError } = await supabase
        .from('years')
        .select('id, academic_year, year_number')
        .eq('university_id', universityId)
        .order('year_number');

      if (yearsError) throw yearsError;
      setYears(yearsData || []);

      // Fetch branches for programs in this university
      const { data: branchesData, error: branchesError } = await supabase
        .from('branches')
        .select('id, name, code, program_id')
        .order('name');

      if (branchesError) throw branchesError;
      setBranches(branchesData || []);

      // Fetch all courses initially
      const { data: coursesData, error: coursesError } = await supabase
        .from('courses')
        .select('*')
        .order('course_code');

      if (coursesError) throw coursesError;
      setCourses(coursesData || []);
    } catch (error: any) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (course?: Course) => {
    if (course) {
      console.log('Opening edit dialog for course:', {
        id: course.id,
        course_type: course.course_type,
        course_type_typeof: typeof course.course_type,
        full_course: course
      });
      setEditingCourse(course);
      const courseTypeValue = course.course_type?.toLowerCase() || 'theory';
      console.log('Setting course_type to:', courseTypeValue);
      setFormData({
        program_id: course.program_id,
        branch_id: course.branch_id,
        course_code: course.code,
        course_name: course.name,
        credits: course.credit_hours,
        course_type: courseTypeValue,
        description: course.description || '',
        is_active: course.is_active
      });
    } else {
      setEditingCourse(null);
      setFormData({
        program_id: '',
        branch_id: selectedBranch || '',
        course_code: '',
        course_name: '',
        credits: 3,
        course_type: 'theory',
        description: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCourse(null);
    setFormData({
      program_id: '',
      branch_id: selectedBranch || '',
      course_code: '',
      course_name: '',
      credits: 3,
      course_type: 'theory',
      description: '',
      is_active: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.program_id) {
      toast.error('Please select a program');
      return;
    }
    if (!formData.branch_id) {
      toast.error('Please select a branch');
      return;
    }

    const validCourseTypes = ['theory', 'practical', 'project', 'seminar'];
    const courseType = formData.course_type?.toLowerCase() || 'theory';
    
    if (!validCourseTypes.includes(courseType)) {
      console.error('Invalid course type:', courseType);
      toast.error(`Invalid course type: ${courseType}. Must be one of: ${validCourseTypes.join(', ')}`);
      return;
    }

    try {
      const dataToSave = {
        university_id: universityId,
        program_id: formData.program_id,
        branch_id: formData.branch_id,
        code: formData.course_code,
        name: formData.course_name,
        credit_hours: parseInt(String(formData.credits)) || 3,
        course_type: courseType,
        description: formData.description && formData.description.trim() ? formData.description.trim() : null,
        is_active: Boolean(formData.is_active)
      };

      console.log('Course form submission:', {
        isEditing: !!editingCourse,
        courseId: editingCourse?.id,
        payload: dataToSave,
        payloadTypes: {
          program_id: typeof dataToSave.program_id,
          branch_id: typeof dataToSave.branch_id,
          code: typeof dataToSave.code,
          name: typeof dataToSave.name,
          credit_hours: typeof dataToSave.credit_hours,
          course_type: typeof dataToSave.course_type,
          description: typeof dataToSave.description,
          is_active: typeof dataToSave.is_active
        }
      });

      if (editingCourse) {
        // Update existing course
        console.log('Sending UPDATE request for course:', editingCourse.id);
        const { error, data } = await supabase
          .from('courses')
          .update(dataToSave)
          .eq('id', editingCourse.id);
        
        console.log('UPDATE response:', { error, data });
        if (error) throw error;
        toast.success('Course updated successfully');
      } else {
        // Create new course
        console.log('Sending INSERT request for new course');
        const { error, data } = await supabase
          .from('courses')
          .insert([dataToSave]);
        
        console.log('INSERT response:', { error, data });
        if (error) throw error;
        toast.success('Course added successfully');
      }
      
      handleCloseDialog();
      fetchInitialData();
    } catch (error: any) {
      console.error('Error saving course:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details
      });
      toast.error(error.message || 'Failed to save course');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this course?')) return;
    
    try {
      const { error } = await supabase
        .from('courses')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Course deleted successfully');
      fetchInitialData();
    } catch (error: any) {
      console.error('Error deleting course:', error);
      toast.error(error.message || 'Failed to delete course');
    }
  };

  const toggleProgram = (programId: string) => {
    const newExpanded = new Set(expandedPrograms);
    if (newExpanded.has(programId)) {
      newExpanded.delete(programId);
    } else {
      newExpanded.add(programId);
    }
    setExpandedPrograms(newExpanded);
  };

  const toggleBranch = (branchId: string) => {
    const newExpanded = new Set(expandedBranches);
    if (newExpanded.has(branchId)) {
      newExpanded.delete(branchId);
    } else {
      newExpanded.add(branchId);
    }
    setExpandedBranches(newExpanded);
  };

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProgram = !selectedProgram || course.program_id === selectedProgram;
    const matchesBranch = !selectedBranch || course.branch_id === selectedBranch;
    
    // Year filter disabled - courses no longer have semester field
    const matchesYear = true;

    return matchesSearch && matchesProgram && matchesBranch && matchesYear;
  });

  const getBranchDisplay = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    return branch ? `${branch.code} - ${branch.name}` : 'Unknown';
  };

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
            <div className="flex justify-between items-start">
              <div>
                <PageHeader
                  title="Course Management"
                  description="Organize courses by branch, academic year, and semester"
                  icon={<BookMarked />}
                />
              </div>
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2 bg-primary hover:bg-primary/90">
                <Plus className="h-4 w-4" />
                Add Course
              </Button>
            </div>

            {/* Filter Section */}
            <div className="bg-card rounded-lg border border-border p-4 space-y-4">
              <div className="flex items-center gap-2 text-sm font-semibold">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Search Input */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Search Courses</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                    <Input
                      type="text"
                      placeholder="Search by code, name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10 bg-input border-border/50"
                    />
                  </div>
                </div>

                {/* Program Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Program</label>
                  <Select value={selectedProgram} onValueChange={setSelectedProgram}>
                    <SelectTrigger className="bg-input border-border/50">
                      <SelectValue placeholder="All Programs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Programs</SelectItem>
                      {programs.map((program) => (
                        <SelectItem key={program.id} value={program.id}>
                          {program.code} - {program.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Branch Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Branch</label>
                  <Select value={selectedBranch} onValueChange={setSelectedBranch}>
                    <SelectTrigger className="bg-input border-border/50">
                      <SelectValue placeholder="All Branches" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Branches</SelectItem>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.code} - {branch.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Year Filter */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Academic Year</label>
                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="bg-input border-border/50">
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Years</SelectItem>
                      {years.map((year) => (
                        <SelectItem key={year.id} value={year.id}>
                          Year {year.year_number} ({year.academic_year})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Active Filters Display */}
              {(selectedBranch || selectedYear || searchTerm) && (
                <div className="flex flex-wrap gap-2 pt-2 border-t border-border/50">
                  {searchTerm && (
                    <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                      Search: {searchTerm}
                      <button onClick={() => setSearchTerm('')} className="ml-1 hover:opacity-70">✕</button>
                    </div>
                  )}
                  {selectedBranch && (
                    <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                      Branch: {branches.find(b => b.id === selectedBranch)?.code}
                      <button onClick={() => setSelectedBranch('')} className="ml-1 hover:opacity-70">✕</button>
                    </div>
                  )}
                  {selectedYear && (
                    <div className="inline-flex items-center gap-1 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-medium">
                      Year {years.find(y => y.id === selectedYear)?.year_number}
                      <button onClick={() => setSelectedYear('')} className="ml-1 hover:opacity-70">✕</button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Results Summary */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing <span className="font-semibold text-foreground">{filteredCourses.length}</span> course{filteredCourses.length !== 1 ? 's' : ''}
                {courses.length > filteredCourses.length && ` of ${courses.length} total`}
              </div>
            </div>

            {/* Courses Hierarchical Card View */}
            <div className="space-y-4">
              {filteredCourses.length === 0 ? (
                <div className="bg-card rounded-lg border border-border p-8 text-center">
                  <BookMarked className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">
                    {searchTerm || selectedBranch || selectedYear 
                      ? 'No courses match your filters' 
                      : 'No courses added yet'}
                  </p>
                  {!selectedBranch && !selectedYear && !searchTerm && (
                    <Button onClick={() => handleOpenDialog()} variant="outline" size="sm" className="mt-4">
                      <Plus className="h-3 w-3 mr-1" />
                      Add First Course
                    </Button>
                  )}
                </div>
              ) : (
                programs
                  .filter(program => 
                    filteredCourses.some(course => course.program_id === program.id)
                  )
                  .map((program) => {
                    const programCourses = filteredCourses.filter(c => c.program_id === program.id);
                    const programBranches = Array.from(new Set(programCourses.map(c => c.branch_id)));
                    const isExpanded = expandedPrograms.has(program.id);

                    return (
                      <div key={program.id} className="bg-card rounded-lg border border-border overflow-hidden">
                        {/* Program Header */}
                        <button
                          onClick={() => toggleProgram(program.id)}
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
                              const branchExpanded = expandedBranches.has(branchKey);

                              return (
                                <div key={branchId}>
                                  {/* Branch Header */}
                                  <button
                                    onClick={() => toggleBranch(branchKey)}
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
                                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {branchCourses.map((course) => (
                                          <div
                                            key={course.id}
                                            className="bg-card border border-border rounded-lg p-4 hover:border-primary/50 hover:shadow-md transition-all group"
                                          >
                                            {/* Course Header */}
                                            <div className="space-y-2 mb-3 pb-3 border-b border-border/50">
                                              <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                  <p className="text-xs font-mono text-primary font-semibold">{course.code}</p>
                                                  <h5 className="font-semibold text-foreground line-clamp-2 text-sm">
                                                    {course.name}
                                                  </h5>
                                                </div>
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-md flex-shrink-0 ${
                                                  course.is_active 
                                                    ? 'bg-green-100/20 text-green-300' 
                                                    : 'bg-red-100/20 text-red-300'
                                                }`}>
                                                  {course.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                              </div>
                                              {course.description && (
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                  {course.description}
                                                </p>
                                              )}
                                            </div>

                                            {/* Course Details */}
                                            <div className="grid grid-cols-2 gap-3 mb-4">
                                              <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground font-medium">Credits</p>
                                                <p className="text-sm font-semibold text-foreground">
                                                  {course.credit_hours}
                                                </p>
                                              </div>
                                              <div className="space-y-1">
                                                <p className="text-xs text-muted-foreground font-medium">Type</p>
                                                <p className="text-xs font-semibold capitalize bg-blue-100/20 text-blue-300 px-2 py-1 rounded-md w-fit">
                                                  {course.course_type}
                                                </p>
                                              </div>
                                            </div>

                                            {/* Actions */}
                                            <div className="flex gap-2 pt-3 border-t border-border/50">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenDialog(course)}
                                                className="flex-1 h-8"
                                              >
                                                <Pencil className="h-3 w-3 mr-1" />
                                                Edit
                                              </Button>
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleDelete(course.id)}
                                                className="flex-1 h-8 hover:bg-destructive/10 hover:text-destructive text-destructive"
                                              >
                                                <Trash2 className="h-3 w-3 mr-1" />
                                                Delete
                                              </Button>
                                            </div>
                                          </div>
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
                  })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingCourse ? 'Edit Course' : 'Add New Course'}</DialogTitle>
            <DialogDescription>
              {editingCourse ? 'Update course information' : 'Enter details to add a new course'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4 px-1 max-h-[60vh] overflow-y-auto scrollbar-invisible-dark">
              {/* Program Selection (Required) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Program <span className="text-red-500">*</span>
                </label>
                <Select value={formData.program_id} onValueChange={(value) => setFormData({ ...formData, program_id: value, branch_id: '' })}>
                  <SelectTrigger className="border-border/50">
                    <SelectValue placeholder="Select a program" />
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

              {/* Branch Selection (Required) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Branch <span className="text-red-500">*</span>
                </label>
                <Select value={formData.branch_id} onValueChange={(value) => setFormData({ ...formData, branch_id: value })} disabled={!formData.program_id}>
                  <SelectTrigger className="border-border/50">
                    <SelectValue placeholder={formData.program_id ? "Select a branch" : "Select a program first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {branches
                      .filter(b => b.program_id === formData.program_id)
                      .map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.code} - {branch.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Course Code */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Course Code <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.course_code}
                  onChange={(e) => setFormData({ ...formData, course_code: e.target.value.toUpperCase() })}
                  placeholder="CS101"
                  maxLength={20}
                  className="border-border/50"
                />
              </div>

              {/* Course Name */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Course Name <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.course_name}
                  onChange={(e) => setFormData({ ...formData, course_name: e.target.value })}
                  placeholder="Introduction to Programming"
                  className="border-border/50"
                />
              </div>

              {/* Credits */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Credits <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  type="number"
                  min="1"
                  max="10"
                  value={formData.credits}
                  onChange={(e) => setFormData({ ...formData, credits: parseInt(e.target.value) })}
                  placeholder="3"
                  className="border-border/50"
                />
              </div>

              {/* Course Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Course Type <span className="text-red-500">*</span>
                </label>
                <Select value={formData.course_type} onValueChange={(value) => {
                  console.log('Course type changed to:', value);
                  setFormData({ ...formData, course_type: value });
                }}>
                  <SelectTrigger className="border-border/50">
                    <SelectValue placeholder="Select course type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="practical">Practical</SelectItem>
                    <SelectItem value="project">Project</SelectItem>
                    <SelectItem value="seminar">Seminar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Course description..."
                  className="w-full px-3 py-2 border border-border/50 rounded-md bg-input text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  rows={3}
                />
              </div>

              {/* Active Status */}
              <div className="border-t border-border/50 pt-4">
                <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md transition">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="rounded w-4 h-4 cursor-pointer"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>
            </div>
            
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary hover:bg-primary/90">
                {editingCourse ? 'Update' : 'Add'} Course
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(CourseManagement);
