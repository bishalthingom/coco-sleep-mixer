// src/state/mix.ts
import { atom } from "jotai";

// Define two sounds for now. You can swap sources later.
export type TrackDef = {
  id: string;
  name: string;
  // local require for now; can be string URL later
  source: any;
};

export const catalogAtom = atom<TrackDef[]>([
  {
    id: "soundPiano",
    name: "Soft Piano",
    source: require("../../assets/sounds/dreaming-castle-soft-piano-music-259726.mp3"),
  },
  {
    id: "soundChatter",
    name: "People Chatter",
    source: require("../../assets/sounds/people-talking-in-small-room-6064.mp3"),
  },
]);

export type TrackState = {
  isOn: boolean; // selected in the mixer
  gain: number; // 0..1
};

export type MixState = Record<string, TrackState>;

// Default: both off
export const mixStateAtom = atom<MixState>({
  soundA: { isOn: false, gain: 0.6 },
  soundB: { isOn: false, gain: 0.6 },
});

// Global master for convenience
export const masterGainAtom = atom(0.8);
