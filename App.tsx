import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import { StatusBar } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";

const chime = require("./assets/chime.wav");

export default function App() {
  const player = useAudioPlayer(chime);
  const status = useAudioPlayerStatus(player);
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
    <View style={styles.container}>
      <Pressable
        accessibilityLabel="Play chime"
        accessibilityRole="button"
        accessibilityState={{ disabled: isDisabled }}
        disabled={isDisabled}
        onPress={playSound}
        style={({ pressed }) => [
          styles.button,
          pressed && styles.buttonPressed,
          status.playing && styles.buttonPlaying,
          !status.isLoaded && styles.buttonLoading,
        ]}
      >
        <Text style={styles.buttonLabel}>
          {status.playing ? "PLAYING" : status.isLoaded ? "PLAY" : "LOADING"}
        </Text>
      </Pressable>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2EFE8",
    alignItems: "center",
    justifyContent: "center",
  },
  button: {
    width: 184,
    height: 184,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74E36",
    borderColor: "#191919",
    borderWidth: 3,
    borderRadius: 6,
    shadowColor: "#191919",
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
  buttonPlaying: {
    backgroundColor: "#F3B63F",
  },
  buttonLoading: {
    opacity: 0.55,
  },
  buttonLabel: {
    color: "#191919",
    fontFamily: "Courier",
    fontSize: 22,
    fontWeight: "700",
  },
});
