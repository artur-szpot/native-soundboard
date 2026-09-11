import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../src/theme/ThemeProvider";

const chime = require("../assets/chime.wav");

export default function SoundboardScreen() {
  const player = useAudioPlayer(chime);
  const status = useAudioPlayerStatus(player);
  const { colors, statusBarStyle } = useTheme();
  const isDisabled = !status.isLoaded || status.playing;

  const playSound = async () => {
    if (isDisabled) {
      return;
    }

    if (status.currentTime > 0 || status.didJustFinish) {
      await player.seekTo(0);
    }

    player.play();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <Pressable
        accessibilityLabel="Play chime"
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={playSound}
        style={({ pressed }) => [
          styles.button,
          { backgroundColor: colors.accent, borderColor: colors.border, shadowColor: colors.shadow },
          pressed && styles.buttonPressed,
          status.playing && { backgroundColor: colors.playing },
          !status.isLoaded && styles.buttonLoading,
        ]}
      >
        <Text style={[styles.buttonLabel, { color: colors.text }]}>
          {status.playing ? "PLAYING" : status.isLoaded ? "PLAY" : "LOADING"}
        </Text>
      </Pressable>
      <StatusBar style={statusBarStyle} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: 184,
    height: 184,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: 6,
    shadowOffset: { width: 8, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 8,
  },
  buttonPressed: {
    transform: [{ translateX: 5 }, { translateY: 5 }],
    shadowOffset: { width: 3, height: 3 },
    elevation: 3,
  },
  buttonLoading: {
    opacity: 0.55,
  },
  buttonLabel: {
    fontFamily: "Courier",
    fontSize: 22,
    fontWeight: "700",
  },
});