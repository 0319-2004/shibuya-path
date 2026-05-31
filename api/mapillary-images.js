const SHIBUYA_BOUNDS = {
  west: 139.68,
  south: 35.64,
  east: 139.73,
  north: 35.68
};

const DEFAULT_BBOX = [139.699, 35.657, 139.705, 35.663];
const MAX_SPAN = 0.012;

function send(response, status, body) {
  response.status(status).json(body);
}

function parseBbox(value) {
  const bbox = (value || DEFAULT_BBOX.join(",")).split(",").map(Number);
  if (bbox.length !== 4 || bbox.some((coordinate) => !Number.isFinite(coordinate))) {
    throw new Error("bbox must contain west,south,east,north coordinates");
  }

  const [west, south, east, north] = bbox;
  const outsideShibuya =
    west < SHIBUYA_BOUNDS.west ||
    south < SHIBUYA_BOUNDS.south ||
    east > SHIBUYA_BOUNDS.east ||
    north > SHIBUYA_BOUNDS.north;

  if (west >= east || south >= north || east - west > MAX_SPAN || north - south > MAX_SPAN || outsideShibuya) {
    throw new Error("bbox must be a small area within Shibuya");
  }

  return bbox.join(",");
}

export default async function handler(request, response) {
  response.setHeader("Access-Control-Allow-Origin", "https://0319-2004.github.io");
  response.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type");
  response.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");

  if (request.method === "OPTIONS") return response.status(204).end();
  if (request.method !== "GET") return send(response, 405, { error: "Method not allowed" });

  const token = process.env.MAPILLARY_ACCESS_TOKEN;
  if (!token) return send(response, 503, { error: "Mapillary is not configured yet" });

  try {
    const bbox = parseBbox(request.query.bbox);
    const params = new URLSearchParams({
      access_token: token,
      bbox,
      fields: "id,computed_geometry,computed_compass_angle,captured_at,sequence,thumb_1024_url",
      limit: "40"
    });
    const mapillaryResponse = await fetch(`https://graph.mapillary.com/images?${params}`);
    const data = await mapillaryResponse.json();

    if (!mapillaryResponse.ok) {
      return send(response, 502, { error: "Mapillary request failed" });
    }

    return send(response, 200, { images: data.data || [] });
  } catch (error) {
    return send(response, 400, { error: error.message });
  }
}
