import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
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

import type { Collection } from "../../../src/domain/models";
import { useRepositories } from "../../../src/repositories/RepositoryProvider";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function OrganizeCollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { collections, refresh } = useRepositories();
  const { colors } = useTheme();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [children, setChildren] = useState<readonly Collection[]>([]);
  const [parents, setParents] = useState<readonly Collection[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      collections.getById(id),
      collections.listValidParents(id),
      collections.listChildren(id),
    ])
      .then(([selectedCollection, validParents, childCollections]) => {
        if (!selectedCollection) {
          throw new Error("Collection not found.");
        }
        setCollection(selectedCollection);
        setParents(validParents);
        setChildren(childCollections);
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      );
  }, [collections, id]);

  const chooseParent = async (parentId: string) => {
    setError(null);
    try {
      await collections.reparent(id, parentId);
      refresh();
      router.back();
    } catch (moveError: unknown) {
      setError(
        moveError instanceof Error ? moveError.message : String(moveError),
      );
    }
  };

  if (!collection && !error) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          accessibilityLabel="Loading collection"
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
          ORGANIZE {collection?.name.toUpperCase()}
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
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          PARENT
        </Text>
        <Text style={[styles.instructions, { color: colors.mutedText }]}>
          Choose a new parent collection.
        </Text>
        {parents.map((parent) => (
          <Pressable
            accessibilityRole="radio"
            accessibilityState={{ checked: collection?.parentId === parent.id }}
            key={parent.id}
            onPress={() => chooseParent(parent.id)}
            style={[
              styles.option,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <MaterialIcons
              color={colors.text}
              name={parent.role === "directory" ? "folder" : "play-arrow"}
              size={24}
            />
            <Text style={[styles.optionLabel, { color: colors.text }]}>
              {parent.name}
            </Text>
            {collection?.parentId === parent.id ? (
              <MaterialIcons color={colors.text} name="check" size={24} />
            ) : null}
          </Pressable>
        ))}
        {children.length > 0 ? (
          <>
            <Text
              style={[
                styles.sectionTitle,
                styles.childHeading,
                { color: colors.text },
              ]}
            >
              CHILD COLLECTIONS
            </Text>
            {children.map((child) => (
              <Pressable
                accessibilityLabel={`Organize ${child.name}`}
                accessibilityRole="button"
                key={child.id}
                onPress={() =>
                  router.push(`/organize/collection/${child.id}` as Href)
                }
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name={child.role === "directory" ? "folder" : "play-arrow"}
                  size={24}
                />
                <Text style={[styles.optionLabel, { color: colors.text }]}>
                  {child.name}
                </Text>
                <MaterialIcons
                  color={colors.text}
                  name="chevron-right"
                  size={24}
                />
              </Pressable>
            ))}
          </>
        ) : null}
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
  sectionTitle: { fontFamily: "Courier", fontSize: 15, fontWeight: "700" },
  childHeading: { marginTop: 18 },
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
});
