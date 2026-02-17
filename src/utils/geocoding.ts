
interface GeocodingResult {
    lat: string;
    lon: string;
    display_name: string;
}

export const searchAddress = async (address: string): Promise<GeocodingResult | null> => {
    if (!address) return null;

    try {
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`
        );
        const data = await response.json();

        if (data && data.length > 0) {
            return {
                lat: data[0].lat,
                lon: data[0].lon,
                display_name: data[0].display_name
            };
        }
    } catch (error) {
        console.error("Geocoding error:", error);
    }
    return null;
};
