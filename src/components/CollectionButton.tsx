import {
    type AccessibilityActionEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import type { Collection } from "../domain/models";
import { isImageIconReference } from "../icons/iconReferences";
import { usePlayback } from "../playback/PlaybackProvider";
import type { ButtonSize } from "../settings/PreferencesProvider";
import type { PlayableSound } from "../sounds/starterSounds";
import { useTheme } from "../theme/ThemeProvider";
import { IconArtwork } from "./IconArtwork";

interface CollectionButtonProps {
  collection: Collection;
  onLongPress: () => void;
  onOpen: () => void;
  playableSounds: readonly PlayableSound[];
  size: ButtonSize;
}

export function CollectionButton({
  collection,
  onLongPress,
  onOpen,
  playableSounds,
  size,
}: CollectionButtonProps) {
  const { isBusy, playRandomizer } = usePlayback();
  const { colors } = useTheme();
  const isRandomizer = collection.role === "randomizer";
  const hasImage = isImageIconReference(collection.iconUri);
  const isDisabled = isRandomizer && (isBusy || playableSounds.length === 0);
  const accessibilityLabel = isRandomizer
    ? `Play randomizer ${collection.name}`
    : `Open directory ${collection.name}`;

  const activate = () => {
    if (isRandomizer) {
      if (!isDisabled) {
        playRandomizer(collection.id, playableSounds);
      }
    } else {
      onOpen();
    }
  };
  const handleLongPress = isRandomizer ? onOpen : onLongPress;

  return (
    <View style={[styles.item, { width: size }]}>
      <Pressable
        accessibilityActions={[
          {
            name: "longpress",
            label: isRandomizer
              ? `Open collection ${collection.name}`
              : `Organize ${collection.name}`,
          },
        ]}
        accessibilityHint={
          isRandomizer && playableSounds.length === 0
            ? "This randomizer has no playable sounds. Hold to open the collection"
            : isRandomizer
              ? "Hold to open the collection"
              : undefined
        }
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === "longpress") {
            handleLongPress();
          }
        }}
        onLongPress={handleLongPress}
        onPress={activate}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            backgroundColor: hasImage ? colors.background : colors.collection,
            borderColor:
              hasImage && collection.hideBorder
                ? colors.background
                : colors.border,
            shadowColor: colors.shadow,
          },
          pressed && styles.buttonPressed,
          isDisabled && styles.buttonDisabled,
        ]}
      >
        <IconArtwork
          color={colors.text}
          fallback={isRandomizer ? "shuffle" : "folder"}
          iconUri={collection.iconUri}
          size={Math.round(size * 0.72)}
          testID={
            isRandomizer
              ? `randomizer-icon-${collection.id}`
              : `directory-icon-${collection.id}`
          }
        />
      </Pressable>
      <Text
        numberOfLines={2}
        style={[styles.label, { color: colors.text, maxWidth: size }]}
      >
        {collection.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: { alignItems: "center", gap: 8 },
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: 6,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  buttonPressed: {
    transform: [{ translateX: 4 }, { translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
    elevation: 2,
  },
  buttonDisabled: { opacity: 0.42 },
  label: {
    minHeight: 40,
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
