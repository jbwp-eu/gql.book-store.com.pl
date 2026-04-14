const API_KEY = process.env.GOOGLE_MAPS_API_KEY_geocoding;

type GeocodeResponse = {
  status: string;
  results: {
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }[];
  error_message?: string;
};

async function geocode(address: string): Promise<GeocodeResponse | null> {
  const response = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
      address
    )}&key=${API_KEY}`
  );
  if (!response.ok) return null;
  return (await response.json()) as GeocodeResponse;
}

type Coordinates = { lat: number; lng: number };

async function getCoordsForAddress(address: string): Promise<Coordinates> {
  try {
    if (!address || typeof address !== "string" || !address.trim()) {
      throw new Error("Could not get location for the specified address");
    }

    let data: GeocodeResponse | null = await geocode(address.trim());

    if (!data || data.status !== "OK") {
      const fallback = address.trim().includes(",")
        ? null
        : `${address.trim()}, Warsaw, Poland`;
      if (fallback) {
        data = await geocode(fallback);
      }
    }

    if (!data || data.status !== "OK") {
      const apiMessage = data?.error_message || data?.status || "Unknown";
      console.warn("Geocode API failed:", {
        status: data?.status,
        error_message: apiMessage,
        address,
      });
      throw new Error("Could not get location for the specified address");
    }

    const firstResult = data.results?.[0];
    if (!firstResult?.geometry?.location) {
      console.warn("Geocode API: no geometry in results", { address });
      throw new Error("Could not get location for the specified address");
    }
    const coordinates = firstResult.geometry.location;

    return coordinates;
  } catch (err) {
    console.error("getCoordsForAddress error:", err);
    throw err instanceof Error ? err : new Error("Failed to get coordinates");
  }
}

export default getCoordsForAddress;
