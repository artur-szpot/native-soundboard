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
import { PlaybackProgressOverlay } from "./PlaybackProgressOverlay";

interface SoundButtonProps {
  accessibilityHint?: string;
  isSelectionDisabled?: boolean;
  isSelected?: boolean;
  onLongPress?: () => void;
  onSelect?: () => void;
  size: ButtonSize;
  sound: PlayableSound;
}

export function SoundButton({
  accessibilityHint,
  isSelectionDisabled = false,
  isSelected = false,
  onLongPress,
  onSelect,
  size,
  sound,
}: SoundButtonProps) {
  const { activeSoundId, isBusy, playbackDuration, playbackProgress, play } =
    usePlayback();
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
        accessibilityHint={accessibilityHint}
        accessibilityRole="button"
        accessibilityState={{
          disabled: isBusy || isSelectionDisabled,
          selected: isSelected,
        }}
        accessibilityValue={
          isPlaying
            ? {
                max: 100,
                min: 0,
                now: Math.round(playbackProgress * 100),
                text: `${Math.round(playbackProgress * 100)}% played`,
              }
            : undefined
        }
        disabled={isBusy || isSelectionDisabled}
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === "longpress") {
            onLongPress?.();
          }
        }}
        onLongPress={onLongPress}
        onPress={() => {
          if (isSelectionDisabled) return;
          if (onSelect) onSelect();
          else play(sound.id, sound.source);
        }}
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
            borderColor: isSelected
              ? "#E74E36"
              : hasImage && sound.hideBorder
                ? colors.background
                : colors.border,
            borderWidth: isSelected ? 5 : 3,
            shadowColor: colors.shadow,
          },
          pressed && styles.buttonPressed,
          (isBusy || isSelectionDisabled) &&
            !isPlaying &&
            styles.buttonDisabled,
        ]}
      >
        <IconArtwork
          color={colors.text}
          fallback="play-arrow"
          iconUri={sound.iconUri ?? null}
          size={Math.round(size * 0.72)}
          testID={`sound-icon-${sound.id}`}
        />
        {isPlaying ? (
          <PlaybackProgressOverlay
            duration={playbackDuration}
            progress={playbackProgress}
            size={size - 6}
          />
        ) : null}
        {isSelected ? (
          <View style={styles.selectionMark}>
            <MaterialIcons color="#E74E36" name="check" size={20} />
          </View>
        ) : null}
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
  selectionMark: {
    position: "absolute",
    right: 6,
    bottom: 6,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderColor: "#E74E36",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    borderWidth: 2,
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
