import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { usePlayback } from "../playback/PlaybackProvider";
import type { ButtonSize } from "../settings/PreferencesProvider";
import type { StarterSound } from "../sounds/starterSounds";
import { useTheme } from "../theme/ThemeProvider";

interface SoundButtonProps {
  size: ButtonSize;
  sound: StarterSound;
}

export function SoundButton({ size, sound }: SoundButtonProps) {
  const { activeSoundId, isBusy, play } = usePlayback();
  const { colors } = useTheme();
  const isPlaying = activeSoundId === sound.id;

  return (
    <View style={[styles.item, { width: size }]}>
      <Pressable
        accessibilityLabel={`Play ${sound.name}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isBusy }}
        disabled={isBusy}
        onPress={() => play(sound.id, sound.source)}
        style={({ pressed }) => [
          styles.button,
          {
            width: size,
            height: size,
            backgroundColor: isPlaying ? colors.playing : colors.accent,
            borderColor: colors.border,
            shadowColor: colors.shadow,
          },
          pressed && styles.buttonPressed,
          isBusy && !isPlaying && styles.buttonDisabled,
        ]}
      >
        <MaterialIcons
          color={colors.text}
          name={isPlaying ? "volume-up" : "play-arrow"}
          size={Math.round(size * 0.46)}
        />
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
