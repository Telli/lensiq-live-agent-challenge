import { useState, useEffect } from 'react';
import { Place } from '../types';
import { aiService } from '../services/aiService';

export function useNearbyAttractions() {
  const [attractions, setAttractions] = useState<Place[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAttractions = async () => {
      try {
        setIsLoading(true);
        
        // Use a default location (e.g., San Francisco) if geolocation is not available
        let lat = 37.7749;
        let lng = -122.4194;
        
        if (navigator.geolocation) {
          try {
            const position = await new Promise<GeolocationPosition>((resolve, reject) => {
              navigator.geolocation.getCurrentPosition(resolve, reject);
            });
            lat = position.coords.latitude;
            lng = position.coords.longitude;
          } catch (e) {
            console.warn("Geolocation denied or failed, using default location.");
          }
        }

        const result = await aiService.getNearbyAttractions(lat, lng);
        
        // Extract places from grounding chunks
        const places: Place[] = [];
        if (result.chunks) {
          result.chunks.forEach((chunk: any) => {
            const mapData = chunk.maps || chunk.web;
            if (mapData?.title && mapData?.uri) {
              places.push({
                id: Math.random().toString(36).substr(2, 9),
                name: mapData.title,
                description: mapData.title,
                didYouKnow: "Found via Google Maps Grounding",
                facts: ["Found via Google Maps Grounding"],
                audioSummary: "",
                imageUrl: `https://picsum.photos/seed/${mapData.title}/400/300`,
                category: 'Nearby',
                distance: 'Unknown',
                coordinates: { lat, lng }
              });
            }
          });
        }
        
        // If no chunks, parse the text
        if (places.length === 0) {
           places.push({
              id: Math.random().toString(36).substr(2, 9),
              name: "Nearby Attraction",
              description: result.text.substring(0, 100) + "...",
              didYouKnow: "Found via AI",
              facts: ["Found via AI"],
              audioSummary: "",
              imageUrl: `https://picsum.photos/seed/nearby/400/300`,
              category: 'Nearby',
              distance: 'Unknown',
              coordinates: { lat, lng }
           });
        }

        setAttractions(places);
      } catch (err) {
        console.error("Error fetching nearby attractions:", err);
        setError('Failed to load nearby attractions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAttractions();
  }, []);

  return { attractions, isLoading, error };
}
