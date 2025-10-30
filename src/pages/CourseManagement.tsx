import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, BookMarked, Filter } from 'lucide-react';
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
  branch_id: string;
  course_code: string;
  course_name: string;
  credits: number;
  course_type: string;
  semester: number;
  description: string;
  is_active: boolean;
  created_at: string;
}

interface Branch {
  id: string;
  name: string;
  code: string;
}

interface Year {
  id: string;
  academic_year: string;
  year_number: number;
}

function CourseManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [courses, setCourses] = useState<Course[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    branch_id: '',
    course_code: '',
    course_name: '',
    credits: 3,
    course_type: 'theory',
    semester: 1,
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

      // Fetch user's university_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('university_id')
        .eq('id', user.id)
        .single();

      if (userError) throw userError;
      
      const universityId = userData?.university_id;

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
        .select('id, name, code')
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
      setEditingCourse(course);
      setFormData({
        branch_id: course.branch_id,
        course_code: course.course_code,
        course_name: course.course_name,
        credits: course.credits,
        course_type: course.course_type,
        semester: course.semester,
        description: course.description,
        is_active: course.is_active
      });
    } else {
      setEditingCourse(null);
      setFormData({
        branch_id: selectedBranch || '',
        course_code: '',
        course_name: '',
        credits: 3,
        course_type: 'theory',
        semester: 1,
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
      branch_id: selectedBranch || '',
      course_code: '',
      course_name: '',
      credits: 3,
      course_type: 'theory',
      semester: 1,
      description: '',
      is_active: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.branch_id) {
      toast.error('Please select a branch');
      return;
    }

    try {
      const dataToSave = {
        branch_id: formData.branch_id,
        course_code: formData.course_code,
        course_name: formData.course_name,
        credits: formData.credits,
        course_type: formData.course_type,
        semester: formData.semester,
        description: formData.description,
        is_active: formData.is_active
      };

      if (editingCourse) {
        // Update existing course
        const { error } = await supabase
          .from('courses')
          .update(dataToSave)
          .eq('id', editingCourse.id);
        
        if (error) throw error;
        toast.success('Course updated successfully');
      } else {
        // Create new course
        const { error } = await supabase
          .from('courses')
          .insert([dataToSave]);
        
        if (error) throw error;
        toast.success('Course added successfully');
      }
      
      handleCloseDialog();
      fetchInitialData();
    } catch (error: any) {
      console.error('Error saving course:', error);
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

  const filteredCourses = courses.filter(course => {
    const matchesSearch = 
      course.course_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      course.course_type.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesBranch = !selectedBranch || course.branch_id === selectedBranch;
    
    // Filter by year based on semester (assuming standard 2-semester academic year)
    const matchesYear = !selectedYear || (() => {
      // Semesters 1-2 = Year 1, 3-4 = Year 2, etc.
      const courseYear = Math.ceil(course.semester / 2);
      const year = years.find(y => y.id === selectedYear);
      return year && courseYear === year.year_number;
    })();

    return matchesSearch && matchesBranch && matchesYear;
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
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

            {/* Courses Table */}
            <div className="bg-card rounded-lg shadow border border-border overflow-hidden">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="inline-flex flex-col items-center gap-2">
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary"></div>
                    <p className="text-sm text-muted-foreground">Loading courses...</p>
                  </div>
                </div>
              ) : filteredCourses.length === 0 ? (
                <div className="p-8 text-center">
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
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead className="font-semibold">Code</TableHead>
                      <TableHead className="font-semibold">Course Name</TableHead>
                      <TableHead className="font-semibold">Branch</TableHead>
                      <TableHead className="font-semibold">Sem</TableHead>
                      <TableHead className="font-semibold">Type</TableHead>
                      <TableHead className="font-semibold text-center">Credits</TableHead>
                      <TableHead className="font-semibold text-center">Status</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCourses.map((course) => (
                      <TableRow key={course.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-mono font-semibold text-primary">{course.course_code}</TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{course.course_name}</p>
                            {course.description && (
                              <p className="text-xs text-muted-foreground line-clamp-1">{course.description}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">{getBranchDisplay(course.branch_id)}</TableCell>
                        <TableCell className="text-center font-medium">{course.semester}</TableCell>
                        <TableCell>
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-md bg-blue-100/20 text-blue-300 capitalize">
                            {course.course_type}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-muted text-xs font-semibold">
                            {course.credits}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            course.is_active 
                              ? 'bg-green-100/20 text-green-300' 
                              : 'bg-red-100/20 text-red-300'
                          }`}>
                            {course.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenDialog(course)}
                              className="hover:bg-muted"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(course.id)}
                              className="hover:bg-destructive/10 text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
              {/* Branch Selection (Required) */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Branch <span className="text-red-500">*</span>
                </label>
                <Select value={formData.branch_id} onValueChange={(value) => setFormData({ ...formData, branch_id: value })}>
                  <SelectTrigger className="border-border/50">
                    <SelectValue placeholder="Select a branch" />
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

              {/* Credits and Semester */}
              <div className="grid grid-cols-2 gap-4">
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

                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Semester <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    max="8"
                    value={formData.semester}
                    onChange={(e) => setFormData({ ...formData, semester: parseInt(e.target.value) })}
                    placeholder="1"
                    className="border-border/50"
                  />
                </div>
              </div>

              {/* Course Type */}
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Course Type <span className="text-red-500">*</span>
                </label>
                <Select value={formData.course_type} onValueChange={(value) => setFormData({ ...formData, course_type: value })}>
                  <SelectTrigger className="border-border/50">
                    <SelectValue placeholder="Select course type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="theory">Theory</SelectItem>
                    <SelectItem value="practical">Practical</SelectItem>
                    <SelectItem value="hybrid">Hybrid</SelectItem>
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
