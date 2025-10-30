import { useState, useEffect } from 'react';
import { Upload, ChevronLeft, Users, Download, Trash2, Plus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { withAuth } from '../lib/withAuth';
import { Navbar } from '@/components/layout/Navbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { useNavigate } from 'react-router-dom';
import { parseFile } from '@/lib/fileParser';

interface StudentEnrollment {
  id: string;
  roll_number: string;
  student_name: string;
  batch?: string;
  email?: string;
}

function EnrollmentManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseStatus, setParseStatus] = useState('idle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentEnrollment | null>(null);
  const [studentForm, setStudentForm] = useState({
    roll_number: '',
    student_name: '',
    batch: '',
    email: ''
  });

  useEffect(() => {
    if (currentPage !== 'enrollment') {
      setCurrentPage('enrollment');
    }
    
    const params = new URLSearchParams(window.location.search);
    const id = params.get('sectionId');
    if (id) {
      setSectionId(id);
      fetchEnrollmentData(id);
    } else {
      toast.error('No section selected');
      navigate('/university');
    }
  }, [currentPage, setCurrentPage]);

  const fetchEnrollmentData = async (id: string) => {
    try {
      setLoading(true);
      
      // Fetch section details
      const { data: section } = await supabase
        .from('sections')
        .select('*, branches(name, code), years(academic_year, year_number)')
        .eq('id', id)
        .single();
      
      setSectionData(section);

      // Fetch enrolled students
      const { data: enrolled } = await supabase
        .from('student_enrollment')
        .select('*')
        .eq('section_id', id);
      
      setStudents(enrolled || []);
    } catch (error) {
      console.error('Error fetching enrollment data:', error);
      toast.error('Failed to load enrollment data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadProgress(10);
      setParseStatus('parsing');
      setUploadedFile(file);

      const result = await parseFile(file, 'enrollment');
      
      if (result.success) {
        setUploadProgress(100);
        setParseStatus('completed');
        
        // Add new students to the list
        const newStudents: StudentEnrollment[] = result.data.map((student: any) => ({
          id: `${Date.now()}-${Math.random()}`,
          roll_number: student.rollNumber,
          student_name: student.name,
          batch: '',
          email: student.email || ''
        }));
        
        setStudents(prev => [...prev, ...newStudents]);
        toast.success(`${result.data.length} students imported successfully`);
        setUploadProgress(0);
        setParseStatus('idle');
        setUploadedFile(null);
      } else {
        setParseStatus('error');
        toast.error(`Failed to parse file: ${result.errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setParseStatus('error');
      toast.error('Failed to upload file');
    }
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({ roll_number: '', student_name: '', batch: '', email: '' });
    setDialogOpen(true);
  };

  const handleEditStudent = (student: StudentEnrollment) => {
    setEditingStudent(student);
    setStudentForm({
      roll_number: student.roll_number,
      student_name: student.student_name,
      batch: student.batch || '',
      email: student.email || ''
    });
    setDialogOpen(true);
  };

  const handleSaveStudent = async () => {
    if (!studentForm.roll_number || !studentForm.student_name) {
      toast.error('Roll number and name are required');
      return;
    }

    try {
      if (editingStudent) {
        // Update
        setStudents(prev => prev.map(s =>
          s.id === editingStudent.id
            ? { ...s, ...studentForm }
            : s
        ));
        toast.success('Student updated');
      } else {
        // Add new
        const newStudent: StudentEnrollment = {
          id: `${Date.now()}`,
          ...studentForm
        };
        setStudents(prev => [...prev, newStudent]);
        toast.success('Student added');
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Failed to save student');
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (confirm('Are you sure you want to remove this student?')) {
      setStudents(prev => prev.filter(s => s.id !== id));
      toast.success('Student removed');
    }
  };

  const handleSaveEnrollment = async () => {
    try {
      if (!sectionId) return;

      // Save all students to database
      const { error } = await supabase
        .from('student_enrollment')
        .upsert(
          students.map(s => ({
            id: s.id,
            section_id: sectionId,
            roll_number: s.roll_number,
            student_name: s.student_name,
            batch: s.batch,
            email: s.email
          })),
          { onConflict: 'id' }
        );

      if (error) throw error;
      toast.success('Enrollment saved successfully');
    } catch (error) {
      console.error('Error saving enrollment:', error);
      toast.error('Failed to save enrollment');
    }
  };

  const filteredStudents = students.filter(s =>
    (s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (!selectedBatch || s.batch === selectedBatch)
  );

  const batches = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Users className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading enrollment...</p>
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
          <div className="max-w-6xl mx-auto space-y-6">
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
                  <h1 className="text-3xl font-bold">Student Enrollment</h1>
                  {sectionData && (
                    <p className="text-muted-foreground mt-1">
                      {sectionData.branches.code} - Section {sectionData.name} • Year {sectionData.years.year_number}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Export
                </Button>
                <Button onClick={handleSaveEnrollment} className="gap-2">
                  <Upload className="h-4 w-4" />
                  Save Enrollment
                </Button>
              </div>
            </div>

            {/* Upload Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Import Students</CardTitle>
                <CardDescription>Upload a CSV or Excel file with student data</CardDescription>
              </CardHeader>
              
              <CardContent>
                <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center hover:border-primary/50 transition-colors">
                  <label className="cursor-pointer block">
                    <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="font-medium">Click to upload or drag and drop</p>
                    <p className="text-sm text-muted-foreground">CSV, XLSX supported</p>
                    <Input
                      type="file"
                      accept=".csv,.xlsx"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file);
                      }}
                      className="hidden"
                    />
                  </label>
                  {uploadProgress > 0 && (
                    <div className="mt-4">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full transition-all"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{uploadProgress}% - {parseStatus}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Filter Section */}
            <div className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or roll number..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <Select value={selectedBatch} onValueChange={setSelectedBatch}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Batches" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Batches</SelectItem>
                  {batches.map(batch => (
                    <SelectItem key={batch} value={batch}>
                      {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Button onClick={handleAddStudent} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Student
              </Button>
            </div>

            {/* Students Table */}
            <Card>
              <CardHeader>
                <CardTitle>
                  Enrolled Students
                  <Badge className="ml-2">{filteredStudents.length}</Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent>
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">No students enrolled yet</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50">
                          <TableHead>Roll Number</TableHead>
                          <TableHead>Student Name</TableHead>
                          <TableHead>Batch</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      
                      <TableBody>
                        {filteredStudents.map(student => (
                          <TableRow key={student.id} className="hover:bg-muted/50">
                            <TableCell className="font-mono font-semibold">{student.roll_number}</TableCell>
                            <TableCell className="font-medium">{student.student_name}</TableCell>
                            <TableCell>
                              {student.batch ? (
                                <Badge variant="outline">{student.batch}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-sm">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">{student.email}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditStudent(student)}
                                >
                                  Edit
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="text-destructive"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Student Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingStudent ? 'Edit Student' : 'Add Student'}</DialogTitle>
            <DialogDescription>
              {editingStudent ? 'Update student information' : 'Add a new student to enrollment'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Roll Number *</label>
              <Input
                value={studentForm.roll_number}
                onChange={(e) => setStudentForm({...studentForm, roll_number: e.target.value})}
                placeholder="E.g., CS001"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Student Name *</label>
              <Input
                value={studentForm.student_name}
                onChange={(e) => setStudentForm({...studentForm, student_name: e.target.value})}
                placeholder="Full name"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Batch</label>
              <Select value={studentForm.batch} onValueChange={(val) => setStudentForm({...studentForm, batch: val})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select batch" />
                </SelectTrigger>
                <SelectContent>
                  {batches.map(batch => (
                    <SelectItem key={batch} value={batch}>
                      {batch}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Email</label>
              <Input
                type="email"
                value={studentForm.email}
                onChange={(e) => setStudentForm({...studentForm, email: e.target.value})}
                placeholder="student@university.edu"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveStudent}>
              {editingStudent ? 'Update' : 'Add'} Student
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(EnrollmentManagement);
