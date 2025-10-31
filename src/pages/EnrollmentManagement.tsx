import { useState, useEffect } from 'react';
import { Upload, ChevronLeft, Users, Download, Trash2, Plus, Search, Loader2, Check, AlertTriangle } from 'lucide-react';
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
import * as XLSX from 'xlsx';

interface StudentEnrollment {
  id: string;
  student_id?: string;
  roll_number: string;
  student_name: string;
  batch?: string;
  email?: string;
  reg_mail_id?: string;
  enrollment_date?: string;
}

interface ColumnMapping {
  [key: string]: string; // DB column -> File column
}

function EnrollmentManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [sectionId, setSectionId] = useState<string | null>(null);
  const [sectionData, setSectionData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [students, setStudents] = useState<StudentEnrollment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [parseStatus, setParseStatus] = useState('idle');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<StudentEnrollment | null>(null);
  const [studentForm, setStudentForm] = useState({
    student_id: '',
    roll_number: '',
    student_name: '',
    batch: '',
    email: '',
    reg_mail_id: ''
  });
  
  // Column mapping for file upload
  const [mappingDialogOpen, setMappingDialogOpen] = useState(false);
  const [fileData, setFileData] = useState<any[]>([]); // Parsed data (StudentEnrollment objects)
  const [rawFileData, setRawFileData] = useState<any[][]>([]); // Raw rows from file for preview
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    roll_number: 'skip',
    student_name: 'skip',
    email: 'skip',
    batch: 'skip'
  });
  const [fileColumns, setFileColumns] = useState<string[]>([]);

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
      console.error('No sectionId in URL params');
      toast.error('No section selected');
      setTimeout(() => navigate('/university'), 1500);
    }
  }, [currentPage, setCurrentPage, navigate]);

  const fetchEnrollmentData = async (id: string) => {
    try {
      setLoading(true);
      console.log('Fetching enrollment data for section:', id);
      
      // Fetch section details
      const { data: section, error: sectionError } = await supabase
        .from('sections')
        .select('*, branches(name, code), years(academic_year, year_number)')
        .eq('id', id)
        .single();
      
      if (sectionError) {
        console.error('Error fetching section:', sectionError);
        throw sectionError;
      }
      
      if (!section) {
        console.error('Section not found:', id);
        toast.error('Section not found');
        navigate('/university');
        return;
      }
      
      console.log('Section loaded:', section);
      setSectionData(section);

      // Fetch enrolled students - try primary table first
      console.log('Attempting to fetch from student_enrollments...');
      const { data: enrolled, error: enrollError } = await supabase
        .from('student_enrollments')
        .select('*')
        .eq('section_id', id);
      
      if (enrollError) {
        console.warn('student_enrollments query error, trying student_enrollment:', enrollError);
        // Try alternate table name
        const { data: alt, error: altError } = await supabase
          .from('student_enrollment')
          .select('*')
          .eq('section_id', id);
        
        if (altError) {
          console.warn('Both table queries failed, showing empty list:', altError);
          setStudents([]);
        } else {
          console.log('Got data from student_enrollment:', alt?.length || 0, 'records');
          setStudents(alt || []);
        }
      } else {
        console.log('Got data from student_enrollments:', enrolled?.length || 0, 'records');
        setStudents(enrolled || []);
      }
    } catch (error: any) {
      console.error('Error in fetchEnrollmentData:', error);
      toast.error(error.message || 'Failed to load enrollment data');
      setSectionData(null);
      setStudents([]);
    } finally {
      setLoading(false);
      console.log('Loading complete');
    }
  };

  const handleFileUpload = async (file: File) => {
    try {
      setUploadProgress(10);
      setParseStatus('parsing');
      setUploadedFile(file);

      // Parse the file to get raw data
      const result = await parseFile(file, 'enrollment');
      
      if (result.success && result.data.length > 0) {
        // Extract actual file columns from the first data row
        // The file columns should be obtained from the raw header row
        // For now, we'll use the keys from parsed data, but filter to actual columns with data
        const sampleRow = result.data[0] || {};
        let fileColumns = Object.keys(sampleRow).filter(key => {
          // Filter out undefined or empty string values from column names
          return key && key.trim() !== '';
        });
        
        let rawData: any[][] = [];
        
        // If we still have placeholder columns, try to get headers from file directly
        if (fileColumns.length < 4 || fileColumns.some(col => col === 'studentId')) {
          // Re-parse to get raw headers
          try {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
            
            if (rawData && rawData.length > 0) {
              // First row is the header
              const headerRow = (rawData[0] as any[]).filter(cell => cell && cell.toString().trim() !== '');
              fileColumns = headerRow.map(cell => cell.toString().trim());
              
              // Store raw data without header row for preview
              setRawFileData(rawData.slice(1));
            }
          } catch (err) {
            console.warn('Could not extract raw headers:', err);
            setRawFileData([]);
          }
        } else {
          setRawFileData([]);
        }
        
        setFileColumns(fileColumns);
        setFileData(result.data);
        
        // Show mapping dialog
        setMappingDialogOpen(true);
        setUploadProgress(0);
        setParseStatus('idle');
      } else {
        setParseStatus('error');
        toast.error(`Failed to parse file: ${result.errors?.join(', ') || 'Unknown error'}`);
        setUploadProgress(0);
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setParseStatus('error');
      toast.error('Failed to upload file');
      setUploadProgress(0);
    }
  };

  const handleConfirmMapping = async () => {
    try {
      // Transform file data using column mapping
      const dataToProcess = rawFileData.length > 0 ? rawFileData : fileData;
      
      const newStudents: StudentEnrollment[] = dataToProcess.map((row: any) => {
        // If it's raw array data, use column indices
        if (Array.isArray(row)) {
          const rollIdx = fileColumns.indexOf(columnMapping.roll_number);
          const nameIdx = fileColumns.indexOf(columnMapping.student_name);
          const emailIdx = fileColumns.indexOf(columnMapping.email);
          const batchIdx = fileColumns.indexOf(columnMapping.batch);
          
          return {
            id: `${Date.now()}-${Math.random()}`,
            student_id: '',
            roll_number: columnMapping.roll_number !== 'skip' && rollIdx >= 0 ? (row[rollIdx]?.toString().trim() || '') : '',
            student_name: columnMapping.student_name !== 'skip' && nameIdx >= 0 ? (row[nameIdx]?.toString().trim() || '') : '',
            batch: columnMapping.batch !== 'skip' && batchIdx >= 0 ? (row[batchIdx]?.toString().trim() || '') : '',
            email: columnMapping.email !== 'skip' && emailIdx >= 0 ? (row[emailIdx]?.toString().trim() || '') : '',
            reg_mail_id: ''
          };
        }
        
        // If it's parsed object data, use field names
        return {
          id: `${Date.now()}-${Math.random()}`,
          student_id: columnMapping.student_id !== 'skip' ? (row[columnMapping.student_id] || '') : '',
          roll_number: columnMapping.roll_number !== 'skip' ? (row[columnMapping.roll_number] || '') : '',
          student_name: columnMapping.student_name !== 'skip' ? (row[columnMapping.student_name] || '') : '',
          batch: columnMapping.batch !== 'skip' ? (row[columnMapping.batch] || '') : '',
          email: columnMapping.email !== 'skip' ? (row[columnMapping.email] || '') : '',
          reg_mail_id: columnMapping.reg_mail_id !== 'skip' ? (row[columnMapping.reg_mail_id] || '') : ''
        };
      });
      
      // Add to local state first (preview before saving)
      setStudents(prev => [...prev, ...newStudents]);
      toast.success(`${newStudents.length} students imported (preview only). Click "Save Enrollment" to confirm.`);
      
      setMappingDialogOpen(false);
      setFileData([]);
      setRawFileData([]);
      setFileColumns([]);
      setColumnMapping({ roll_number: 'skip', student_name: 'skip', email: 'skip', batch: 'skip' });
      setUploadedFile(null);
    } catch (error) {
      console.error('Error confirming mapping:', error);
      toast.error('Failed to process mapped data');
    }
  };

  const handleAddStudent = () => {
    setEditingStudent(null);
    setStudentForm({ student_id: '', roll_number: '', student_name: '', batch: '', email: '', reg_mail_id: '' });
    setDialogOpen(true);
  };

  const handleEditStudent = (student: StudentEnrollment) => {
    setEditingStudent(student);
    setStudentForm({
      student_id: student.student_id || '',
      roll_number: student.roll_number,
      student_name: student.student_name,
      batch: student.batch || '',
      email: student.email || '',
      reg_mail_id: student.reg_mail_id || ''
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
      const enrollmentData = students
        .filter(s => s.student_id || s.roll_number) // Only save records with at least ID or roll number
        .map(s => ({
          section_id: sectionId,
          student_id: s.student_id || null,
          roll_number: s.roll_number,
          batch: s.batch || null,
          email: s.email || null,
          reg_mail_id: s.reg_mail_id || null,
          enrollment_date: new Date().toISOString(),
          is_active: true
        }));

      if (enrollmentData.length === 0) {
        toast.error('No valid students to save');
        return;
      }

      // Try primary table first
      let error;
      let result = await supabase
        .from('student_enrollments')
        .upsert(enrollmentData);
      
      error = result.error;
      
      // Fallback to alternate table name
      if (error?.message.includes('not found')) {
        result = await supabase
          .from('student_enrollment')
          .upsert(enrollmentData);
        error = result.error;
      }

      if (error) throw error;
      
      toast.success(`${enrollmentData.length} enrollments saved successfully`);
      fetchEnrollmentData(sectionId);
    } catch (error) {
      console.error('Error saving enrollment:', error);
      toast.error('Failed to save enrollment');
    }
  };

  const filteredStudents = students.filter(s =>
    (s.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     s.roll_number.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedBatch === 'all' || s.batch === selectedBatch)
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
          {!loading && !sectionData ? (
            <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
              <AlertTriangle className="h-12 w-12 text-destructive" />
              <div className="text-center space-y-2">
                <h2 className="text-lg font-semibold">Section Not Found</h2>
                <p className="text-sm text-muted-foreground">The section you're trying to access doesn't exist or has been deleted.</p>
              </div>
              <Button onClick={() => navigate('/university')} variant="outline" className="gap-2">
                <ChevronLeft className="h-4 w-4" />
                Back to University
              </Button>
            </div>
          ) : (
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
                  <SelectItem value="all">All Batches</SelectItem>
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
          )}
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

      {/* Column Mapping Dialog */}
      <Dialog open={mappingDialogOpen} onOpenChange={setMappingDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-invisible-dark">
          <DialogHeader>
            <DialogTitle>Map File Columns to Database Fields</DialogTitle>
            <DialogDescription>
              Match columns from your file to database fields. Preview shows {fileData.length} records to be imported.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Column Mapping Grid */}
            <div className="border rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium">File contains {fileColumns.length} columns. Map required fields:</p>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-red-500">Roll Number *</label>
                  <Select value={columnMapping.roll_number} onValueChange={(val) => setColumnMapping({...columnMapping, roll_number: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column" />
                    </SelectTrigger>
                    <SelectContent>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">Student Name (Required)</label>
                  <Select value={columnMapping.student_name} onValueChange={(val) => setColumnMapping({...columnMapping, student_name: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column or skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Skip this field —</SelectItem>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">Email (Optional)</label>
                  <Select value={columnMapping.email} onValueChange={(val) => setColumnMapping({...columnMapping, email: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column or skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Skip this field —</SelectItem>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold">Batch (Optional)</label>
                  <Select value={columnMapping.batch} onValueChange={(val) => setColumnMapping({...columnMapping, batch: val})}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select column or skip" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skip">— Skip this field —</SelectItem>
                      {fileColumns.map(col => (
                        <SelectItem key={col} value={col}>
                          {col}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Live Preview */}
            <div className="border rounded-lg p-4 bg-muted/30">
              <p className="text-sm font-medium mb-3 text-foreground">Preview (First 3 Records):</p>
              <div className="overflow-x-auto">
                <Table className="text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted">
                      <TableHead className="text-foreground">Roll #</TableHead>
                      <TableHead className="text-foreground">Name</TableHead>
                      <TableHead className="text-foreground">Email</TableHead>
                      <TableHead className="text-foreground">Batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(rawFileData.length > 0 ? rawFileData : fileData).slice(0, 3).map((row: any, idx: number) => {
                      // If using raw file data (array format)
                      if (Array.isArray(row)) {
                        // Get column indices from fileColumns
                        const rollIdx = fileColumns.indexOf(columnMapping.roll_number);
                        const nameIdx = fileColumns.indexOf(columnMapping.student_name);
                        const emailIdx = fileColumns.indexOf(columnMapping.email);
                        const batchIdx = fileColumns.indexOf(columnMapping.batch);
                        
                        return (
                          <TableRow key={idx} className="hover:bg-muted/50">
                            <TableCell className="font-mono text-xs">{rollIdx >= 0 && row[rollIdx] ? row[rollIdx] : '—'}</TableCell>
                            <TableCell className="text-xs">{nameIdx >= 0 && row[nameIdx] ? row[nameIdx] : '—'}</TableCell>
                            <TableCell className="text-xs text-muted-foreground">{emailIdx >= 0 && row[emailIdx] ? row[emailIdx] : '—'}</TableCell>
                            <TableCell className="text-xs">{batchIdx >= 0 && row[batchIdx] ? row[batchIdx] : '—'}</TableCell>
                          </TableRow>
                        );
                      }
                      
                      // If using parsed data (object format)
                      return (
                        <TableRow key={idx} className="hover:bg-muted/50">
                          <TableCell className="font-mono text-xs">{row.rollNumber || row.roll_number || '—'}</TableCell>
                          <TableCell className="text-xs">{row.name || row.student_name || '—'}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{row.email || '—'}</TableCell>
                          <TableCell className="text-xs">{row.batch || '—'}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setMappingDialogOpen(false);
              setFileData([]);
              setRawFileData([]);
              setFileColumns([]);
              setColumnMapping({ roll_number: 'skip', student_name: 'skip', email: 'skip', batch: 'skip' });
            }}>
              Cancel & Clear
            </Button>
            <Button 
              onClick={handleConfirmMapping}
              disabled={!columnMapping.roll_number || !columnMapping.student_name}
              className="gap-2"
            >
              <Check className="h-4 w-4" />
              Import {fileData.length} Students
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(EnrollmentManagement);
