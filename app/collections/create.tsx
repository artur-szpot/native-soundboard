import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { CollectionRole } from "../../src/domain/models";
import { collectionHref } from "../../src/navigation/routes";
import { useRepositories } from "../../src/repositories/RepositoryProvider";
import { useTheme } from "../../src/theme/ThemeProvider";

export default function CreateCollectionRoute() {
  const router = useRouter();
  const { parentId = "main" } = useLocalSearchParams<{ parentId?: string }>();
  const { collections, refresh } = useRepositories();
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [role, setRole] = useState<CollectionRole>("directory");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const createCollection = async () => {
    setIsSaving(true);
    setError(null);
    try {
      const collection = await collections.create(name, role, parentId);
      refresh();
      router.dismissAll();
      router.replace(
        role === "directory"
          ? collectionHref(collection.id)
          : collectionHref(parentId),
      );
    } catch (creationError: unknown) {
      setError(
        creationError instanceof Error
          ? creationError.message
          : String(creationError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          CREATE COLLECTION
        </Text>
        <Pressable
          accessibilityLabel="Close"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[
            styles.iconButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <MaterialIcons color={colors.text} name="close" size={28} />
        </Pressable>
      </View>
      <View style={styles.form}>
        <Text style={[styles.label, { color: colors.text }]}>NAME</Text>
        <TextInput
          accessibilityLabel="Collection name"
          autoFocus
          maxLength={80}
          onChangeText={setName}
          placeholder="Collection name"
          placeholderTextColor={colors.mutedText}
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
          value={name}
        />
        <Text style={[styles.label, { color: colors.text }]}>TYPE</Text>
        <View accessibilityRole="radiogroup" style={styles.roleControl}>
          {(["directory", "randomizer"] as const).map((option, index) => (
            <Pressable
              accessibilityLabel={`${option} collection`}
              accessibilityRole="radio"
              accessibilityState={{ checked: role === option }}
              key={option}
              onPress={() => setRole(option)}
              style={[
                styles.roleOption,
                { borderColor: colors.border, backgroundColor: colors.surface },
                index > 0 && styles.roleOptionJoined,
                role === option && { backgroundColor: colors.selected },
              ]}
            >
              <MaterialIcons
                color={colors.text}
                name={option === "directory" ? "folder" : "play-arrow"}
                size={26}
              />
              <Text style={[styles.roleLabel, { color: colors.text }]}>
                {option.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>
        {error ? (
          <Text
            accessibilityRole="alert"
            style={[styles.error, { color: colors.text }]}
          >
            {error}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: isSaving || !name.trim() }}
          disabled={isSaving || !name.trim()}
          onPress={createCollection}
          style={[
            styles.saveButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            (isSaving || !name.trim()) && styles.disabled,
          ]}
        >
          <Text style={[styles.saveLabel, { color: colors.text }]}>CREATE</Text>
        </Pressable>
      </View>
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
    gap: 12,
    paddingHorizontal: 20,
  },
  title: {
    flexShrink: 1,
    fontFamily: "Courier",
    fontSize: 20,
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
  form: { gap: 14, padding: 20 },
  label: { fontFamily: "Courier", fontSize: 15, fontWeight: "700" },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
    fontSize: 17,
  },
  roleControl: { flexDirection: "row" },
  roleOption: {
    minWidth: 132,
    minHeight: 64,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
    borderWidth: 2,
  },
  roleOptionJoined: { borderLeftWidth: 0 },
  roleLabel: { fontFamily: "Courier", fontSize: 13, fontWeight: "700" },
  error: { fontSize: 15 },
  saveButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 3,
  },
  saveLabel: { fontFamily: "Courier", fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.42 },
});
