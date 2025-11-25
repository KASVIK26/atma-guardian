import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { PageHeader } from '@/components/layout/PageHeader';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { withAuth } from '../lib/withAuth';
import { Users, Search, Download, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface StudentEnrollment {
  id: string;
  university_id: string;
  section_id: string;
  student_id?: string;
  first_name: string;
  last_name: string;
  batch?: string;
  email: string;
  enrollment_no: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

interface Section {
  id: string;
  name: string;
  code: string;
  semester_id: string;
}

interface Semester {
  id: string;
  name: string;
  program_id: string;
}

interface Program {
  id: string;
  name: string;
}

function ManageStudents({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<StudentEnrollment[]>([]);
  
  // Filter states
  const [programs, setPrograms] = useState<Program[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  
  const [selectedProgram, setSelectedProgram] = useState('all');
  const [selectedSemester, setSelectedSemester] = useState('all');
  const [selectedSection, setSelectedSection] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  useEffect(() => {
    if (currentPage !== 'manage-students') {
      setCurrentPage('manage-students');
    }
    fetchData();
  }, [currentPage, setCurrentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('student_enrollments')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
      
      // Fetch programs
      const { data: programsData, error: programsError } = await supabase
        .from('programs')
        .select('id, name')
        .order('name');
      
      if (programsError) throw programsError;
      setPrograms(programsData || []);
      
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load students data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch semesters when program is selected
  const handleProgramChange = async (programId: string) => {
    setSelectedProgram(programId);
    setSelectedSemester('all');
    setSelectedSection('all');
    setSemesters([]);
    setSections([]);
    
    if (programId === 'all') return;
    
    try {
      const { data, error } = await supabase
        .from('semesters')
        .select('id, name, program_id')
        .eq('program_id', programId)
        .order('name');
      
      if (error) throw error;
      setSemesters(data || []);
    } catch (error) {
      console.error('Error fetching semesters:', error);
    }
  };

  // Fetch sections when semester is selected
  const handleSemesterChange = async (semesterId: string) => {
    setSelectedSemester(semesterId);
    setSelectedSection('all');
    setSections([]);
    
    if (semesterId === 'all') return;
    
    try {
      const { data, error } = await supabase
        .from('sections')
        .select('id, name, code, semester_id')
        .eq('semester_id', semesterId)
        .order('code');
      
      if (error) throw error;
      setSections(data || []);
    } catch (error) {
      console.error('Error fetching sections:', error);
    }
  };

  // Filter students based on all criteria
  useEffect(() => {
    let filtered = students;
    
    // Filter by search term (name, email, enrollment number)
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.first_name.toLowerCase().includes(term) ||
        s.last_name.toLowerCase().includes(term) ||
        s.email.toLowerCase().includes(term) ||
        s.enrollment_no.toLowerCase().includes(term)
      );
    }
    
    // Filter by status
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active';
      filtered = filtered.filter(s => s.is_active === isActive);
    }
    
    // Filter by section (which implicitly filters by semester and program)
    if (selectedSection !== 'all') {
      filtered = filtered.filter(s => s.section_id === selectedSection);
    } else if (selectedSemester !== 'all') {
      // Get sections for this semester and filter
      const sectionIds = sections.map(s => s.id);
      filtered = filtered.filter(s => sectionIds.includes(s.section_id));
    } else if (selectedProgram !== 'all') {
      // Get all semesters and sections for this program and filter
      const programSemesters = semesters.map(s => s.id);
      const programSections = sections.map(s => s.id);
      // This would require fetching all sections for the program
      // For now, we'll need to refetch
    }
    
    setFilteredStudents(filtered);
  }, [students, searchTerm, statusFilter, selectedSection, selectedSemester, selectedProgram, sections]);

  const handleExport = () => {
    // CSV export functionality
    const csv = [
      ['First Name', 'Last Name', 'Email', 'Enrollment No', 'Batch', 'Status', 'Created At'],
      ...filteredStudents.map(s => [
        s.first_name,
        s.last_name,
        s.email,
        s.enrollment_no,
        s.batch || '-',
        s.is_active ? 'Active' : 'Pending',
        s.created_at ? new Date(s.created_at).toLocaleDateString() : '-'
      ])
    ]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().getTime()}.csv`;
    a.click();
    toast.success('Students exported successfully');
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
        <div className="flex-1 flex flex-col overflow-hidden">
          <Navbar showProfileMenu />
          <div className="flex items-center justify-center flex-1">
            <div className="text-center">
              <Users className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">Loading students...</p>
            </div>
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
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <PageHeader
              title="Manage Students"
              description={`Viewing ${filteredStudents.length} of ${students.length} students`}
              icon={<Users />}
            />

            {/* Filters Card */}
            <Card className="border-2">
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Filter className="h-5 w-5" />
                  <CardTitle className="text-lg">Filters</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  {/* Search Bar */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Name, email, enrollment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>

                  {/* Program Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Program</label>
                    <Select value={selectedProgram} onValueChange={handleProgramChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Programs" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Programs</SelectItem>
                        {programs.map(p => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Semester Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Semester</label>
                    <Select 
                      value={selectedSemester} 
                      onValueChange={handleSemesterChange}
                      disabled={selectedProgram === 'all'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Semesters" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Semesters</SelectItem>
                        {semesters.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Section Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Section</label>
                    <Select 
                      value={selectedSection} 
                      onValueChange={setSelectedSection}
                      disabled={selectedSemester === 'all' && selectedProgram === 'all'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Sections" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Sections</SelectItem>
                        {sections.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.code} - {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Status Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="active">Active (Signed Up)</SelectItem>
                        <SelectItem value="pending">Pending (Not Signed Up)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Students Table Card */}
            <Card className="border-2">
              <CardHeader className="flex flex-row items-center justify-between pb-4">
                <div>
                  <CardTitle>Students List</CardTitle>
                  <CardDescription>
                    Total: {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
                  </CardDescription>
                </div>
                <Button 
                  onClick={handleExport}
                  variant="outline"
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader className="bg-muted">
                      <TableRow>
                        <TableHead className="font-semibold">Name</TableHead>
                        <TableHead className="font-semibold">Enrollment No</TableHead>
                        <TableHead className="font-semibold">Email</TableHead>
                        <TableHead className="font-semibold">Batch</TableHead>
                        <TableHead className="font-semibold">Status</TableHead>
                        <TableHead className="font-semibold">Joined</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            No students found matching your filters.
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map(student => (
                          <TableRow key={student.id} className="hover:bg-muted/50">
                            <TableCell className="font-medium">
                              {student.first_name} {student.last_name}
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                              {student.enrollment_no}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {student.email}
                            </TableCell>
                            <TableCell>
                              {student.batch ? (
                                <Badge variant="outline">{student.batch}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {student.is_active ? (
                                <Badge className="bg-green-600 hover:bg-green-700">
                                  Active
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {student.created_at 
                                ? new Date(student.created_at).toLocaleDateString()
                                : '-'
                              }
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(ManageStudents);
