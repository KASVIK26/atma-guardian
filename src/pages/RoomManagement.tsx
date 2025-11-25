import { useState, useEffect } from 'react';
import { Plus, Pencil, Trash2, Search, DoorOpen, MapPin, Loader, Zap, Cloud, Droplets, Gauge } from 'lucide-react';
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
import { MapPortal } from '@/components/MapPortal';
import { withAuth } from '../lib/withAuth';

interface Building {
  id: string;
  name: string;
  code: string;
  altitude_meters?: number;
  floor_count?: number;
}

interface Room {
  id: string;
  room_number: string;
  room_name?: string;
  floor_number: number;
  capacity: number;
  room_type: string;
  latitude?: number;
  longitude?: number;
  geofence_geojson?: any;
  baseline_pressure_hpa?: number;
  is_active: boolean;
  building_id: string;
  buildings: Building;
  created_at: string;
}

interface BarometerData {
  seaLevelPressure?: number;
  temperature?: number;
  humidity?: number;
  elevation?: number;
  calculatedPressure?: number;
  isLoading: boolean;
  error?: string;
}

function RoomManagement({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [universityId, setUniversityId] = useState<string | null>(null);
  const [barometerData, setBarometerData] = useState<BarometerData>({
    isLoading: false,
    error: undefined
  });
  const [formData, setFormData] = useState({
    room_number: '',
    room_name: '',
    floor_number: 1,
    capacity: 30,
    room_type: 'lecture_hall',
    building_id: '',
    latitude: 0,
    longitude: 0,
    geofence_geojson: undefined as any,
    is_active: true,
    baseline_pressure_hpa: undefined as number | undefined
  });

  useEffect(() => {
    if (currentPage !== 'rooms') {
      setCurrentPage('rooms');
    }
    
    // Get user's university ID
    const getUniversityId = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('university_id')
            .eq('id', user.id)
            .single();
          if (userData) {
            setUniversityId(userData.university_id);
          }
        }
      } catch (error) {
        console.error('Error getting university ID:', error);
      }
    };
    
    getUniversityId();
    fetchData();
  }, [currentPage, setCurrentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch buildings - include altitude_meters for elevation calculation
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('id, name, code, altitude_meters, floor_count')
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
        room_name: room.room_name || '',
        floor_number: room.floor_number,
        capacity: room.capacity,
        room_type: room.room_type,
        building_id: room.building_id,
        latitude: room.latitude || 0,
        longitude: room.longitude || 0,
        geofence_geojson: room.geofence_geojson,
        is_active: room.is_active,
        baseline_pressure_hpa: room.baseline_pressure_hpa
      });
    } else {
      setEditingRoom(null);
      setFormData({
        room_number: '',
        room_name: '',
        floor_number: 1,
        capacity: 30,
        room_type: 'lecture_hall',
        building_id: buildings.length > 0 ? buildings[0].id : '',
        latitude: 0,
        longitude: 0,
        geofence_geojson: undefined,
        is_active: true,
        baseline_pressure_hpa: undefined
      });
    }
    setBarometerData({ isLoading: false, error: undefined });
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingRoom(null);
    setBarometerData({ isLoading: false, error: undefined });
    setFormData({
      room_number: '',
      room_name: '',
      floor_number: 1,
      capacity: 30,
      room_type: 'lecture_hall',
      building_id: buildings.length > 0 ? buildings[0].id : '',
      latitude: 0,
      longitude: 0,
      geofence_geojson: undefined,
      is_active: true,
      baseline_pressure_hpa: undefined
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
        university_id: universityId,
        room_number: formData.room_number,
        room_name: formData.room_name || null,
        floor_number: formData.floor_number,
        capacity: formData.capacity,
        room_type: formData.room_type,
        building_id: formData.building_id,
        latitude: formData.latitude || null,
        longitude: formData.longitude || null,
        geofence_geojson: formData.geofence_geojson || null,
        baseline_pressure_hpa: formData.baseline_pressure_hpa || null,
        is_active: formData.is_active
      };

      if (editingRoom) {
        // Update existing room - don't update university_id
        const { error } = await supabase
          .from('rooms')
          .update({
            room_number: formData.room_number,
            room_name: formData.room_name || null,
            floor_number: formData.floor_number,
            capacity: formData.capacity,
            room_type: formData.room_type,
            building_id: formData.building_id,
            latitude: formData.latitude || null,
            longitude: formData.longitude || null,
            geofence_geojson: formData.geofence_geojson || null,
            baseline_pressure_hpa: formData.baseline_pressure_hpa || null,
            is_active: formData.is_active
          })
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

  const handleLocationSelect = (lat: number, lng: number, address: string, geofence?: GeoJSON.Polygon) => {
    setFormData({
      ...formData,
      latitude: lat,
      longitude: lng,
      geofence_geojson: geofence
    });
    
    // Fetch barometer data after location is confirmed
    fetchBarometerData(lat, lng);
    setIsMapOpen(false);
    toast.success('Location selected! Fetching barometer data...');
  };

  const fetchBarometerData = async (lat: number, lng: number) => {
    try {
      setBarometerData({ isLoading: true });

      // Get building floor height (altitude_meters = height per floor set by admin)
      const selectedBuilding = buildings.find(b => b.id === formData.building_id);
      
      // Convert altitude_meters to number (database returns it as string sometimes)
      const altitudeValue = selectedBuilding?.altitude_meters;
      let floorHeightPerFloor = 0;
      
      if (altitudeValue !== undefined && altitudeValue !== null) {
        floorHeightPerFloor = typeof altitudeValue === 'string' 
          ? parseFloat(altitudeValue) 
          : altitudeValue;
      }
      
      // Calculate elevation: ground floor (floor 1) = 0, floor 2 = 1*height, floor 3 = 2*height, etc.
      const floorDeviation = (formData.floor_number - 1) * floorHeightPerFloor;
      const elevation = floorDeviation;

      // ============================================================
      // LOG: Building & Floor Information
      // ============================================================
      console.log('=== BUILDING & FLOOR INFO ===');
      console.log('Selected Building:', {
        id: selectedBuilding?.id,
        name: selectedBuilding?.name,
        code: selectedBuilding?.code,
        altitude_meters_raw: selectedBuilding?.altitude_meters,
        altitude_meters_parsed: floorHeightPerFloor,
        floor_height_per_floor: floorHeightPerFloor
      });
      console.log('Room Floor Information:', {
        floor_number: formData.floor_number,
        floor_deviation_calculation: `(${formData.floor_number} - 1) × ${floorHeightPerFloor}`,
        floor_deviation: floorDeviation,
        elevation_meters: elevation
      });
      console.log('=============================');

      // Build API URL - Open-Meteo current weather endpoint
      // Parameters: latitude, longitude, current=variables we need
      const apiUrl = new URL('https://api.open-meteo.com/v1/forecast');
      apiUrl.searchParams.append('latitude', lat.toString());
      apiUrl.searchParams.append('longitude', lng.toString());
      apiUrl.searchParams.append('current', 'surface_pressure,temperature_2m,relative_humidity_2m');
      apiUrl.searchParams.append('timezone', 'auto');

      console.log('Fetching weather data from:', apiUrl.toString());

      const response = await fetch(apiUrl.toString());
      
      console.log('API Response Status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API Error Response:', errorText);
        throw new Error(`API returned ${response.status}: ${errorText}`);
      }

      const weatherData = await response.json();
      console.log('API Response Data:', JSON.stringify(weatherData, null, 2));

      if (!weatherData.current) {
        console.error('No current weather data in response');
        throw new Error('No weather data available in response');
      }

      const current = weatherData.current;
      const surfacePressure = current.surface_pressure;
      const temperature = current.temperature_2m;
      const humidity = current.relative_humidity_2m;

      console.log('Extracted Data:', { surfacePressure, temperature, humidity, elevation });

      if (surfacePressure === null || surfacePressure === undefined) {
        throw new Error('Surface pressure data not available');
      }

      // Calculate baseline pressure (surface pressure is already at location elevation)
      const calculatedPressure = calculateBaselinePressure(
        surfacePressure,
        elevation,
        temperature,
        humidity
      );

      console.log('Calculated Baseline Pressure:', calculatedPressure);

      setFormData(prev => ({
        ...prev,
        baseline_pressure_hpa: calculatedPressure
      }));

      setBarometerData({
        seaLevelPressure: surfacePressure,
        temperature,
        humidity,
        elevation,
        calculatedPressure,
        isLoading: false
      });

      toast.success(`Barometer calculated: ${calculatedPressure.toFixed(2)} hPa`);
    } catch (error: any) {
      console.error('Error fetching barometer data:', error);
      console.error('Full error:', error);
      setBarometerData({
        isLoading: false,
        error: error.message || 'Failed to calculate barometer pressure'
      });
      toast.error('Failed to calculate barometer pressure. You can enter manually.');
    }
  };

  const calculateBaselinePressure = (
    surfacePressure: number,
    elevation: number,
    temperature: number,
    humidity: number
  ): number => {
    // Start with surface pressure from API (this is already at location elevation)
    let calculatedPressure = surfacePressure;

    // ============================================================
    // STEP 1: Apply Hypsometric Formula for Elevation Correction
    // ============================================================
    // The hypsometric equation adjusts pressure based on elevation
    // P_room = P_surface × (1 - (L × h) / T_ref)^5.255
    // Where:
    //   L = atmospheric lapse rate = 0.0065 K/m
    //   h = elevation in meters
    //   T_ref = reference temperature = 288.15 K (15°C)
    //   Exponent 5.255 = (g × M) / (R × L)
    
    const L = 0.0065; // Atmospheric lapse rate (K/m)
    const T_ref = 288.15; // Reference temperature (15°C in Kelvin)
    const exponent = 5.255; // (g × M) / (R × L)
    
    if (elevation > 0) {
      // Apply hypsometric formula only if elevation is positive
      const elevationFactor = (1 - (L * elevation) / T_ref);
      const pressureCorrection = Math.pow(elevationFactor, exponent);
      calculatedPressure = surfacePressure * pressureCorrection;
      
      console.log('Hypsometric Correction Applied:', {
        elevation,
        elevationFactor,
        pressureCorrection,
        pressureAfterCorrection: calculatedPressure.toFixed(2)
      });
    }

    // ============================================================
    // STEP 2: Humidity Correction
    // ============================================================
    // Humidity affects vapor pressure and barometric reading
    // Correction range: ±0.5-1.0 hPa
    const humidityCorrection = (humidity - 50) * 0.01; // -0.5 to +0.5 hPa
    calculatedPressure += humidityCorrection;

    console.log('After Humidity Correction:', {
      humidity,
      humidityCorrection,
      pressure: calculatedPressure.toFixed(2)
    });

    // ============================================================
    // STEP 3: Temperature Correction
    // ============================================================
    // Account for temperature effects on pressure sensor
    // Reference temperature: 15°C
    // Correction factor: 0.005 hPa per °C
    const tempDeviation = temperature - 15; // Reference 15°C
    const tempCorrection = tempDeviation * 0.005; // ±0.1-0.2 hPa typical range
    calculatedPressure += tempCorrection;

    console.log('After Temperature Correction:', {
      temperature,
      tempDeviation,
      tempCorrection,
      finalPressure: calculatedPressure.toFixed(2)
    });

    // ============================================================
    // FINAL RESULT SUMMARY
    // ============================================================
    const finalValue = Math.round(calculatedPressure * 100) / 100;
    
    console.log('=== BAROMETER CALCULATION COMPLETE ===');
    console.log('Initial Surface Pressure:', surfacePressure.toFixed(2), 'hPa');
    console.log('Step 1 - Elevation Correction:', elevation > 0 ? `Applied (${elevation}m)` : 'Skipped (ground floor)');
    console.log('Step 2 - Humidity Correction:', humidityCorrection > 0 ? `+${humidityCorrection.toFixed(4)}` : `${humidityCorrection.toFixed(4)}`, 'hPa');
    console.log('Step 3 - Temperature Correction:', tempCorrection > 0 ? `+${tempCorrection.toFixed(4)}` : `${tempCorrection.toFixed(4)}`, 'hPa');
    console.log('Final Baseline Pressure:', finalValue, 'hPa');
    console.log('=====================================');

    return finalValue;
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
                    <TableHead>Pressure (hPa)</TableHead>
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
                        <TableCell className="text-center">
                          {room.baseline_pressure_hpa ? (
                            <span className="font-mono text-sm">{room.baseline_pressure_hpa.toFixed(2)}</span>
                          ) : (
                            <span className="text-muted-foreground text-sm">-</span>
                          )}
                        </TableCell>
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
        <DialogContent className="max-w-2xl max-h-[95vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DoorOpen className="h-5 w-5" />
              {editingRoom ? 'Edit Room' : 'Add New Room'}
            </DialogTitle>
            <DialogDescription>
              {editingRoom ? 'Update room information' : 'Enter room details in the logical sequence below'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 overflow-y-auto scrollbar-invisible-dark px-1">
              <div className="space-y-6 py-4 pr-4">
                
                {/* STEP 1: BUILDING SELECTION */}
                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-semibold">1</div>
                    <h3 className="text-sm font-semibold text-foreground">Select Building</h3>
                  </div>
                  <Select value={formData.building_id} onValueChange={(value) => setFormData({ ...formData, building_id: value })}>
                    <SelectTrigger className="w-full border-border/50 bg-muted/30">
                      <SelectValue placeholder="Choose building (Required)" />
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

                {/* STEP 2: ROOM BASICS */}
                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-semibold">2</div>
                    <h3 className="text-sm font-semibold text-foreground">Room Basics</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="text-sm font-medium text-foreground/80">
                        Room Number <span className="text-red-500">*</span>
                      </label>
                      <Input
                        required
                        value={formData.room_number}
                        onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                        placeholder="e.g., A-101, B-205"
                        className="mt-1 border-border/50 bg-muted/30 focus:bg-background"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground/80">
                        Room Name <span className="text-gray-400">(Optional)</span>
                      </label>
                      <Input
                        value={formData.room_name}
                        onChange={(e) => setFormData({ ...formData, room_name: e.target.value })}
                        placeholder="e.g., Computer Lab, Advanced Physics Lab"
                        className="mt-1 border-border/50 bg-muted/30 focus:bg-background"
                      />
                    </div>
                  </div>
                </div>

                {/* STEP 3: DIMENSIONS & CAPACITY */}
                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-xs font-semibold">3</div>
                    <h3 className="text-sm font-semibold text-foreground">Dimensions & Capacity</h3>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground/80">
                        Floor <span className="text-red-500">*</span>
                      </label>
                      <Input
                        required
                        type="number"
                        min="1"
                        max="50"
                        value={formData.floor_number}
                        onChange={(e) => setFormData({ ...formData, floor_number: parseInt(e.target.value) })}
                        placeholder="1"
                        className="mt-1 border-border/50 bg-muted/30 focus:bg-background"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Ground floor = 1</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground/80">
                        Capacity <span className="text-red-500">*</span>
                      </label>
                      <Input
                        required
                        type="number"
                        min="1"
                        max="500"
                        value={formData.capacity}
                        onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                        placeholder="30"
                        className="mt-1 border-border/50 bg-muted/30 focus:bg-background"
                      />
                      <p className="text-xs text-muted-foreground mt-1">Seating capacity</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground/80">
                        Room Type <span className="text-red-500">*</span>
                      </label>
                      <Select value={formData.room_type} onValueChange={(value) => setFormData({ ...formData, room_type: value })}>
                        <SelectTrigger className="mt-1 border-border/50 bg-muted/30">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lecture_hall">Lecture</SelectItem>
                          <SelectItem value="lab">Lab</SelectItem>
                          <SelectItem value="tutorial">Tutorial</SelectItem>
                          <SelectItem value="seminar">Seminar</SelectItem>
                          <SelectItem value="conference">Conference</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                {/* STEP 4: LOCATION & GEOFENCE */}
                <div className="space-y-3 pb-4 border-b border-border/50">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-orange-500 text-white text-xs font-semibold">4</div>
                    <h3 className="text-sm font-semibold text-foreground">📍 Location & Geofence</h3>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsMapOpen(true)}
                    className="w-full bg-gradient-to-r from-blue-500/10 to-purple-500/10 border-blue-500/30 hover:bg-gradient-to-r hover:from-blue-500/20 hover:to-purple-500/20 flex items-center justify-center gap-2"
                  >
                    <MapPin className="h-4 w-4" />
                    {formData.latitude && formData.longitude ? 'Update Location on Map' : 'Select Location on Map'}
                  </Button>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-foreground/80">Latitude</label>
                      <Input
                        type="number"
                        step="0.00000001"
                        value={formData.latitude || ''}
                        onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                        placeholder="28.7041"
                        className="mt-1 border-border/50 bg-muted/30 focus:bg-background font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-foreground/80">Longitude</label>
                      <Input
                        type="number"
                        step="0.00000001"
                        value={formData.longitude || ''}
                        onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                        placeholder="77.1025"
                        className="mt-1 border-border/50 bg-muted/30 focus:bg-background font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground/80">
                      Geofence GeoJSON <span className="text-gray-400">(Optional)</span>
                    </label>
                    <textarea
                      value={formData.geofence_geojson ? JSON.stringify(formData.geofence_geojson, null, 2) : ''}
                      onChange={(e) => {
                        try {
                          const parsed = e.target.value ? JSON.parse(e.target.value) : undefined;
                          setFormData({ ...formData, geofence_geojson: parsed });
                        } catch (err) {
                          // Invalid JSON, don't update
                        }
                      }}
                      placeholder='{"type": "Polygon", "coordinates": [[[77.1, 28.7], ...]]}'
                      className="w-full mt-1 px-3 py-2 text-xs border border-border/50 rounded-md font-mono bg-muted/50 focus:bg-background"
                      rows={3}
                    />
                  </div>
                </div>

                {/* BAROMETER CALCULATION CARD */}
                {barometerData.calculatedPressure !== undefined && (
                  <div className="space-y-3 pb-4 border-b border-border/50">
                    <div className="flex items-center gap-2 mb-3">
                      <Gauge className="h-4 w-4 text-amber-500" />
                      <h3 className="text-sm font-semibold text-foreground">Barometer Calculation Result</h3>
                    </div>
                    <div className="bg-gradient-to-br from-amber-500/5 via-orange-500/5 to-red-500/5 border border-amber-500/30 rounded-lg p-4 space-y-3">
                      
                      {/* Main Result */}
                      <div className="bg-white dark:bg-slate-900 rounded-md p-3 border-2 border-amber-500/50">
                        <div className="flex items-end gap-2">
                          <div>
                            <p className="text-xs font-medium text-muted-foreground">Baseline Pressure</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                              {barometerData.calculatedPressure.toFixed(2)}
                            </p>
                          </div>
                          <p className="text-sm text-muted-foreground pb-1">hPa</p>
                        </div>
                      </div>

                      {/* Input Factors */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded p-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <span className="text-lg">📏</span> Elevation
                          </p>
                          <p className="text-sm font-semibold text-foreground">{barometerData.elevation?.toFixed(1)} m</p>
                        </div>
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded p-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Cloud className="h-3 w-3" /> Surface Pressure
                          </p>
                          <p className="text-sm font-semibold text-foreground">{barometerData.seaLevelPressure?.toFixed(2)} hPa</p>
                        </div>
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded p-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Droplets className="h-3 w-3" /> Humidity
                          </p>
                          <p className="text-sm font-semibold text-foreground">{barometerData.humidity?.toFixed(0)}%</p>
                        </div>
                        <div className="bg-white/50 dark:bg-slate-800/50 rounded p-2">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Zap className="h-3 w-3" /> Temperature
                          </p>
                          <p className="text-sm font-semibold text-foreground">{barometerData.temperature?.toFixed(1)}°C</p>
                        </div>
                      </div>

                      {/* Applied Corrections */}
                      <div className="bg-white/30 dark:bg-slate-900/30 rounded p-3 pt-2 border-t border-amber-500/20">
                        <p className="text-xs font-semibold text-foreground mb-2">Applied Corrections</p>
                        <div className="space-y-1 text-xs text-muted-foreground">
                          <p>✓ <strong>Surface Pressure</strong>: Already at room elevation</p>
                          <p>✓ <strong>Humidity Correction</strong>: ±0.5-1.0 hPa accounting for moisture</p>
                          <p>✓ <strong>Temperature Correction</strong>: ±0.1-0.2 hPa for sensor compensation</p>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground text-center pt-2">
                        ℹ️ Data from Open-Meteo API • Accuracy: ±2-5 hPa
                      </p>
                    </div>
                  </div>
                )}

                {/* Loading Barometer */}
                {barometerData.isLoading && (
                  <div className="space-y-3 pb-4 border-b border-border/50">
                    <div className="bg-gradient-to-br from-blue-500/5 to-cyan-500/5 border border-blue-500/30 rounded-lg p-4 flex items-center gap-3">
                      <Loader className="h-5 w-5 text-blue-500 animate-spin" />
                      <div>
                        <p className="text-sm font-semibold text-foreground">Calculating barometer pressure...</p>
                        <p className="text-xs text-muted-foreground">Fetching weather data and applying corrections</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Barometer Error */}
                {barometerData.error && (
                  <div className="space-y-3 pb-4 border-b border-border/50">
                    <div className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-500/30 rounded-lg p-4">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">⚠️ Barometer Error</p>
                      <p className="text-xs text-muted-foreground mt-1">{barometerData.error}</p>
                      <p className="text-xs text-muted-foreground mt-2">You can enter the baseline pressure manually or leave it empty.</p>
                    </div>
                  </div>
                )}

                {/* STEP 5: ACTIVATION STATUS */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500 text-white text-xs font-semibold">5</div>
                    <h3 className="text-sm font-semibold text-foreground">Status</h3>
                  </div>
                  <label className="flex items-center gap-3 cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition border border-border/30">
                    <input
                      type="checkbox"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                      className="rounded w-4 h-4 cursor-pointer"
                    />
                    <span className="text-sm font-medium">Mark this room as active</span>
                  </label>
                </div>

              </div>
            </div>
            
            <DialogFooter className="mt-6 pt-4 border-t border-border/50 px-1">
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                Cancel
              </Button>
              <Button type="submit" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white">
                {editingRoom ? 'Update' : 'Add'} Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Map Portal for Location Selection */}
      <MapPortal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onLocationSelect={handleLocationSelect}
        initialLat={formData.latitude}
        initialLng={formData.longitude}
        initialGeofence={formData.geofence_geojson}
      />
    </div>
  );
}

export default withAuth(RoomManagement);
