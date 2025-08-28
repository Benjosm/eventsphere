import { useEffect } from 'react';
import { EventStore, Event } from '../EventStore';
import { v4 as uuidv4 } from 'uuid';

const cities = [
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
  { name: 'Cape Town', lat: -33.9249, lon: 18.4241 },
  { name: 'Sao Paulo', lat: -23.5505, lon: -46.6333 },
  { name: 'Moscow', lat: 55.7558, lon: 37.6173 },
  { name: 'Singapore', lat: 1.3521, lon: 103.8198 },
  { name: 'Los Angeles', lat: 34.0522, lon: -118.2437 },
  { name: 'Cairo', lat: 30.0444, lon: 31.2357 },
];

const categories: Array<'natural_disaster' | 'political' | 'health' | 'other'> = [
  'natural_disaster',
  'political',
  'health',
  'other'
];

/**
 * Dev-only tool to generate and inject a large test dataset into EventStore
 * for performance and accuracy validation.
 */
const PerformanceTestTool = () => {
  useEffect(() => {
    const loadTestEvents = async () => {
      console.log('Generating 5000 test events...');
      const events: Event[] = [];

      // Generate 5000 events
      for (let i = 0; i < 5000; i++) {
        let lat: number, lon: number;

        // Ensure some events are near edge cases
        if (i < 50) {
          // Poles
          lat = i % 2 === 0 ? 89.9 : -89.9;
          lon = Math.random() * 360 - 180;
        } else if (i < 100) {
          // Prime Meridian and International Date Line
          lat = (Math.random() * 160) - 80;
          lon = i % 2 === 0 ? 0.1 : 179.9;
        } else {
          // Mostly real cities with some random variation, and some purely random
          if (i % 5 !== 0) {
            // From cities
            const city = cities[Math.floor(Math.random() * cities.length)];
            lat = city.lat + (Math.random() - 0.5) * 2;
            lon = city.lon + (Math.random() - 0.5) * 2;
          } else {
            // Random
            lat = (Math.random() * 180) - 90;
            lon = (Math.random() * 360) - 180;
          }
        }

        events.push({
          id: uuidv4(),
          title: `Test Event ${i + 1}`,
          category: categories[Math.floor(Math.random() * categories.length)],
          latitude: lat,
          longitude: lon,
          timestamp: Date.now() - Math.random() * 1000 * 60 * 60 * 24 * 30 // Last 30 days
        });
      }

      console.log('Injecting 5000 events into EventStore...');
      await EventStore.getInstance().createMany(events);
      console.log('✅ 5000 test events loaded successfully.');
    };

    // Only run in development mode
    if (import.meta.env.DEV) {
      // Delay slightly to allow app to initialize
      const timeoutId = setTimeout(() => {
        console.log('AUTO-STARTING Performance Test: Loading 5000 events...');
        loadTestEvents();
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, []);

  return null;
};

export default PerformanceTestTool;
