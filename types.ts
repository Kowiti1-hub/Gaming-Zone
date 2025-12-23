
export enum DriverName {
  MALON = 'Malon',
  DANIEL = 'Daniel',
  JOHN = 'John',
  DANIELLA = 'Daniella'
}

export interface Driver {
  name: DriverName;
  origin: string;
  bio: string;
  avatar: string;
}

export enum BusSize {
  SMALL = 'Small',
  MEDIUM = 'Medium',
  LARGE = 'Large'
}

export interface Bus {
  id: string;
  name: string;
  size: BusSize;
  maxSpeed: number;
  acceleration: number;
  capacity: number;
  image: string;
  color: string;
}

export enum TerrainType {
  CITY = 'City',
  SUBURBAN = 'Suburban',
  VILLAGE = 'Village'
}

export enum RoadType {
  PAVED = 'Paved',
  OFFROAD = 'Off-road'
}

export enum WeatherType {
  CLEAR = 'Clear',
  RAIN = 'Rain',
  FOG = 'Fog'
}

export interface GameState {
  currentDistance: number;
  speed: number;
  passengers: number;
  money: number;
  isStopped: boolean;
  currentStopId: string | null;
  selectedBus: Bus;
  selectedDriver: Driver;
  gameStatus: 'MENU' | 'DRIVING' | 'STOPPED' | 'RESTING';
  terrain: TerrainType;
  road: RoadType;
  weather: WeatherType;
  lastStopDistance: number;
  nextStopDistance: number;
}

export interface StopInfo {
  id: string;
  name: string;
  distance: number;
  isRestStop: boolean;
  type: TerrainType;
}
