import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Collection, Sound } from "../../../src/domain/models";
import { useRepositories } from "../../../src/repositories/RepositoryProvider";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function OrganizeSoundRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { collections, refresh, sounds } = useRepositories();
  const { colors } = useTheme();
  const [sound, setSound] = useState<Sound | null>(null);
  const [allCollections, setAllCollections] = useState<readonly Collection[]>(
    [],
  );
  const [memberships, setMemberships] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      sounds.getById(id),
      collections.listAll(),
      sounds.listMembershipCollectionIds(id),
    ])
      .then(([selectedSound, availableCollections, collectionIds]) => {
        if (!selectedSound) {
          throw new Error("Sound not found.");
        }
        setSound(selectedSound);
        setAllCollections(availableCollections);
        setMemberships(new Set(collectionIds));
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      );
  }, [collections, id, sounds]);

  const toggleMembership = async (collectionId: string) => {
    const included = !memberships.has(collectionId);
    setError(null);
    try {
      await sounds.setMembership(id, collectionId, included);
      setMemberships((current) => {
        const next = new Set(current);
        if (included) next.add(collectionId);
        else next.delete(collectionId);
        return next;
      });
      refresh();
    } catch (membershipError: unknown) {
      setError(
        membershipError instanceof Error
          ? membershipError.message
          : String(membershipError),
      );
    }
  };

  if (!sound && !error) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          accessibilityLabel="Loading sound"
          color={colors.accent}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          ORGANIZE {sound?.name.toUpperCase()}
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
      {error ? (
        <Text
          accessibilityRole="alert"
          style={[styles.error, { color: colors.text }]}
        >
          {error}
        </Text>
      ) : null}
      <ScrollView contentContainerStyle={styles.list}>
        <Text style={[styles.instructions, { color: colors.mutedText }]}>
          Choose the collections containing this sound.
        </Text>
        {allCollections.map((collection) => {
          const isMain = collection.id === "main";
          const isChecked = memberships.has(collection.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked, disabled: isMain }}
              disabled={isMain}
              key={collection.id}
              onPress={() => toggleMembership(collection.id)}
              style={[
                styles.option,
                { borderColor: colors.border, backgroundColor: colors.surface },
                isMain && styles.locked,
              ]}
            >
              <MaterialIcons
                color={colors.text}
                name={isChecked ? "check-box" : "check-box-outline-blank"}
                size={26}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {collection.name}
              </Text>
              {isMain ? (
                <MaterialIcons color={colors.mutedText} name="lock" size={20} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  error: { padding: 20, fontSize: 15, textAlign: "center" },
  list: { gap: 10, padding: 20 },
  instructions: { fontSize: 15, marginBottom: 8 },
  option: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
  },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: "700" },
  locked: { opacity: 0.7 },
});
