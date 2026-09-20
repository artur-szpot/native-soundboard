import MaterialIcons from "@expo/vector-icons/MaterialIcons";
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
import { PlaybackProgressOverlay } from "./PlaybackProgressOverlay";

interface CollectionButtonProps {
  accessibilityHint?: string;
  collection: Collection;
  isSelectionDisabled?: boolean;
  isSelected?: boolean;
  onLongPress: () => void;
  onOpen: () => void;
  onSelect?: () => void;
  playableSounds: readonly PlayableSound[];
  size: ButtonSize;
}

export function CollectionButton({
  accessibilityHint,
  collection,
  isSelectionDisabled = false,
  isSelected = false,
  onLongPress,
  onOpen,
  onSelect,
  playableSounds,
  size,
}: CollectionButtonProps) {
  const {
    activeRandomizerId,
    isBusy,
    playbackDuration,
    playbackProgress,
    playRandomizer,
  } = usePlayback();
  const { colors } = useTheme();
  const isRandomizer = collection.role === "randomizer";
  const isPlayingRandomizer = activeRandomizerId === collection.id;
  const hasImage = isImageIconReference(collection.iconUri);
  const isUnavailableRandomizer =
    isRandomizer && (isBusy || playableSounds.length === 0);
  const isDisabled =
    isSelectionDisabled || (isUnavailableRandomizer && !onSelect);
  const isPressDisabled = isSelectionDisabled || (isRandomizer && isBusy);
  const accessibilityLabel = isRandomizer
    ? `Play randomizer ${collection.name}`
    : `Open directory ${collection.name}`;

  const activate = () => {
    if (onSelect) {
      onSelect();
    } else if (isRandomizer) {
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
          accessibilityHint ??
          (isRandomizer && playableSounds.length === 0
            ? "This randomizer has no playable sounds. Hold to open the collection"
            : isRandomizer
              ? "Hold to open the collection"
              : undefined)
        }
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled, selected: isSelected }}
        accessibilityValue={
          isPlayingRandomizer
            ? {
                max: 100,
                min: 0,
                now: Math.round(playbackProgress * 100),
                text: `${Math.round(playbackProgress * 100)}% played`,
              }
            : undefined
        }
        disabled={isPressDisabled}
        onAccessibilityAction={(event: AccessibilityActionEvent) => {
          if (event.nativeEvent.actionName === "longpress") {
            handleLongPress();
          }
        }}
        onLongPress={onSelect ? undefined : handleLongPress}
        onPress={activate}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            backgroundColor: isPlayingRandomizer
              ? colors.playing
              : hasImage
                ? colors.background
                : colors.collection,
            borderColor: isSelected
              ? "#E74E36"
              : hasImage && collection.hideBorder
                ? colors.background
                : colors.border,
            borderWidth: isSelected ? 5 : 3,
            shadowColor: colors.shadow,
          },
          pressed && styles.buttonPressed,
          isDisabled && !isPlayingRandomizer && styles.buttonDisabled,
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
        {isPlayingRandomizer ? (
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
  buttonDisabled: { opacity: 0.42 },
  label: {
    minHeight: 40,
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
