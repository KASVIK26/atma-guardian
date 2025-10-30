import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Search, MapPin, Loader2 } from 'lucide-react';

interface LocationPickerProps {
  latitude: number;
  longitude: number;
  address: string;
  onLocationChange: (lat: number, lng: number, address: string) => void;
  // optional: geofence GeoJSON (Polygon) is returned when drawn/updated
  onGeofenceChange?: (geojson: GeoJSON.Polygon | null) => void;
}

export function LocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  onGeofenceChange,
}: LocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);
  const geofencePointsRef = useRef<L.LatLngExpression[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingAddress, setIsLoadingAddress] = useState(false);
  const [isDrawing, setIsDrawing] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Fix marker icon issue (Leaflet default icon path) - do this before creating any markers
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl:
        'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    });

    // Create map
    mapRef.current = L.map(mapContainerRef.current).setView(
      [latitude || 37.427474, longitude || -122.169719],
      15
    );

    // Add OpenStreetMap tiles
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(mapRef.current);

    // Add marker if coordinates exist
    if (latitude && longitude && (latitude !== 0 || longitude !== 0)) {
      markerRef.current = L.marker([latitude, longitude], {
        icon: new L.Icon.Default(),
      }).addTo(mapRef.current);
    }

    // Handle map clicks to set location OR add drawing points
    const handleMapClick = async (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;

      if (isDrawing) {
        // Add vertex to geofence polygon
        geofencePointsRef.current.push([lat, lng]);

        // update polygon layer
        if (polygonRef.current) {
          polygonRef.current.setLatLngs(geofencePointsRef.current as any);
        } else {
          polygonRef.current = L.polygon(geofencePointsRef.current as any, {
            color: '#2563eb',
            weight: 2,
            fillOpacity: 0.15,
          }).addTo(mapRef.current!);
        }

        return;
      }

      // Normal single-point selection: Update or create marker (use explicit default icon)
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: new L.Icon.Default() }).addTo(
          mapRef.current!
        );
      }

      // Fetch address from coordinates. fetchAddress will call onLocationChange
      await fetchAddress(lat, lng);
    };

    mapRef.current.on('click', handleMapClick);


    // Ensure map renders correctly in some layouts
    setTimeout(() => mapRef.current?.invalidateSize(), 200);

    return () => {
      if (mapRef.current) {
        mapRef.current.off('click', handleMapClick);
      }
    };
  }, []);

  // Update map when latitude/longitude props change externally
  useEffect(() => {
    if (!mapRef.current) return;
    if (latitude === 0 && longitude === 0) return;

    // Pan to the new location (preserve current zoom) to avoid jump/zoom changes
    mapRef.current.panTo([latitude, longitude]);

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      markerRef.current = L.marker([latitude, longitude], { icon: new L.Icon.Default() }).addTo(
        mapRef.current
      );
    }
  }, [latitude, longitude]);

  const fetchAddress = async (lat: number, lng: number) => {
    try {
      setIsLoadingAddress(true);
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await response.json();
      const fetchedAddress = data.address?.name || data.display_name || 'Address not found';
      onLocationChange(lat, lng, fetchedAddress);
    } catch (error) {
      console.error('Error fetching address:', error);
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
      const fetchedAddress = result.display_name;

      // Update map (center and zoom in for search results)
      if (mapRef.current) {
        mapRef.current.setView([lat, lng], 17);
      }

      // Update or create marker
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
      } else {
        markerRef.current = L.marker([lat, lng], { icon: new L.Icon.Default() }).addTo(
          mapRef.current!
        );
      }

      // Update form
      onLocationChange(lat, lng, fetchedAddress);
      setSearchQuery('');
      toast.success('Location found and marked on map');
    } catch (error) {
      console.error('Error searching address:', error);
      toast.error('Failed to search address');
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearchKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      searchAddress();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Search Address</label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              type="text"
              placeholder="Search for a location (e.g., '123 Main St, City')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={handleSearchKeyPress}
              className="pl-10"
              disabled={isSearching}
            />
          </div>
          <Button
            type="button"
            onClick={searchAddress}
            disabled={isSearching}
            className="whitespace-nowrap"
          >
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
        </div>
        <p className="text-xs text-muted-foreground">
          💡 Tip: Click on the map to select a location, or search for an address above
        </p>
      </div>

      {/* Map Container */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Map - Click to Select Location</label>
        <div className="flex gap-4 items-start">
          <div
            ref={mapContainerRef}
            className="w-full h-96 rounded-lg border border-input shadow-sm bg-muted"
            style={{ zIndex: 0 }}
          />

          <div className="w-48 flex flex-col gap-2">
            <div className="text-sm font-medium">Geofence</div>
            <Button
              size={"sm" as any}
              onClick={() => {
                // start drawing
                geofencePointsRef.current = [];
                if (polygonRef.current) {
                  polygonRef.current.remove();
                  polygonRef.current = null;
                }
                setIsDrawing(true);
                toast('Tap on the map to add vertices. Click Finish when done.');
              }}
            >
              Start
            </Button>
            <Button
              size={"sm" as any}
              variant={"outline" as any}
              onClick={() => {
                // finish drawing
                setIsDrawing(false);
                if (geofencePointsRef.current.length >= 3 && polygonRef.current) {
                  // produce GeoJSON Polygon (coordinates: [lng, lat])
                  const coords = geofencePointsRef.current.map((p: any) => [p[1], p[0]]);
                  // ensure closed ring
                  if (
                    coords.length > 0 &&
                    (coords[0][0] !== coords[coords.length - 1][0] ||
                      coords[0][1] !== coords[coords.length - 1][1])
                  ) {
                    coords.push(coords[0]);
                  }
                  const geojson: GeoJSON.Polygon = {
                    type: 'Polygon',
                    coordinates: [coords],
                  };
                  onGeofenceChange?.(geojson);
                  toast.success('Geofence saved');
                } else {
                  onGeofenceChange?.(null);
                  toast.error('Geofence needs at least 3 points');
                }
              }}
            >
              Finish
            </Button>
            <Button
              size={"sm" as any}
              variant={"ghost" as any}
              onClick={() => {
                // clear
                geofencePointsRef.current = [];
                if (polygonRef.current) {
                  polygonRef.current.remove();
                  polygonRef.current = null;
                }
                onGeofenceChange?.(null);
                setIsDrawing(false);
              }}
            >
              Clear
            </Button>
            <div className="text-xs text-muted-foreground">Points: {geofencePointsRef.current.length}</div>
          </div>
        </div>
      </div>

      {/* Coordinates Display */}
      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-2">
          <label className="text-sm font-medium">Latitude</label>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono">{latitude.toFixed(6)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Longitude</label>
          <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="text-sm font-mono">{longitude.toFixed(6)}</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Address
          </label>
          {isLoadingAddress ? (
            <div className="flex items-center gap-2 p-2 bg-muted rounded-lg border">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-xs text-muted-foreground">Fetching...</span>
            </div>
          ) : (
            <div className="p-2 bg-muted rounded-lg border text-xs line-clamp-2 text-muted-foreground">
              {address || 'No address fetched yet'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
