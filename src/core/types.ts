export type Landscape = 'nest' | 'city' | 'mountains' | 'desert' | 'sea' | 'savanna';
export interface Condition { flag?: string; minEnergy?: number; minAgeDays?: number }
export interface Effect { energy?: number; health?: number; flags?: string[] }
export interface Choice {
  id: string; title: string; hint: string; result: string; effect?: Effect;
  requires?: Condition; flight?: 'learn' | 'forage' | 'migrate';
  chance?: { probability: number; result: string; effect: Effect };
}
export interface LifeEvent {
  id: string; chapter: number; title: string; paragraphs: string[];
  season: string; location: string; ageDays: number; ageLabel: string;
  landscape: Landscape; choices: Choice[]; fact?: string;
}
export interface Fact { id: string; title: string; text: string; source: string; sourceLabel: string; boundary: string }
export interface Species {
  id: string; name: string; scientificName: string; chapters: string[];
  events: LifeEvent[]; facts: Fact[];
}
export interface Memory { eventId: string; title: string; choice: string; result: string; location: string }
export interface Pending { result: string; energyDelta: number; healthDelta: number; flight?: Choice['flight'] }
export interface GameState {
  schema: 1; contentVersion: string; speciesId: string; cursor: number;
  energy: number; health: number; ageDays: number; flags: string[];
  facts: string[]; history: Memory[]; randomSeed: number;
  pending: Pending | null; completed: boolean;
}
export interface FlightResult { insects: number; gusts: number; assisted: boolean }
