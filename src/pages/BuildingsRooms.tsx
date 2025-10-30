import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus } from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Building {
  id: string;
  name: string;
  code: string;
  floor_count: number;
  latitude: number;
  longitude: number;
  geofence_geojson?: any;
  is_active: boolean;
}

interface Room {
  id: string;
  room_number: string;
  floor_number: number;
  capacity: number;
  room_type: string;
  is_active: boolean;
  buildings: Building;
}

function BuildingsRooms({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  const navigate = useNavigate();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (currentPage !== 'buildings') {
      setCurrentPage('buildings');
    }
    fetchData();
  }, [currentPage, setCurrentPage]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch buildings
      const { data: buildingsData, error: buildingsError } = await supabase
        .from('buildings')
        .select('*')
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
      toast.error('Failed to load buildings and rooms');
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    totalBuildings: buildings.length,
    totalRooms: rooms.length,
    activeRooms: rooms.filter(r => r.is_active).length,
    inactiveRooms: rooms.filter(r => !r.is_active).length
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
            <div className="flex justify-between items-center">
              <PageHeader
                title="Buildings & Rooms"
                description="Manage campus buildings, rooms, and geofencing zones"
                icon={<Building2 />}
              />
              <div className="flex gap-2">
                <Button onClick={() => navigate('/building-management')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Buildings
                </Button>
                <Button onClick={() => navigate('/room-management')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Manage Rooms
                </Button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">{stats.totalBuildings}</div>
                  <div className="text-sm text-muted-foreground">Total Buildings</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold">{stats.totalRooms}</div>
                  <div className="text-sm text-muted-foreground">Total Rooms</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-green-600">{stats.activeRooms}</div>
                  <div className="text-sm text-muted-foreground">Active Rooms</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-orange-600">{stats.inactiveRooms}</div>
                  <div className="text-sm text-muted-foreground">Inactive Rooms</div>
                </CardContent>
              </Card>
            </div>

            {/* Buildings Overview */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle className="flex items-center">
                    <Building2 className="w-5 h-5 mr-2 text-primary" />
                    Buildings Overview
                  </CardTitle>
                  <CardDescription>
                    {buildings.length === 0 ? 'No buildings added yet. Create your first building to get started.' : `${buildings.length} building${buildings.length !== 1 ? 's' : ''} configured`}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : buildings.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No buildings added yet</p>
                    <Button onClick={() => navigate('/building-management')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Building
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {buildings.map((building) => (
                      <Card key={building.id} className="border-border/50">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h3 className="font-semibold">{building.name}</h3>
                              <p className="text-sm text-muted-foreground">{building.code}</p>
                            </div>
                            <Badge variant="outline">{building.floor_count} floors</Badge>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex justify-between text-sm">
                              <span>Rooms</span>
                              <span className="font-medium">{rooms.filter(r => r.buildings?.id === building.id).length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Active Sessions</span>
                              <span className="font-medium text-green-600">
                                {rooms.filter(r => r.buildings?.id === building.id && r.is_active).length}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span>Geofence</span>
                              <span className="font-medium">
                                {building.geofence_geojson ? '✓ Set' : '-'}
                              </span>
                            </div>
                          </div>
                          
                          <div className="mt-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full"
                              onClick={() => navigate('/building-management')}
                            >
                              View Details
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Rooms Management */}
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Room Management</CardTitle>
                  <CardDescription>
                    {rooms.length === 0 ? 'No rooms added yet. Create buildings first, then add rooms.' : `${rooms.length} room${rooms.length !== 1 ? 's' : ''} configured`}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : rooms.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">No rooms added yet</p>
                    <Button onClick={() => navigate('/room-management')}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Room
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {rooms.map((room) => (
                      <div key={room.id} className="border border-border/50 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="font-medium">{room.room_number}</div>
                              <div className="text-sm text-muted-foreground">
                                {room.buildings?.name} • Floor {room.floor_number} • {room.room_type}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-6">
                            <div className="text-right">
                              <div className="text-sm font-medium">Capacity: {room.capacity}</div>
                            </div>
                            <Badge 
                              variant={room.is_active ? "default" : "secondary"}
                              className="capitalize"
                            >
                              {room.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                            <div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate('/room-management')}
                              >
                                Edit
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(BuildingsRooms);
