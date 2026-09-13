import type { AudioSource } from "expo-audio";
import { resolveManagedAudio } from "../media/mediaPaths";

export interface PlayableSound {
  id: string;
  hideBorder?: boolean;
  iconUri?: string | null;
  name: string;
  source: AudioSource;
}

export const starterSounds: readonly PlayableSound[] = [
  {
    id: "bloom",
    iconUri: null,
    name: "Bloom",
    source: require("../../assets/sounds/bloom.wav"),
  },
  {
    id: "click",
    iconUri: null,
    name: "Click",
    source: require("../../assets/sounds/click.wav"),
  },
  {
    id: "rise",
    iconUri: null,
    name: "Rise",
    source: require("../../assets/sounds/rise.wav"),
  },
  {
    id: "low",
    iconUri: null,
    name: "Low",
    source: require("../../assets/sounds/low.wav"),
  },
];

const bundledSources = new Map(
  starterSounds.map((sound) => [`bundled:${sound.id}`, sound.source]),
);

export function resolveBundledSound(
  id: string,
  iconUri: string | null,
  name: string,
  mediaPath: string,
  hideBorder = false,
): PlayableSound | null {
  const source = bundledSources.get(mediaPath);
  return source === undefined
    ? null
    : { id, hideBorder, iconUri, name, source };
}

export function resolvePlayableSound(
  id: string,
  iconUri: string | null,
  name: string,
  mediaPath: string,
  hideBorder = false,
): PlayableSound | null {
  const bundled = resolveBundledSound(id, iconUri, name, mediaPath, hideBorder);
  if (bundled) return bundled;

  const file = resolveManagedAudio(mediaPath);
  return file?.exists
    ? { id, hideBorder, iconUri, name, source: file.uri }
    : null;
}
