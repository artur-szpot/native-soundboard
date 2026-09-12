import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
    type AccessibilityActionEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import type { Collection } from "../domain/models";
import { usePlayback } from "../playback/PlaybackProvider";
import type { ButtonSize } from "../settings/PreferencesProvider";
import type { PlayableSound } from "../sounds/starterSounds";
import { useTheme } from "../theme/ThemeProvider";

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
  const isDisabled = isRandomizer && (isBusy || playableSounds.length === 0);
  const accessibilityLabel = isRandomizer
    ? `Play randomizer ${collection.name}`
    : `Open directory ${collection.name}`;

  const activate = () => {
    if (isRandomizer) {
      playRandomizer(collection.id, playableSounds);
    } else {
      onOpen();
    }
  };

  return (
    <View style={[styles.item, { width: size }]}>
      <Pressable
        accessibilityActions={[
          { name: "longpress", label: `Organize ${collection.name}` },
        ]}
        accessibilityHint={
          isRandomizer && playableSounds.length === 0
            ? "This randomizer has no playable sounds"
            : undefined
        }
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === "longpress") {
            onLongPress();
          }
        }}
        onLongPress={onLongPress}
        onPress={activate}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
          pressed && styles.buttonPressed,
          isDisabled && styles.buttonDisabled,
        ]}
      >
        {isRandomizer ? (
          <View>
            <MaterialIcons
              color={colors.text}
              name="play-arrow"
              size={Math.round(size * 0.42)}
            />
            <MaterialIcons
              color={colors.accent}
              name="play-arrow"
              size={Math.round(size * 0.24)}
              style={styles.layeredIcon}
            />
          </View>
        ) : (
          <MaterialIcons
            color={colors.text}
            name="folder"
            size={Math.round(size * 0.46)}
          />
        )}
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
  layeredIcon: { position: "absolute", right: -5, bottom: -2 },
  label: {
    minHeight: 40,
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
