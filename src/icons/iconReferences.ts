import MaterialIcons from "@expo/vector-icons/MaterialIcons";

export type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

export interface BuiltInIcon {
  label: string;
  name: MaterialIconName;
}

export const BUILT_IN_ICONS: readonly BuiltInIcon[] = [
  { label: "Music note", name: "music-note" },
  { label: "Equalizer", name: "graphic-eq" },
  { label: "Announcement", name: "campaign" },
  { label: "Bell", name: "notifications-active" },
  { label: "Piano", name: "piano" },
  { label: "Microphone", name: "mic" },
  { label: "Album", name: "album" },
  { label: "Headphones", name: "headphones" },
  { label: "Lightning", name: "bolt" },
  { label: "Star", name: "star" },
];

const MATERIAL_PREFIX = "material:";

export function materialIconReference(name: MaterialIconName): string {
  return `${MATERIAL_PREFIX}${name}`;
}

export function materialIconName(
  iconUri: string | null,
): MaterialIconName | null {
  if (!iconUri?.startsWith(MATERIAL_PREFIX)) return null;
  const name = iconUri.slice(MATERIAL_PREFIX.length) as MaterialIconName;
  return Object.prototype.hasOwnProperty.call(MaterialIcons.glyphMap, name)
    ? name
    : null;
}

export function isImageIconReference(iconUri: string | null): boolean {
  return iconUri !== null && !iconUri.startsWith(MATERIAL_PREFIX);
}
