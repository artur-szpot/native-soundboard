import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { File, Paths } from "expo-file-system";
import { Image, StyleSheet } from "react-native";

import {
    materialIconName,
    type MaterialIconName,
} from "../icons/iconReferences";
import { IMAGE_MEDIA_DIRECTORY } from "../media/mediaPaths";

interface IconArtworkProps {
  color: string;
  fallback: MaterialIconName;
  iconUri: string | null;
  size: number;
  testID?: string;
}

export function IconArtwork({
  color,
  fallback,
  iconUri,
  size,
  testID,
}: IconArtworkProps) {
  const materialName = materialIconName(iconUri);
  if (materialName || !iconUri) {
    return (
      <MaterialIcons
        color={color}
        name={materialName ?? fallback}
        size={size}
        testID={testID}
      />
    );
  }

  const uri = iconUri.startsWith(`${IMAGE_MEDIA_DIRECTORY}/`)
    ? new File(Paths.document, iconUri).uri
    : iconUri;
  return (
    <Image
      resizeMode="cover"
      source={{ uri }}
      style={[styles.image, { width: size, height: size }]}
      testID={testID}
    />
  );
}

const styles = StyleSheet.create({
  image: { borderRadius: 3 },
});
