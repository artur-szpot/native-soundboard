import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    BUTTON_SIZES,
    usePreferences,
} from "../src/settings/PreferencesProvider";
import { useTheme } from "../src/theme/ThemeProvider";

const THEME_OPTIONS = ["system", "light", "dark"] as const;

export default function MenuScreen() {
  const router = useRouter();
  const { collectionId = "main" } = useLocalSearchParams<{
    collectionId?: string;
  }>();
  const { colors, statusBarStyle } = useTheme();
  const {
    buttonSize,
    decreaseButtonSize,
    increaseButtonSize,
    setThemePreference,
    themePreference,
  } = usePreferences();
  const sizeIndex = BUTTON_SIZES.indexOf(buttonSize);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          MENU
        </Text>
        <Pressable
          accessibilityLabel="Close menu"
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
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push(
              `/sounds/import?collectionId=${encodeURIComponent(collectionId)}` as Href,
            )
          }
          style={({ pressed }) => [
            styles.commandButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons color={colors.text} name="audio-file" size={24} />
          <Text style={[styles.commandLabel, { color: colors.text }]}>
            IMPORT SOUND
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/collections/create",
              params: { parentId: collectionId },
            } as Href)
          }
          style={({ pressed }) => [
            styles.commandButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            color={colors.text}
            name="create-new-folder"
            size={24}
          />
          <Text style={[styles.commandLabel, { color: colors.text }]}>
            CREATE COLLECTION
          </Text>
        </Pressable>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            BUTTON SIZE
          </Text>
          <View accessibilityLabel="Button size" style={styles.sizeControl}>
            <Pressable
              accessibilityLabel="Decrease button size"
              accessibilityRole="button"
              accessibilityState={{ disabled: sizeIndex === 0 }}
              disabled={sizeIndex === 0}
              onPress={decreaseButtonSize}
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                sizeIndex === 0 && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons color={colors.text} name="remove" size={24} />
            </Pressable>
            <Text
              accessibilityLabel={`Button size ${sizeIndex + 1} of ${BUTTON_SIZES.length}`}
              style={[styles.sizeValue, { color: colors.text }]}
            >
              {sizeIndex + 1}
            </Text>
            <Pressable
              accessibilityLabel="Increase button size"
              accessibilityRole="button"
              accessibilityState={{
                disabled: sizeIndex === BUTTON_SIZES.length - 1,
              }}
              disabled={sizeIndex === BUTTON_SIZES.length - 1}
              onPress={increaseButtonSize}
              style={({ pressed }) => [
                styles.iconButton,
                { borderColor: colors.border, backgroundColor: colors.surface },
                sizeIndex === BUTTON_SIZES.length - 1 && styles.disabled,
                pressed && styles.pressed,
              ]}
            >
              <MaterialIcons color={colors.text} name="add" size={24} />
            </Pressable>
          </View>
          <View
            accessible
            accessibilityLabel={`Example square button, size ${sizeIndex + 1}`}
            accessibilityRole="image"
            style={[
              styles.preview,
              {
                width: buttonSize,
                height: buttonSize,
                backgroundColor: colors.accent,
                borderColor: colors.border,
                shadowColor: colors.shadow,
              },
            ]}
          >
            <MaterialIcons
              color={colors.text}
              name="play-arrow"
              size={Math.round(buttonSize * 0.46)}
            />
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            THEME
          </Text>
          <View
            accessibilityLabel="Theme"
            accessibilityRole="radiogroup"
            style={styles.themeControl}
          >
            {THEME_OPTIONS.map((preference) => (
              <Pressable
                accessibilityLabel={`${preference} theme`}
                accessibilityRole="radio"
                accessibilityState={{ checked: themePreference === preference }}
                key={preference}
                onPress={() => setThemePreference(preference)}
                style={({ pressed }) => [
                  styles.themeOption,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  themePreference === preference && {
                    backgroundColor: colors.playing,
                  },
                  pressed && styles.pressed,
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name={
                    preference === "system"
                      ? "settings-brightness"
                      : preference === "light"
                        ? "light-mode"
                        : "dark-mode"
                  }
                  size={24}
                />
                <Text style={[styles.themeLabel, { color: colors.text }]}>
                  {preference.toUpperCase()}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </ScrollView>
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
  content: {
    alignItems: "center",
    gap: 20,
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  section: {
    width: "100%",
    alignItems: "center",
    gap: 20,
    marginTop: 20,
  },
  commandButton: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 18,
    borderRadius: 6,
    borderWidth: 3,
  },
  commandLabel: {
    fontFamily: "Courier",
    fontSize: 15,
    fontWeight: "700",
  },
  sectionTitle: {
    fontFamily: "Courier",
    fontSize: 18,
    fontWeight: "700",
  },
  sizeControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  sizeValue: {
    width: 36,
    fontFamily: "Courier",
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  preview: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 3,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  themeControl: {
    flexDirection: "row",
    justifyContent: "center",
  },
  themeOption: {
    minWidth: 92,
    minHeight: 64,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
  },
  themeLabel: {
    fontFamily: "Courier",
    fontSize: 12,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.4,
  },
});
