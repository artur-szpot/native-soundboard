import type { ErrorBoundaryProps } from "expo-router";
import { Stack } from "expo-router";
import { SQLiteProvider } from "expo-sqlite";
import { Suspense } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

import { migrateDatabase } from "../src/database/migrate";
import { ThemeProvider, useTheme } from "../src/theme/ThemeProvider";

function LoadingScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.centered, { backgroundColor: colors.background }]}>
      <Text style={[styles.message, { color: colors.text }]}>
        Loading soundboard
      </Text>
    </View>
  );
}

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.errorContainer}>
        <Text accessibilityRole="header" style={styles.errorTitle}>
          Soundboard could not start
        </Text>
        <Text style={styles.errorMessage}>{error.message}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={retry}
          style={styles.retryButton}
        >
          <Text style={styles.retryLabel}>TRY AGAIN</Text>
        </Pressable>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <Suspense fallback={<LoadingScreen />}>
          <SQLiteProvider
            databaseName="native-soundboard.db"
            onInit={migrateDatabase}
            useSuspense
          >
            <Stack screenOptions={{ headerShown: false }} />
          </SQLiteProvider>
        </Suspense>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
  },
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    backgroundColor: "#F2EFE8",
  },
  errorTitle: {
    color: "#191919",
    fontSize: 22,
    fontWeight: "700",
    textAlign: "center",
  },
  errorMessage: {
    color: "#4B4944",
    fontSize: 16,
    textAlign: "center",
  },
  retryButton: {
    minWidth: 132,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E74E36",
    borderColor: "#191919",
    borderRadius: 6,
    borderWidth: 3,
  },
  retryLabel: {
    color: "#191919",
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
  },
});
