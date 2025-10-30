import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, MapPin, Home } from 'lucide-react';
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
import { MapPortal } from '@/components/MapPortal';

interface Building {
  id: string;
  name: string;
  code: string;
  address?: string;
  floor_count: number;
  altitude_meters?: number;
  latitude: number;
  longitude: number;
  geofence_radius_meters: number;
  geofence_geojson?: GeoJSON.Polygon;
  is_active: boolean;
  created_at: string;
}

function BuildingManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMapPortalOpen, setIsMapPortalOpen] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [currentUserUniversityId, setCurrentUserUniversityId] = useState<string>('');
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    floor_count: 1,
    altitude_meters: 0,
    latitude: 0,
    longitude: 0,
    geofence_radius_meters: 50,
    geofence_geojson: undefined as GeoJSON.Polygon | undefined,
    is_active: true,
    university_id: ''
  });

  useEffect(() => {
    if (currentPage !== 'buildings') {
      setCurrentPage('buildings');
    }
    fetchCurrentUserUniversity();
    fetchBuildings();
  }, [currentPage, setCurrentPage]);

  const fetchCurrentUserUniversity = async () => {
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('Error getting current user:', userError);
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .select('university_id')
        .eq('id', user.id)
        .single();

      if (!error && data && data.university_id) {
        setCurrentUserUniversityId(data.university_id);
      } else {
        console.error('Error fetching user university:', error);
      }
    } catch (error) {
      console.error('Error in fetchCurrentUserUniversity:', error);
    }
  };

  const fetchBuildings = async () => {
    try {
      const { data, error } = await supabase
        .from('buildings')
        .select('*')
        .order('code');
      
      if (error) throw error;
      setBuildings(data || []);
    } catch (error) {
      console.error('Error fetching buildings:', error);
      toast.error('Failed to load buildings');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (building?: Building) => {
    if (building) {
      setEditingBuilding(building);
      setFormData({
        name: building.name,
        code: building.code,
        address: building.address || '',
        floor_count: building.floor_count,
        altitude_meters: building.altitude_meters || 0,
        latitude: building.latitude,
        longitude: building.longitude,
        geofence_radius_meters: building.geofence_radius_meters,
        geofence_geojson: building.geofence_geojson,
        is_active: building.is_active,
        university_id: currentUserUniversityId
      });
    } else {
      setEditingBuilding(null);
      setFormData({
        name: '',
        code: '',
        address: '',
        floor_count: 1,
        altitude_meters: 0,
        latitude: 0,
        longitude: 0,
        geofence_radius_meters: 50,
        geofence_geojson: undefined,
        is_active: true,
        university_id: currentUserUniversityId
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingBuilding(null);
    setFormData({
      name: '',
      code: '',
      address: '',
      floor_count: 1,
      altitude_meters: 0,
      latitude: 0,
      longitude: 0,
      geofence_radius_meters: 50,
      geofence_geojson: undefined,
      is_active: true,
      university_id: currentUserUniversityId
    });
  };

  const handleMapPortalClose = () => {
    setIsMapPortalOpen(false);
  };

  const handleLocationSelect = (lat: number, lng: number, address: string, geofence?: GeoJSON.Polygon) => {
    setFormData({
      ...formData,
      latitude: lat,
      longitude: lng,
      address: address,
      geofence_geojson: geofence
    });
    toast.success('Location and geofence updated');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const dataToSave = {
        name: formData.name,
        code: formData.code,
        address: formData.address || null,
        floor_count: formData.floor_count,
        altitude_meters: formData.altitude_meters || null,
        latitude: formData.latitude,
        longitude: formData.longitude,
        geofence_radius_meters: formData.geofence_radius_meters,
        geofence_geojson: formData.geofence_geojson || null,
        is_active: formData.is_active,
        university_id: currentUserUniversityId
      };

      if (editingBuilding) {
        // Update existing building
        const { error } = await supabase
          .from('buildings')
          .update(dataToSave)
          .eq('id', editingBuilding.id);
        
        if (error) throw error;
        toast.success('Building updated successfully');
      } else {
        // Create new building
        const { error } = await supabase
          .from('buildings')
          .insert([dataToSave]);
        
        if (error) throw error;
        toast.success('Building added successfully');
      }
      
      handleCloseDialog();
      fetchBuildings();
    } catch (error: any) {
      console.error('Error saving building:', error);
      toast.error(error.message || 'Failed to save building');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this building? This will also delete all associated rooms.')) return;
    
    try {
      const { error } = await supabase
        .from('buildings')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      toast.success('Building deleted successfully');
      fetchBuildings();
    } catch (error: any) {
      console.error('Error deleting building:', error);
      toast.error(error.message || 'Failed to delete building');
    }
  };

  const filteredBuildings = buildings.filter(building =>
    building.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    building.address?.toLowerCase().includes(searchTerm.toLowerCase())
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
                title="Building Management"
                description="Manage campus buildings, locations, and geofencing zones"
                icon={<Home />}
              />
              <Button onClick={() => handleOpenDialog()} className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Add Building
              </Button>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search by name, code, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Buildings Table */}
            <div className="bg-card rounded-lg shadow overflow-hidden border">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted">
                    <TableHead>Code</TableHead>
                    <TableHead>Building Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Floors</TableHead>
                    <TableHead>Location (Lat, Long)</TableHead>
                    <TableHead>Geofence</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8">
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : filteredBuildings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        {searchTerm ? 'No buildings found matching your search' : 'No buildings added yet'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBuildings.map((building) => (
                      <TableRow key={building.id}>
                        <TableCell className="font-mono font-semibold">{building.code}</TableCell>
                        <TableCell className="font-medium">{building.name}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{building.address || '-'}</TableCell>
                        <TableCell className="text-center">{building.floor_count}</TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {building.latitude.toFixed(4)}, {building.longitude.toFixed(4)}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {building.geofence_geojson ? (
                            <span className="text-green-600 font-semibold">✓ Set</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            building.is_active ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                          }`}>
                            {building.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleOpenDialog(building)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(building.id)}
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
            <DialogTitle>{editingBuilding ? 'Edit Building' : 'Add New Building'}</DialogTitle>
            <DialogDescription>
              {editingBuilding ? 'Update building information' : 'Enter details to add a new building'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4 px-1 max-h-[60vh] overflow-y-auto scrollbar-invisible-dark">
              {/* Building Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Building Code <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., ENG"
                    maxLength={10}
                    className="border-border/50"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Building Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Engineering"
                    className="border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Floor Count <span className="text-red-500">*</span>
                  </label>
                  <Input
                    required
                    type="number"
                    min="1"
                    value={formData.floor_count}
                    onChange={(e) => setFormData({ ...formData, floor_count: parseInt(e.target.value) })}
                    placeholder="1"
                    className="border-border/50"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold">
                    Altitude / Floor Height (meters)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="0.1"
                    value={formData.altitude_meters}
                    onChange={(e) => setFormData({ ...formData, altitude_meters: parseFloat(e.target.value) })}
                    placeholder="e.g., 500"
                    className="border-border/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Geofence Radius (m)</label>
                  <Input
                    type="number"
                    min="10"
                    value={formData.geofence_radius_meters}
                    onChange={(e) => setFormData({ ...formData, geofence_radius_meters: parseInt(e.target.value) })}
                    placeholder="50"
                    className="border-border/50"
                  />
                </div>
              </div>

              {/* Location Info Compact Display */}
              <div className="border-t border-border/50 pt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Latitude</label>
                    <div className="p-2 bg-muted/30 rounded-md border border-border/50 text-xs font-mono">
                      {formData.latitude.toFixed(6)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-muted-foreground">Longitude</label>
                    <div className="p-2 bg-muted/30 rounded-md border border-border/50 text-xs font-mono">
                      {formData.longitude.toFixed(6)}
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={() => setIsMapPortalOpen(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-sm h-9"
                >
                  <MapPin className="h-4 w-4 mr-2" />
                  Select Location on Map
                </Button>
              </div>

              {/* Address */}
              <div className="border-t border-border/50 pt-4 space-y-2">
                <label className="text-sm font-semibold">Address</label>
                <div className="p-3 bg-muted/30 rounded-md border border-border/50 text-sm text-muted-foreground min-h-[40px] flex items-center">
                  {formData.address || 'Click "Select Location on Map" to fetch'}
                </div>
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
                {editingBuilding ? 'Update' : 'Add'} Building
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Map Portal */}
      <MapPortal
        isOpen={isMapPortalOpen}
        onClose={handleMapPortalClose}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.latitude}
        initialLng={formData.longitude}
        initialAddress={formData.address}
        initialGeofence={formData.geofence_geojson}
      />
    </div>
  );
}

export default withAuth(BuildingManagement);
