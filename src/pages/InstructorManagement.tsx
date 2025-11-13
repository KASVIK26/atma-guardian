import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, Mail, Phone, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Sidebar } from '@/components/layout/Sidebar';
import { Navbar } from '@/components/layout/Navbar';
import { PageHeader } from '@/components/layout/PageHeader';
import { withAuth } from '../lib/withAuth';

interface Instructor {
  id: string;
  instructor_code: string;
  full_name: string;
  email: string;
  phone: string;
  department: string;
  qualifications: string;
  is_active: boolean;
  created_at: string;
}

function InstructorManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingInstructor, setEditingInstructor] = useState<Instructor | null>(null);
  const [formData, setFormData] = useState({
    instructor_code: '',
    full_name: '',
    email: '',
    phone: '',
    department: '',
    qualifications: '',
    is_active: true
  });

  useEffect(() => {
    if (currentPage !== 'instructors') {
      setCurrentPage('instructors');
    }
    fetchInstructors();
  }, [currentPage, setCurrentPage]);

  const fetchInstructors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('instructors')
        .select('*')
        .order('instructor_code');
      
      if (error) throw error;
      setInstructors(data || []);
    } catch (error: any) {
      console.error('Error fetching instructors:', error);
      toast.error('Failed to load instructors');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (instructor?: Instructor) => {
    if (instructor) {
      setEditingInstructor(instructor);
      setFormData({
        instructor_code: instructor.instructor_code,
        full_name: instructor.full_name,
        email: instructor.email,
        phone: instructor.phone,
        department: instructor.department,
        qualifications: instructor.qualifications,
        is_active: instructor.is_active
      });
    } else {
      setEditingInstructor(null);
      setFormData({
        instructor_code: '',
        full_name: '',
        email: '',
        phone: '',
        department: '',
        qualifications: '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingInstructor(null);
    setFormData({
      instructor_code: '',
      full_name: '',
      email: '',
      phone: '',
      department: '',
      qualifications: '',
      is_active: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSave = {
        instructor_code: formData.instructor_code,
        full_name: formData.full_name,
        email: formData.email,
        phone: formData.phone,
        department: formData.department,
        qualifications: formData.qualifications,
        is_active: formData.is_active
      };

      console.log('Instructor form submission:', {
        isEditing: !!editingInstructor,
        payload: dataToSave
      });

      if (editingInstructor) {
        // Update existing instructor
        console.log('Sending UPDATE request for instructor:', editingInstructor.id);
        const { error, data } = await supabase
          .from('instructors')
          .update(dataToSave)
          .eq('id', editingInstructor.id);
        
        console.log('UPDATE response:', { error, data });
        if (error) throw error;
        toast.success('Instructor updated successfully');
      } else {
        // Create new instructor
        console.log('Sending INSERT request for new instructor');
        const { error, data } = await supabase
          .from('instructors')
          .insert([dataToSave]);
        
        console.log('INSERT response:', { error, data });
        if (error) throw error;
        toast.success('Instructor added successfully');
      }
      
      handleCloseDialog();
      fetchInstructors();
    } catch (error: any) {
      console.error('Error saving instructor:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        status: error.status,
        details: error.details,
        hint: error.hint
      });
      toast.error(error.message || 'Failed to save instructor');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this instructor?')) return;
    
    try {
      const { error } = await supabase
        .from('instructors')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Instructor deleted successfully');
      fetchInstructors();
    } catch (error: any) {
      console.error('Error deleting instructor:', error);
      toast.error(error.message || 'Failed to delete instructor');
    }
  };

  const filteredInstructors = instructors.filter(instructor =>
    instructor.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.instructor_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    instructor.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <div className="flex justify-between items-center">
              <PageHeader
                title="Instructor Management"
                description="Manage faculty members and their details"
                icon={<BookOpen />}
              />
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Instructor
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name, code, email, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Instructors Table */}
            <div className="bg-card rounded-lg shadow overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Code</TableHead>
                    <TableHead>Full Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredInstructors.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No instructors found matching your search' : 'No instructors added yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInstructors.map((instructor) => (
                      <TableRow key={instructor.id}>
                        <TableCell className="font-mono font-semibold">{instructor.instructor_code}</TableCell>
                        <TableCell className="font-medium">{instructor.full_name}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {instructor.email}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {instructor.phone}
                          </div>
                        </TableCell>
                        <TableCell>{instructor.department}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            instructor.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {instructor.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(instructor)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(instructor.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingInstructor ? 'Edit Instructor' : 'Add New Instructor'}</DialogTitle>
            <DialogDescription>
              {editingInstructor ? 'Update instructor information' : 'Enter details to add a new instructor'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4 px-1 max-h-[60vh] overflow-y-auto scrollbar-invisible-dark">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Instructor Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.instructor_code}
                    onChange={(e) => setFormData({ ...formData, instructor_code: e.target.value.toUpperCase() })}
                    placeholder="INSTR001"
                    maxLength={20}
                    className="border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Dr. John Doe"
                    className="border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Email</label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="john@university.edu"
                    className="border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">Phone</label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="+91 XXXXXXXXXX"
                    className="border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Department</label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="Computer Science"
                    className="border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">Qualifications</label>
                <textarea
                  value={formData.qualifications}
                  onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
                  placeholder="B.Tech, M.Tech, PhD..."
                  className="w-full px-3 py-2 border border-border/50 rounded-md bg-background text-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition"
                  rows={3}
                />
              </div>

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
                {editingInstructor ? 'Update' : 'Add'} Instructor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(InstructorManagement);
