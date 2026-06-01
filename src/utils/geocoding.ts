
interface GeocodingResult {
    lat: string;
    lon: string;
    display_name: string;
}

export const searchAddress = async (address: string): Promise<GeocodingResult | null> => {
    if (!address) return null;

    try {
        // OpenStreetMap Nominatim APIの利用規約に基づき、特定のアプリケーション名を含むUser-Agentヘッダーを送信（突然のブロックを防止）
        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`,
            {
                headers: {
                    'User-Agent': 'Yashima-ROI-Simulator/1.3 (yashimaltd)'
                }
            }
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
