export type Landscape = 'nest' | 'city' | 'mountains' | 'desert' | 'sea' | 'savanna';
export interface Condition { flag?: string; minEnergy?: number; minAgeDays?: number }
export interface Effect { energy?: number; health?: number; flags?: string[] }
export interface Failure { title: string; reason: string; lesson: string }
export interface TaskChannel { id: string; label: string; hint: string; min: number; max?: number }
export interface AllocationTask { budget: number; channels: TaskChannel[]; success: string; failure: Failure }
export interface Choice {
  id: string; title: string; hint: string; result: string; effect?: Effect;
  requires?: Condition; flight?: 'learn' | 'forage' | 'migrate';
  chance?: { probability: number; result: string; effect: Effect };
  failure?: Failure;
  details?: string[];
}
export interface LifeEvent {
  id: string; chapter: number; title: string; paragraphs: string[];
  season: string; location: string; ageDays: number; ageLabel: string;
  landscape: Landscape; choices: Choice[]; fact?: string;
  task?: AllocationTask;
  interaction?: 'choice' | 'nest-site' | 'route' | 'readiness';
  perspective?: string;
}
export interface Fact { id: string; title: string; text: string; source: string; sourceLabel: string; boundary: string }
export interface Species {
  id: string; name: string; scientificName: string; chapters: string[];
  events: LifeEvent[]; facts: Fact[];
}
export interface Memory { eventId: string; title: string; choice: string; result: string; location: string }
export interface Pending { result: string; energyDelta: number; healthDelta: number; flight?: Choice['flight']; failure?: Failure }
export interface Attempt { eventId: string; choice: string; failure: Failure }
export interface GameState {
  schema: 2; contentVersion: string; speciesId: string; cursor: number;
  energy: number; health: number; ageDays: number; flags: string[];
  facts: string[]; history: Memory[]; randomSeed: number;
  pending: Pending | null; completed: boolean;
  attempts: Attempt[];
}
export interface FlightResult { insects: number; gusts: number; assisted: boolean }
