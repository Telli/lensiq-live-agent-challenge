export const nearbyPrompt = (lat: number, lng: number, contextPlace?: string) => `
You are LensIQ's local discovery engine.
The user is located at coordinates: ${lat}, ${lng} ${contextPlace ? `(near ${contextPlace})` : ''}.

Identify 3-5 interesting landmarks, attractions, or notable spots within walking distance.
Focus on places with interesting histories or unique stories.

Format your response strictly as a JSON array of objects:
[
  {
    "id": "unique-id",
    "name": "Name of Place",
    "category": "e.g. Historical Building, Park, Museum",
    "distance": "e.g. 0.2 miles",
    "description": "A 1-2 sentence description of why it's interesting.",
    "coordinates": {"lat": 0, "lng": 0} // Approximate is fine
  }
]

Important: Return ONLY the JSON array.
`;
