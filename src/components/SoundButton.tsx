import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRef } from "react";
import {
    type AccessibilityActionEvent,
    type GestureResponderEvent,
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
import { ReorderIndicators } from "./ReorderIndicators";

interface SoundButtonProps {
  accessibilityHint?: string;
  isSelectionDisabled?: boolean;
  isSelected?: boolean;
  listView?: boolean;
  onLongPress?: () => void;
  onReorder?: (side: "left" | "right", toEdge: boolean) => void;
  onSelect?: () => void;
  size: ButtonSize;
  sound: PlayableSound;
}

export function SoundButton({
  accessibilityHint,
  isSelectionDisabled = false,
  isSelected = false,
  listView = false,
  onLongPress,
  onReorder,
  onSelect,
  size,
  sound,
}: SoundButtonProps) {
  const { activeSoundId, playbackDuration, playbackProgress, play } =
    usePlayback();
  const { colors } = useTheme();
  const isPlaying = activeSoundId === sound.id;
  const hasImage = isImageIconReference(sound.iconUri ?? null);
  const rowWidth = useRef<number>(size);
  const iconSize = listView ? 56 : size;
  const reorderSide = (event: GestureResponderEvent) =>
    event.nativeEvent.locationX < rowWidth.current / 2 ? "left" : "right";

  const artwork = (
    <>
      <IconArtwork
        color={colors.text}
        fallback="play-arrow"
        iconUri={sound.iconUri ?? null}
        size={Math.round(iconSize * 0.72)}
        testID={`sound-icon-${sound.id}`}
      />
      {isPlaying ? (
        <PlaybackProgressOverlay
          duration={playbackDuration}
          progress={playbackProgress}
          size={iconSize - 6}
        />
      ) : null}
      {isSelected ? (
        <View style={styles.selectionMark}>
          <MaterialIcons color="#E74E36" name="check" size={20} />
        </View>
      ) : null}
    </>
  );

  return (
    <View style={[styles.item, listView ? styles.listItem : { width: size }]}>
      <Pressable
        accessibilityActions={
          !onReorder && onLongPress
            ? [{ name: "longpress", label: `Organize ${sound.name}` }]
            : undefined
        }
        accessibilityLabel={`Play ${sound.name}`}
        accessibilityHint={
          accessibilityHint ??
          (onReorder
            ? listView
              ? "Tap the left or right half of the row to change position. Hold to move to that edge."
              : "Tap the left or right side to change position. Hold to move to that edge."
            : undefined)
        }
        accessibilityRole="button"
        accessibilityState={{
          disabled: isSelectionDisabled,
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
        disabled={isSelectionDisabled}
        onLayout={(event) => {
          rowWidth.current = event.nativeEvent.layout.width;
        }}
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          if (!onReorder && event.nativeEvent.actionName === "longpress") {
            onLongPress?.();
          }
        }}
        onLongPress={(event) => {
          if (onReorder) {
            onReorder(reorderSide(event), true);
            return;
          }
          onLongPress?.();
        }}
        onPress={(event) => {
          if (onReorder) {
            onReorder(reorderSide(event), false);
            return;
          }
          if (isSelectionDisabled) return;
          if (onSelect) onSelect();
          else play(sound.id, sound.source);
        }}
        style={({ pressed }) => [
          styles.button,
          listView && styles.listButton,
          {
            width: listView ? "100%" : size,
            minHeight: listView ? iconSize : undefined,
            height: listView ? undefined : size,
            backgroundColor: isPlaying
              ? colors.playing
              : hasImage && !listView
                ? colors.background
                : listView
                  ? colors.surface
                  : colors.accent,
            borderColor:
              isSelected && !listView
                ? "#E74E36"
                : hasImage && sound.hideBorder && !listView
                  ? colors.background
                  : colors.border,
            borderWidth: isSelected && !listView ? 5 : listView ? 2 : 3,
            shadowColor: colors.shadow,
          },
          pressed && styles.buttonPressed,
          isSelectionDisabled && !isPlaying && styles.buttonDisabled,
        ]}
      >
        {listView ? (
          <>
            <View
              style={[
                styles.listIcon,
                {
                  width: iconSize,
                  height: iconSize,
                  backgroundColor: hasImage ? colors.background : colors.accent,
                  borderColor: isSelected
                    ? "#E74E36"
                    : hasImage && sound.hideBorder
                      ? colors.background
                      : colors.border,
                },
              ]}
            >
              {artwork}
            </View>
            <Text
              style={[
                styles.listLabel,
                onReorder && styles.listLabelReorder,
                { color: colors.text },
              ]}
            >
              {sound.name}
            </Text>
          </>
        ) : (
          artwork
        )}
        {onReorder ? <ReorderIndicators color={colors.text} /> : null}
      </Pressable>
      {!listView ? (
        <Text
          numberOfLines={2}
          style={[styles.label, { color: colors.text, maxWidth: size }]}
        >
          {sound.name}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  item: {
    alignItems: "center",
    gap: 8,
  },
  listItem: { width: "100%" },
  listButton: {
    flexDirection: "row",
    justifyContent: "flex-start",
    gap: 12,
  },
  listIcon: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderRadius: 4,
  },
  listLabel: {
    flex: 1,
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
    paddingVertical: 10,
  },
  listLabelReorder: { paddingRight: 42 },
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
