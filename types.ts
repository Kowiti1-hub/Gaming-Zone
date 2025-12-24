
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

export enum IndicatorType {
  OFF = 'OFF',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT'
}

export enum GearType {
  PARK = 'P',
  REVERSE = 'R',
  NEUTRAL = 'N',
  DRIVE = 'D',
  G1 = '1',
  G2 = '2',
  G3 = '3',
  G4 = '4',
  G5 = '5'
}

export enum TransmissionType {
  AUTOMATIC = 'AUTO',
  MANUAL = 'MANUAL'
}

export enum CameraView {
  CHASE = 'CHASE',
  TOP = 'TOP',
  LEFT = 'LEFT',
  RIGHT = 'RIGHT',
  FRONT = 'FRONT',
  REAR_CLOSE = 'REAR_CLOSE',
  REAR_DIST = 'REAR_DIST'
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
  rainIntensity: number;
  lastStopDistance: number;
  nextStopDistance: number;
  headlightsOn: boolean;
  wipersActive: boolean;
  steeringAngle: number;
  indicatorStatus: IndicatorType;
  rearViewActive: boolean;
  gear: GearType;
  transmission: TransmissionType;
  cameraView: CameraView;
  handbrakeActive: boolean;
  roadCurve: number;
  currentCurve: number;
  totalViolations: number;
  isFull: boolean;
  bodyRoll: number;
  bodyPitch: number;
  suspensionY: number;
  rpm: number;
}

export interface StopInfo {
  id: string;
  name: string;
  distance: number;
  isRestStop: boolean;
  type: TerrainType;
}
