import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useRouter } from "expo-router";
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
  const { colors, statusBarStyle } = useTheme();
  const {
    buttonSize,
    decreaseButtonSize,
    hideAssignedSoundsInMain,
    increaseButtonSize,
    setHideAssignedSoundsInMain,
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
          accessibilityLabel="Hide sounds assigned to collections in main menu"
          accessibilityRole="checkbox"
          accessibilityState={{ checked: hideAssignedSoundsInMain }}
          onPress={() => setHideAssignedSoundsInMain(!hideAssignedSoundsInMain)}
          style={({ pressed }) => [
            styles.checkboxOption,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons
            color={colors.text}
            name={
              hideAssignedSoundsInMain ? "check-box" : "check-box-outline-blank"
            }
            size={26}
          />
          <Text style={[styles.checkboxLabel, { color: colors.text }]}>
            Hide sounds assigned to collections in main menu
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
  checkboxOption: {
    width: "100%",
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 2,
  },
  checkboxLabel: { flex: 1, fontSize: 16, fontWeight: "700" },
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
