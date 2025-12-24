
import { Driver, DriverName, Bus, BusSize, TerrainType } from './types';

export const DRIVERS: Driver[] = [
  {
    name: DriverName.MALON,
    origin: 'Kenya',
    bio: 'Expert in navigating rough terrains and narrow village paths.',
    avatar: 'https://picsum.photos/seed/malon/100/100'
  },
  {
    name: DriverName.DANIEL,
    origin: 'India',
    bio: 'Highly skilled in heavy traffic and precision city maneuvers.',
    avatar: 'https://picsum.photos/seed/daniel/100/100'
  },
  {
    name: DriverName.JOHN,
    origin: 'Europe',
    bio: 'Specialist in high-speed highway transit and comfort.',
    avatar: 'https://picsum.photos/seed/john/100/100'
  },
  {
    name: DriverName.DANIELLA,
    origin: 'America',
    bio: 'Masters long-distance routes with exceptional efficiency.',
    avatar: 'https://picsum.photos/seed/daniella/100/100'
  }
];

export const BUSES: Bus[] = [
  {
    id: 'shuttle-01',
    name: 'Swift Shuttle',
    size: BusSize.SMALL,
    maxSpeed: 80,
    acceleration: 0.5,
    capacity: 12,
    image: '🚌',
    color: '#FBBF24'
  },
  {
    id: 'transit-02',
    name: 'City Cruiser',
    size: BusSize.MEDIUM,
    maxSpeed: 100,
    acceleration: 0.35,
    capacity: 45,
    image: '🚎',
    color: '#3B82F6'
  },
  {
    id: 'coach-03',
    name: 'Global Voyager',
    size: BusSize.LARGE,
    maxSpeed: 120,
    acceleration: 0.2,
    capacity: 80,
    image: '🚍',
    color: '#10B981'
  }
];

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;

export const CITY_THRESHOLD = 5000;
export const SUBURBAN_THRESHOLD = 15000;
export const VILLAGE_THRESHOLD = 30000;

export const SPEED_LIMITS: Record<TerrainType, number> = {
  [TerrainType.CITY]: 60,
  [TerrainType.SUBURBAN]: 90,
  [TerrainType.VILLAGE]: 40
};

export const STOP_INTERVAL_CITY_MIN = 6; // seconds
export const STOP_INTERVAL_CITY_MAX = 30; // seconds
export const REST_STOP_INTERVAL = 50; // seconds

export const TRAFFIC_LIGHT_DISTANCE = 2500; // units between city traffic lights
export const TRAFFIC_LIGHT_CYCLE = 15000; // ms per full cycle (Red -> Green -> Yellow)
