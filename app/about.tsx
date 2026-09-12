import FontAwesome from "@expo/vector-icons/FontAwesome";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import Constants from "expo-constants";
import { useRouter } from "expo-router";
import {
    Linking,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../src/theme/ThemeProvider";

const SOURCE_URL = "https://github.com/artur-szpot/native-soundboard";
const LICENSE_URL = `${SOURCE_URL}/blob/master/LICENSE`;

export default function AboutScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const version = Constants.expoConfig?.version ?? "Development";

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          ABOUT
        </Text>
        <Pressable
          accessibilityLabel="Close about"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.iconButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons color={colors.text} name="close" size={28} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.name, { color: colors.text }]}>
          NATIVE SOUNDBOARD
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>
          Version {version}
        </Text>
        <Text style={[styles.body, { color: colors.text }]}>
          A free and open source soundboard for organizing and playing sounds on
          your device.
        </Text>
        <Text style={[styles.disclaimer, { color: colors.text }]}>
          The end user is responsible for ensuring that they have the right to
          import, store, and play any media added to this app.
        </Text>

        <Pressable
          accessibilityLabel="GitHub page"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(SOURCE_URL)}
          style={({ pressed }) => [
            styles.command,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <FontAwesome color={colors.text} name="github" size={22} />
          <Text style={[styles.commandLabel, { color: colors.text }]}>
            GITHUB PAGE
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="MIT license"
          accessibilityRole="link"
          onPress={() => void Linking.openURL(LICENSE_URL)}
          style={({ pressed }) => [
            styles.command,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons color={colors.text} name="description" size={22} />
          <Text style={[styles.commandLabel, { color: colors.text }]}>
            MIT LICENSE
          </Text>
        </Pressable>
        <Text style={[styles.body, styles.supportText, { color: colors.text }]}>
          This app is free and has no ads, and I intend to keep it that way. If
          you really want to support me, here&apos;s a button :)
        </Text>
        <Pressable
          accessibilityHint="Buy me a coffee link will be available before release"
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={[
            styles.command,
            { borderColor: colors.border, backgroundColor: colors.surface },
            styles.disabled,
          ]}
        >
          <MaterialIcons
            color={colors.text}
            name="favorite-outline"
            size={22}
          />
          <Text style={[styles.commandLabel, { color: colors.text }]}>
            BUY ME A COFFEE
          </Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Courier",
    fontSize: 22,
    fontWeight: "700",
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 2,
  },
  content: { gap: 16, padding: 20, paddingBottom: 40 },
  name: {
    marginTop: 12,
    fontFamily: "Courier",
    fontSize: 26,
    fontWeight: "700",
  },
  body: { fontSize: 17, lineHeight: 25 },
  disclaimer: {
    marginVertical: 12,
    fontSize: 16,
    lineHeight: 24,
  },
  supportText: { marginTop: 12 },
  command: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  commandLabel: {
    fontFamily: "Courier",
    fontSize: 15,
    fontWeight: "700",
  },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.4 },
});
