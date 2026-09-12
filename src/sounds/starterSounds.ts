import type { AudioSource } from "expo-audio";

export interface StarterSound {
  id: string;
  name: string;
  source: AudioSource;
}

export const starterSounds: readonly StarterSound[] = [
  {
    id: "bloom",
    name: "Bloom",
    source: require("../../assets/sounds/bloom.wav"),
  },
  {
    id: "click",
    name: "Click",
    source: require("../../assets/sounds/click.wav"),
  },
  { id: "rise", name: "Rise", source: require("../../assets/sounds/rise.wav") },
  { id: "low", name: "Low", source: require("../../assets/sounds/low.wav") },
];
