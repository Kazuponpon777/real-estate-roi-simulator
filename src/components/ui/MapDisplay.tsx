
import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// import L from 'leaflet';
import { searchAddress } from '../../utils/geocoding';

interface MapDisplayProps {
    address: string;
    latitude?: number | null;
    longitude?: number | null;
    onLocationChange?: (lat: number, lon: number) => void;
    className?: string;
}

const RecenterMap: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lon], map.getZoom());
    }, [lat, lon, map]);
    return null;
};

// Component to handle drag events
const DraggableMarker: React.FC<{
    position: { lat: number, lon: number },
    onDragEnd: (lat: number, lon: number) => void,
    address: string
}> = ({ position, onDragEnd, address }) => {
    const markerRef = useRef<any>(null);

    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    onDragEnd(lat, lng);
                }
            },
        }),
        [onDragEnd],
    );

    return (
        <>
            {/* Target Area Circle (Static visual aid) */}
            <CircleMarker
                center={[position.lat, position.lon]}
                radius={20}
                pathOptions={{
                    color: '#ef4444',
                    fillColor: '#ef4444',
                    fillOpacity: 0.4,
                    weight: 2,
                    interactive: false // Allow clicking through to the draggable marker if needed
                }}
            />
            {/* Draggable Center Point (Invisible interactive area + Visible dot) */}
            {/* Since CircleMarker isn't draggable, we use a standard Marker with a custom divIcon or just rely on the click/drag logic. 
                Actually, CircleMarker is NOT draggable in Leaflet. 
                We need to use a standard Marker with a custom icon that looks like our center dot, or just wrap it. 
                Let's use a standard Marker with opacity 0 for the drag handle, and generic CircleMarkers for visuals? 
                Or better: Use a standard Marker with a custom DivIcon that renders our 'red dot'.
            */}
            <CircleMarker
                center={[position.lat, position.lon]}
                radius={4}
                pathOptions={{
                    color: '#ffffff',
                    fillColor: '#ef4444',
                    fillOpacity: 1,
                    weight: 1.5
                }}
            >
                <Popup>{address}</Popup>
            </CircleMarker>

            {/* Invisible Draggable Marker for Interaction */}
            <Marker
                draggable={true}
                eventHandlers={eventHandlers}
                position={[position.lat, position.lon]}
                ref={markerRef}
                opacity={0} // Invisible, but draggable
                zIndexOffset={1000}
            >
            </Marker>
        </>
    );
}

export const MapDisplay: React.FC<MapDisplayProps> = ({ address, latitude, longitude, onLocationChange, className }) => {
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [loading, setLoading] = useState(false);

    // Initial load & Address change
    useEffect(() => {
        const initCoords = async () => {
            // Prioritize passed lat/lon if available
            if (latitude && longitude) {
                setCoords({ lat: latitude, lon: longitude });
                return;
            }

            if (!address || address.length < 5) return;

            setLoading(true);
            const timer = setTimeout(async () => {
                const result = await searchAddress(address);
                if (result) {
                    const newLat = parseFloat(result.lat);
                    const newLon = parseFloat(result.lon);
                    setCoords({ lat: newLat, lon: newLon });
                    // Notify parent of the auto-found location
                    if (onLocationChange) {
                        onLocationChange(newLat, newLon);
                    }
                }
                setLoading(false);
            }, 1000);

            return () => clearTimeout(timer);
        };
        initCoords();
    }, [address]); // Intentionally not including latitude/longitude to avoid loop if parent updates them on change

    // If parent updates props manually (outside of our callback), sync state
    useEffect(() => {
        if (latitude && longitude) {
            setCoords(prev => {
                // Only update if significantly different to avoid jitter or loops
                if (!prev || Math.abs(prev.lat - latitude) > 0.000001 || Math.abs(prev.lon - longitude) > 0.000001) {
                    return { lat: latitude, lon: longitude };
                }
                return prev;
            });
        }
    }, [latitude, longitude]);

    const handleDragEnd = (lat: number, lon: number) => {
        setCoords({ lat, lon });
        if (onLocationChange) {
            onLocationChange(lat, lon);
        }
    };

    if (!coords && !loading) {
        return <div className={`h-64 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 ${className}`}>地図を表示するには住所を入力してください</div>;
    }

    // Default to Nagoya Station if no coords yet (initial load) or center on Japan
    const position: [number, number] = coords ? [coords.lat, coords.lon] : [35.1709, 136.8815];

    return (
        <div className={`h-64 rounded-xl overflow-hidden border border-slate-200 shadow-sm relative z-0 ${className}`}>
            <MapContainer center={position} zoom={15} scrollWheelZoom={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {coords && (
                    <>
                        <DraggableMarker
                            position={coords}
                            onDragEnd={handleDragEnd}
                            address={address}
                        />
                        <RecenterMap lat={coords.lat} lon={coords.lon} />
                    </>
                )}
            </MapContainer>
            {loading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
            )}
            {coords && (
                <div className="absolute bottom-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-slate-500 z-[400] pointer-events-none">
                    マーカーをドラッグして位置を調整できます
                </div>
            )}
        </div>
    );
};
