import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, DoorOpen } from 'lucide-react';
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

interface Building {
  id: string;
  name: string;
  code: string;
}

interface Room {
  id: string;
  room_number: string;
  floor_number: number;
  capacity: number;
  room_type: string;
  is_active: boolean;
  building_id: string;
  buildings: Building;
  created_at: string;
}

function RoomManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    room_number: '',
    floor_number: 1,
    capacity: 30,
    room_type: 'lecture_hall',
    building_id: '',
    is_active: true
  });

  useEffect(() => {
    if (currentPage !== 'rooms') {
      setCurrentPage('rooms');
    }
    fetchData();
  }, [currentPage, setCurrentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, code')
        .order('code');
      
      if (buildingsError) throw buildingsError;
      setBuildings(buildingsData || []);

      // Fetch rooms
      const { data: roomsData, error: roomsError } = await supabase
        .from('rooms')
        .select('*, buildings(*)')
        .order('room_number');
      
      if (roomsError) throw roomsError;
      setRooms(roomsData || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        room_number: room.room_number,
        floor_number: room.floor_number,
        capacity: room.capacity,
        room_type: room.room_type,
        building_id: room.building_id,
        is_active: room.is_active
      });
    } else {
      setEditingRoom(null);
      setFormData({
        room_number: '',
        floor_number: 1,
        capacity: 30,
        room_type: 'lecture_hall',
        building_id: buildings.length > 0 ? buildings[0].id : '',
        is_active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
    setFormData({
      room_number: '',
      floor_number: 1,
      capacity: 30,
      room_type: 'lecture_hall',
      building_id: buildings.length > 0 ? buildings[0].id : '',
      is_active: true
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.building_id) {
      toast.error('Please select a building');
      return;
    }

    try {
      const dataToSave = {
        room_number: formData.room_number,
        floor_number: formData.floor_number,
        capacity: formData.capacity,
        room_type: formData.room_type,
        building_id: formData.building_id,
        is_active: formData.is_active
      };

      if (editingRoom) {
        // Update existing room
        const { error } = await supabase
          .from('rooms')
          .update(dataToSave)
          .eq('id', editingRoom.id);
        
        if (error) throw error;
        toast.success('Room updated successfully');
      } else {
        // Create new room
        const { error } = await supabase
          .from('rooms')
          .insert([dataToSave]);
        
        if (error) throw error;
        toast.success('Room added successfully');
      }
      
      handleCloseDialog();
      fetchData();
    } catch (error: any) {
      console.error('Error saving room:', error);
      toast.error(error.message || 'Failed to save room');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room?')) return;
    
    try {
      const { error } = await supabase
        .from('rooms')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Room deleted successfully');
      fetchData();
    } catch (error: any) {
      console.error('Error deleting room:', error);
      toast.error(error.message || 'Failed to delete room');
    }
  };

  const filteredRooms = rooms.filter(room =>
    room.room_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.buildings?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    room.room_type.toLowerCase().includes(searchTerm.toLowerCase())
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
                title="Room Management"
                description="Manage campus rooms and their configurations"
                icon={<DoorOpen />}
              />
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Room
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by room number, building, or type..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Rooms Table */}
            <div className="bg-card rounded-lg shadow overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Room Number</TableHead>
                    <TableHead>Building</TableHead>
                    <TableHead>Floor</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Capacity</TableHead>
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
                  ) : filteredRooms.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No rooms found matching your search' : 'No rooms added yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredRooms.map((room) => (
                      <TableRow key={room.id}>
                        <TableCell className="font-mono font-semibold">{room.room_number}</TableCell>
                        <TableCell>{room.buildings?.name}</TableCell>
                        <TableCell className="text-center">{room.floor_number}</TableCell>
                        <TableCell className="capitalize">{room.room_type.replace('_', ' ')}</TableCell>
                        <TableCell className="text-center">{room.capacity}</TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            room.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {room.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(room)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(room.id)}
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
        <DialogContent className="max-w-lg max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit Room' : 'Add New Room'}</DialogTitle>
            <DialogDescription>
              {editingRoom ? 'Update room information' : 'Enter details to add a new room'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4 px-1 max-h-[calc(90vh-200px)] overflow-y-auto scrollbar-thin">
              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Building <span className="text-red-500">*</span>
                </label>
                <Select value={formData.building_id} onValueChange={(value) => setFormData({ ...formData, building_id: value })}>
                  <SelectTrigger className="w-full border-border/50">
                    <SelectValue placeholder="Select a building" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.length === 0 ? (
                      <SelectItem disabled value="">No buildings available. Create one first.</SelectItem>
                    ) : (
                      buildings.map((b) => (
                        <SelectItem key={b.id} value={b.id}>
                          {b.name} ({b.code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Room Number <span className="text-red-500">*</span>
                </label>
                <Input
                  required
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                  placeholder="e.g., A-101"
                  className="border-border/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Floor <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    value={formData.floor_number}
                    onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value) })}
                    placeholder="1"
                    className="border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Capacity <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                    placeholder="30"
                    className="border-border/50"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-semibold">
                  Room Type <span className="text-red-500">*</span>
                </label>
                <Select value={formData.room_type} onValueChange={(value) => setFormData({ ...formData, room_type: value })}>
                  <SelectTrigger className="w-full border-border/50">
                    <SelectValue placeholder="Select room type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="lecture_hall">Lecture Hall</SelectItem>
                    <SelectItem value="lab">Lab</SelectItem>
                    <SelectItem value="tutorial">Tutorial Room</SelectItem>
                    <SelectItem value="seminar">Seminar Room</SelectItem>
                    <SelectItem value="conference">Conference Room</SelectItem>
                  </SelectContent>
                </Select>
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
                {editingRoom ? 'Update' : 'Add'} Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default withAuth(RoomManagement);
