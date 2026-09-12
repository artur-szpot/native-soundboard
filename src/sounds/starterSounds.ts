import type { AudioSource } from "expo-audio";

export interface PlayableSound {
  id: string;
  name: string;
  source: AudioSource;
}

export const starterSounds: readonly PlayableSound[] = [
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

const bundledSources = new Map(
  starterSounds.map((sound) => [`bundled:${sound.id}`, sound.source]),
);

export function resolveBundledSound(
  id: string,
  name: string,
  mediaPath: string,
): PlayableSound | null {
  const source = bundledSources.get(mediaPath);
  return source === undefined ? null : { id, name, source };
}
