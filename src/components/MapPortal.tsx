import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';
import 'leaflet-draw';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Search, MapPin, X, Check, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';

interface MapPortalProps {
  isOpen: boolean;
  onClose: () => void;
  onLocationSelect: (lat: number, lng: number, address: string, geofence?: GeoJSON.Polygon) => void;
  initialLat?: number;
  initialLng?: number;
  initialAddress?: string;
  initialGeofence?: GeoJSON.Polygon;
}

export function MapPortal({
  isOpen,
  onClose,
  onLocationSelect,
  initialLat = 0,
  initialLng = 0,
  initialAddress = '',
  initialGeofence,
}: MapPortalProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const featureGroupRef = useRef<L.FeatureGroup | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState({
    lat: initialLat || 37.427474,
    lng: initialLng || -122.169719,
    address: initialAddress || '',
  });
  const [selectedGeofence, setSelectedGeofence] = useState<GeoJSON.Polygon | undefined>(initialGeofence);
  const drawControlRef = useRef<any>(null);

  // Initialize map
  useEffect(() => {
    if (!isOpen) {
      // Cleanup: destroy map when portal closes
      if (mapRef.current) {
        try {
          // First, remove all event listeners
          mapRef.current.off();
          // Then remove the map from the DOM
          mapRef.current.remove();
        } catch (e) {
          console.error('Error removing map:', e);
        }
        mapRef.current = null;
        featureGroupRef.current = null;
        markerRef.current = null;
        drawControlRef.current = null;
      }
      return;
    }

    // Wait for DOM to be ready
    const initTimeout = setTimeout(() => {
      // Make sure container exists and is empty
      if (!mapContainerRef.current) {
        console.warn('Map container ref not available');
        return;
      }

      // Clear any existing map instance from the container
      const container = mapContainerRef.current;
      if ((container as any)._leaflet_map) {
        try {
          (container as any)._leaflet_map.remove();
          delete (container as any)._leaflet_map;
        } catch (e) {
          console.error('Error cleaning up existing map:', e);
        }
      }

      try {
      console.log('Initializing map...');
      console.log('Container dimensions:', {
        width: mapContainerRef.current.offsetWidth,
        height: mapContainerRef.current.offsetHeight,
      });

      // Fix marker icon - use CDN URLs
      delete (L.Icon.Default.prototype as any)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
        iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41],
      });

      // Create map
      console.log('Creating Leaflet map instance');
      mapRef.current = L.map(container, {
        center: [selectedLocation.lat, selectedLocation.lng],
        zoom: 15,
        zoomControl: true,
        attributionControl: true,
      });
      console.log('Map instance created successfully');

      // Add OpenStreetMap tiles
      console.log('Adding tile layer');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
      console.log('Tile layer added successfully');

      // Create feature group for drawing
      featureGroupRef.current = L.featureGroup().addTo(mapRef.current);

      // Load initial marker if coordinates exist
      if (selectedLocation.lat && selectedLocation.lng) {
        markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng], {
          icon: new L.Icon.Default(),
        }).addTo(mapRef.current);
      }

      // Load initial geofence if exists
      if (initialGeofence) {
        L.geoJSON(initialGeofence as any, {
          style: {
            color: '#2563eb',
            weight: 2,
            fillOpacity: 0.15,
          },
        }).addTo(featureGroupRef.current);
        setSelectedGeofence(initialGeofence);
      }

      // Add Draw Control using the leaflet-draw library
      if ((L.Control as any).Draw) {
        drawControlRef.current = new (L.Control as any).Draw({
          position: 'topleft',
          draw: {
            polygon: true,
            polyline: false,
            rectangle: false,
            circle: false,
            marker: false,
            circlemarker: false,
          },
          edit: {
            featureGroup: featureGroupRef.current,
            remove: true,
          },
        });
        mapRef.current.addControl(drawControlRef.current);
        toast.info('Draw toolbar is available at top-left');
      } else {
        console.warn('Leaflet Draw control not available');
      }
    } catch (error) {
      console.error('Error initializing map:', error);
      toast.error('Failed to initialize map');
      return;
    }

    // Listen to draw events
    const handleDrawCreated = (e: any) => {
      try {
        const geojson = e.layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
        setSelectedGeofence(geojson.geometry);
        toast.success('Geofence created successfully');
      } catch (err) {
        console.error('Error in handleDrawCreated:', err);
      }
    };

    const handleDrawEdited = (e: any) => {
      try {
        e.layers.eachLayer((layer: any) => {
          const geojson = layer.toGeoJSON() as GeoJSON.Feature<GeoJSON.Polygon>;
          setSelectedGeofence(geojson.geometry);
        });
        toast.success('Geofence updated successfully');
      } catch (err) {
        console.error('Error in handleDrawEdited:', err);
      }
    };

    const handleDrawDeleted = (e: any) => {
      try {
        setSelectedGeofence(undefined);
        toast.success('Geofence cleared');
      } catch (err) {
        console.error('Error in handleDrawDeleted:', err);
      }
    };

    // Handle right-click to start drawing
    const handleContextMenu = (e: L.LeafletMouseEvent) => {
      e.originalEvent.preventDefault();
      if (drawControlRef.current && mapRef.current) {
        // Start polygon drawing mode
        const drawControl = drawControlRef.current as any;
        if (drawControl._toolbars && drawControl._toolbars.draw) {
          try {
            drawControl._toolbars.draw._modes.polygon.handler.enable();
            toast.info('Polygon drawing mode activated. Click to add points, double-click or press Esc to finish.');
          } catch (err) {
            console.error('Error enabling polygon draw:', err);
          }
        }
      }
    };

    // Handle map clicks to set single location
    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedLocation((prev) => ({ ...prev, lat, lng }));

      // Update marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: new L.Icon.Default() }).addTo(mapRef.current!);
      }

      // Fetch address
      await fetchAddress(lat, lng);
    };

    if (mapRef.current) {
      mapRef.current.on('draw:created', handleDrawCreated);
      mapRef.current.on('draw:edited', handleDrawEdited);
      mapRef.current.on('draw:deleted', handleDrawDeleted);
      mapRef.current.on('click', handleMapClick);
      mapRef.current.on('contextmenu', handleContextMenu);
    }

    // Force map size recalculation
    const timeouts: NodeJS.Timeout[] = [];
    
    timeouts.push(setTimeout(() => {
      if (mapRef.current) {
        console.log('Calling invalidateSize');
        mapRef.current.invalidateSize();
        console.log('Map initialized and visible');
        toast.info('Map ready! Click to set location, right-click to draw geofence');
      }
    }, 100));

    timeouts.push(setTimeout(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    }, 500));

    return () => {
      clearTimeout(initTimeout);
      // Clear timeouts
      timeouts.forEach(timeout => clearTimeout(timeout));
      
      if (mapRef.current) {
        mapRef.current.off('draw:created', handleDrawCreated);
        mapRef.current.off('draw:edited', handleDrawEdited);
        mapRef.current.off('draw:deleted', handleDrawDeleted);
        mapRef.current.off('click', handleMapClick);
        mapRef.current.off('contextmenu', handleContextMenu);
      }
    };
    }); // Close the initTimeout setTimeout

  }, [isOpen]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      setIsLoadingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const address = data.address?.name || data.display_name || 'Address not found';
      setSelectedLocation((prev) => ({ ...prev, lat, lng, address }));
    } catch (error) {
      console.error('MapPortal: Error fetching address:', error);
      toast.error('Failed to fetch address');
    } finally {
      setIsLoadingAddress(false);
    }
  };

  const searchAddress = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter an address to search');
      return;
    }

    try {
      setIsSearching(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=1`
      );
      const data = await response.json();

      if (data.length === 0) {
        toast.error('Address not found. Try a different search term.');
        return;
      }

      const result = data[0];
      const lat = parseFloat(result.lat);
      const lng = parseFloat(result.lon);
      const address = result.display_name;

      setSelectedLocation({ lat, lng, address });

      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 17);
      }

      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: new L.Icon.Default() }).addTo(mapRef.current!);
      }

      setSearchQuery('');
      toast.success('Location found');
    } catch (error) {
      console.error('Error searching address:', error);
      toast.error('Failed to search address');
    } finally {
      setIsSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchAddress();
    }
  };

  const handleConfirm = () => {
    onLocationSelect(selectedLocation.lat, selectedLocation.lng, selectedLocation.address, selectedGeofence);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-full max-h-full w-screen h-screen p-0 border-0 flex flex-col">
        <DialogTitle className="sr-only">Select Location & Draw Geofence</DialogTitle>
        <DialogDescription className="sr-only">
          Use the map to select a location by clicking. Draw a geofence polygon using the toolbar or right-click.
        </DialogDescription>
        <div className="w-full h-full flex flex-col bg-background">
          {/* Header - Simplified without redundant close button */}
          <div className="border-b p-4 flex items-center justify-between bg-card">
            <div>
              <h2 className="text-lg font-semibold">Select Location & Draw Geofence</h2>
            </div>
          </div>

          {/* Search Bar */}
          <div className="border-b p-4 bg-card flex gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                type="text"
                placeholder="Search location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                className="pl-10"
                disabled={isSearching}
              />
            </div>
            <Button onClick={searchAddress} disabled={isSearching} size="sm">
              {isSearching ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Searching
                </>
              ) : (
                <>
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </>
              )}
            </Button>

            {/* Info */}
            <div className="flex-1 text-sm text-muted-foreground flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              <span>
                Lat: {selectedLocation.lat.toFixed(6)} | Lng: {selectedLocation.lng.toFixed(6)}
              </span>
            </div>
          </div>

          {/* Address Display */}
          {isLoadingAddress ? (
            <div className="p-4 bg-muted flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Fetching address...</span>
            </div>
          ) : selectedLocation.address ? (
            <div className="p-4 bg-muted border-b text-sm text-muted-foreground">
              <strong>Address:</strong> {selectedLocation.address}
            </div>
          ) : null}

          {/* Map Container - Fixed sizing */}
          <div className="flex-1 relative bg-slate-900 overflow-hidden w-full h-full">
            <div ref={mapContainerRef} className="w-full h-full" />
            
            {/* Overlay instructions - positioned absolutely over map */}
            <div className="absolute bottom-4 left-4 z-40 bg-black/80 text-white text-xs p-3 rounded border border-blue-500 max-w-xs pointer-events-none">
              <div className="font-semibold mb-2">Instructions:</div>
              <ul className="space-y-1">
                <li>• <strong>Click</strong> on map to set location marker</li>
                <li>• <strong>Right-click</strong> to draw geofence (polygon)</li>
                <li>• Use toolbar (top-left) to draw/edit/delete geofence</li>
                <li>• Confirm location when done</li>
              </ul>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t p-4 bg-card flex justify-between items-center">
            <div className="text-sm text-muted-foreground">
              {selectedGeofence ? '✓ Geofence selected' : 'No geofence drawn'}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleConfirm} size="sm" className="bg-green-600 hover:bg-green-700">
                <Check className="h-4 w-4 mr-2" />
                Confirm & Close
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
