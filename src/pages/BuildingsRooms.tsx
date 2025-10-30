import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Building2, MapPin, Wifi, Plus, Settings, Activity } from "lucide-react";
import { withAuth } from '../lib/withAuth';
import { Sidebar } from '@/components/layout/Sidebar';
import { PageHeader } from "@/components/layout/PageHeader";
import { Navbar } from "@/components/layout/Navbar";
import { useEffect } from 'react';

function BuildingsRooms({ sidebarOpen, setSidebarOpen, currentPage, setCurrentPage, sidebarItems }) {
  useEffect(() => {
    if (currentPage !== 'buildings') {
      setCurrentPage('buildings');
    }
  }, [currentPage, setCurrentPage]);

  const buildings = [
    {
      id: 1,
      name: "Engineering Building",
      code: "ENG",
      floors: 5,
      rooms: 45,
      activeRooms: 23,
      latitude: 37.427474,
      longitude: -122.169719
    },
    {
      id: 2,
      name: "Science Center",
      code: "SCI",
      floors: 4,
      rooms: 32,
      activeRooms: 18,
      latitude: 37.428456,
      longitude: -122.168234
    },
    {
      id: 3,
      name: "Business School",
      code: "BUS",
      floors: 3,
      rooms: 28,
      activeRooms: 15,
      latitude: 37.426789,
      longitude: -122.170123
    }
  ];

  const rooms = [
    {
      id: 1,
      building: "Engineering Building",
      roomNumber: "ENG-101",
      floor: 1,
      capacity: 60,
      type: "Lecture Hall",
      status: "active",
      geofenceRadius: 50,
      pressure: 1013.25
    },
    {
      id: 2,
      building: "Engineering Building", 
      roomNumber: "ENG-201",
      floor: 2,
      capacity: 30,
      type: "Lab",
      status: "active",
      geofenceRadius: 30,
      pressure: 1012.87
    },
    {
      id: 3,
      building: "Science Center",
      roomNumber: "SCI-301",
      floor: 3,
      capacity: 45,
      type: "Classroom",
      status: "maintenance",
      geofenceRadius: 40,
      pressure: 1013.12
    }
  ];

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
              title="Buildings & Rooms"
              description="Manage campus buildings, rooms, and geofencing zones"
              icon={<Building2 />}
              actions={
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Building
                </Button>
              }
            />

            <div className="space-y-6">{/* Buildings Overview */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle className="flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-primary" />
                  Buildings Overview
                </CardTitle>
                <CardDescription>
                  Manage campus buildings and geofencing zones
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {buildings.map((building) => (
                  <Card key={building.id} className="border-border/50">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="font-semibold">{building.name}</h3>
                          <p className="text-sm text-muted-foreground">{building.code}</p>
                        </div>
                        <Badge variant="outline">{building.floors} floors</Badge>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span>Total Rooms</span>
                          <span className="font-medium">{building.rooms}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Active Sessions</span>
                          <span className="font-medium text-green-600">{building.activeRooms}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span>Location</span>
                          <span className="font-medium">{building.latitude.toFixed(4)}, {building.longitude.toFixed(4)}</span>
                        </div>
                      </div>
                      
                      <div className="mt-4 flex space-x-2">
                        <Button variant="outline" size="sm" className="flex-1">
                          <MapPin className="w-3 h-3 mr-1" />
                          View Map
                        </Button>
                        <Button variant="outline" size="sm">
                          <Settings className="w-3 h-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">8</div>
                <div className="text-sm text-muted-foreground">Total Buildings</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold">156</div>
                <div className="text-sm text-muted-foreground">Total Rooms</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-green-600">78</div>
                <div className="text-sm text-muted-foreground">Active Rooms</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <div className="text-2xl font-bold text-orange-600">12</div>
                <div className="text-sm text-muted-foreground">Maintenance</div>
              </CardContent>
            </Card>
          </div>

          {/* Rooms Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Room Management</CardTitle>
                  <CardDescription>Configure individual rooms and their settings</CardDescription>
                </div>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Room
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {rooms.map((room) => (
                  <div key={room.id} className="border border-border/50 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-primary rounded-lg flex items-center justify-center">
                          <Building2 className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{room.roomNumber}</div>
                          <div className="text-sm text-muted-foreground">
                            {room.building} • Floor {room.floor} • {room.type}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-right">
                          <div className="text-sm font-medium">Capacity: {room.capacity}</div>
                          <div className="text-xs text-muted-foreground">
                            Geofence: {room.geofenceRadius}m
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">Pressure</div>
                          <div className="text-xs text-muted-foreground">
                            {room.pressure} hPa
                          </div>
                        </div>
                        <Badge 
                          variant={room.status === "active" ? "default" : "secondary"}
                          className="capitalize"
                        >
                          {room.status}
                        </Badge>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm">
                            <Settings className="w-3 h-3" />
                          </Button>
                          <Button variant="outline" size="sm">
                            <Wifi className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Geofencing Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary" />
                Geofencing Configuration
              </CardTitle>
              <CardDescription>Configure location-based attendance validation</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Default Geofence Radius</label>
                    <Input type="number" defaultValue="50" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Default radius in meters for new rooms</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">GPS Accuracy Threshold</label>
                    <Input type="number" defaultValue="10" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Maximum GPS accuracy error in meters</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Pressure Sensitivity</label>
                    <Input type="number" defaultValue="2.0" step="0.1" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Pressure difference threshold in hPa</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Validation Score Threshold</label>
                    <Input type="number" defaultValue="70" className="mt-1" />
                    <p className="text-xs text-muted-foreground mt-1">Minimum validation score percentage</p>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex justify-end">
                <Button>Save Configuration</Button>
              </div>
            </CardContent>
          </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(BuildingsRooms);
