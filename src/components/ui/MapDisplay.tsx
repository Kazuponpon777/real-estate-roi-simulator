
import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
// import L from 'leaflet';
import { searchAddress } from '../../utils/geocoding';

// Fix for default marker icon in React Leaflet
// import icon from 'leaflet/dist/images/marker-icon.png';
// import iconShadow from 'leaflet/dist/images/marker-shadow.png';
// 
// let DefaultIcon = L.icon({
//     iconUrl: icon,
//     shadowUrl: iconShadow,
//     iconSize: [25, 41],
//     iconAnchor: [12, 41]
// });
// 
// L.Marker.prototype.options.icon = DefaultIcon;

interface MapDisplayProps {
    address: string;
    className?: string;
}

const RecenterMap: React.FC<{ lat: number; lon: number }> = ({ lat, lon }) => {
    const map = useMap();
    useEffect(() => {
        map.setView([lat, lon], map.getZoom());
    }, [lat, lon, map]);
    return null;
};

export const MapDisplay: React.FC<MapDisplayProps> = ({ address, className }) => {
    const [coords, setCoords] = useState<{ lat: number; lon: number } | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchCoords = async () => {
            if (!address || address.length < 5) return;

            setLoading(true);
            // Debounce is handled by waiting for typring or we can just delay here
            // For now, let's just wait 1s after address changes to avoid too many requests
            const timer = setTimeout(async () => {
                const result = await searchAddress(address);
                if (result) {
                    setCoords({ lat: parseFloat(result.lat), lon: parseFloat(result.lon) });
                }
                setLoading(false);
            }, 1000);

            return () => clearTimeout(timer);
        };
        fetchCoords();
    }, [address]);

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
                        {/* Target Area Circle */}
                        <CircleMarker
                            center={[coords.lat, coords.lon]}
                            radius={20}
                            pathOptions={{
                                color: '#ef4444',
                                fillColor: '#ef4444',
                                fillOpacity: 0.4,
                                weight: 2
                            }}
                        />
                        {/* Center Point */}
                        <CircleMarker
                            center={[coords.lat, coords.lon]}
                            radius={4}
                            pathOptions={{
                                color: '#ffffff',
                                fillColor: '#ef4444',
                                fillOpacity: 1,
                                weight: 1.5
                            }}
                        >
                            <Popup>
                                {address}
                            </Popup>
                        </CircleMarker>
                        <RecenterMap lat={coords.lat} lon={coords.lon} />
                    </>
                )}
            </MapContainer>
            {loading && (
                <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-[1000]">
                    <div className="animate-spin h-6 w-6 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                </div>
            )}
        </div>
    );
};
