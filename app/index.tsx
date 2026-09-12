import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import {
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { SoundButton } from "../src/components/SoundButton";
import { usePlayback } from "../src/playback/PlaybackProvider";
import { usePreferences } from "../src/settings/PreferencesProvider";
import { starterSounds } from "../src/sounds/starterSounds";
import { useTheme } from "../src/theme/ThemeProvider";

const GRID_GAP = 18;
const PAGE_PADDING = 20;

export default function SoundboardScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, statusBarStyle } = useTheme();
  const { error } = usePlayback();
  const { buttonSize } = usePreferences();
  const availableWidth = Math.max(0, width - PAGE_PADDING * 2);
  const columnCount = Math.max(
    1,
    Math.floor((availableWidth + GRID_GAP) / (buttonSize + GRID_GAP)),
  );
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          SOUNDBOARD
        </Text>
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          onPress={() => router.push("/menu")}
          style={({ pressed }) => [
            styles.menuButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && styles.menuButtonPressed,
          ]}
        >
          <MaterialIcons color={colors.text} name="menu" size={28} />
        </Pressable>
      </View>
      {error ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.text }]}
        >
          {error}
        </Text>
      ) : null}
      <FlatList
        columnWrapperStyle={columnCount > 1 ? styles.row : undefined}
        contentContainerStyle={styles.grid}
        data={starterSounds}
        key={columnCount}
        keyExtractor={(sound) => sound.id}
        numColumns={columnCount}
        renderItem={({ item }) => (
          <SoundButton size={buttonSize} sound={item} />
        )}
      />
      <StatusBar style={statusBarStyle} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: PAGE_PADDING,
  },
  title: {
    flexShrink: 1,
    fontFamily: "Courier",
    fontSize: 22,
    fontWeight: "700",
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 2,
  },
  menuButtonPressed: {
    opacity: 0.65,
  },
  error: {
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "center",
  },
  grid: {
    flexGrow: 1,
    gap: GRID_GAP,
    justifyContent: "center",
    padding: PAGE_PADDING,
  },
  row: {
    justifyContent: "center",
    gap: GRID_GAP,
  },
});
