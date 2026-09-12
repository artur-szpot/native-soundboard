import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import {
    type AccessibilityActionEvent,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";

import { isImageIconReference } from "../icons/iconReferences";
import { usePlayback } from "../playback/PlaybackProvider";
import type { ButtonSize } from "../settings/PreferencesProvider";
import type { PlayableSound } from "../sounds/starterSounds";
import { useTheme } from "../theme/ThemeProvider";
import { IconArtwork } from "./IconArtwork";

interface SoundButtonProps {
  onLongPress?: () => void;
  size: ButtonSize;
  sound: PlayableSound;
}

export function SoundButton({ onLongPress, size, sound }: SoundButtonProps) {
  const { activeSoundId, isBusy, play } = usePlayback();
  const { colors } = useTheme();
  const isPlaying = activeSoundId === sound.id;
  const hasImage = isImageIconReference(sound.iconUri ?? null);

  return (
    <View style={[styles.item, { width: size }]}>
      <Pressable
        accessibilityActions={
          onLongPress
            ? [{ name: "longpress", label: `Organize ${sound.name}` }]
            : undefined
        }
        accessibilityLabel={`Play ${sound.name}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isBusy }}
        disabled={isBusy}
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === "longpress") {
            onLongPress?.();
          }
        }}
        onLongPress={onLongPress}
        onPress={() => play(sound.id, sound.source)}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            backgroundColor: isPlaying
              ? colors.playing
              : hasImage
                ? colors.background
                : colors.accent,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
          pressed && styles.buttonPressed,
          isBusy && !isPlaying && styles.buttonDisabled,
        ]}
      >
        {isPlaying ? (
          <MaterialIcons
            color={colors.text}
            name="volume-up"
            size={Math.round(size * 0.46)}
          />
        ) : (
          <IconArtwork
            color={colors.text}
            fallback="play-arrow"
            iconUri={sound.iconUri ?? null}
            size={Math.round(size * 0.72)}
          />
        )}
      </Pressable>
      <Text
        numberOfLines={2}
        style={[styles.label, { color: colors.text, maxWidth: size }]}
      >
        {sound.name}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    gap: 8,
  },
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
  buttonDisabled: {
    opacity: 0.42,
  },
  label: {
    minHeight: 40,
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
