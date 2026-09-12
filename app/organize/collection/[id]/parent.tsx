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

import type { Collection } from "../../../../src/domain/models";
import { useRepositories } from "../../../../src/repositories/RepositoryProvider";
import { useTheme } from "../../../../src/theme/ThemeProvider";

interface ParentOption {
  collection: Collection;
  depth: number;
}

function arrangeAsTree(collections: readonly Collection[]): ParentOption[] {
  const validIds = new Set(collections.map((collection) => collection.id));
  const childrenByParent = new Map<string | null, Collection[]>();

  for (const collection of collections) {
    const parentId =
      collection.parentId && validIds.has(collection.parentId)
        ? collection.parentId
        : null;
    const siblings = childrenByParent.get(parentId) ?? [];
    siblings.push(collection);
    childrenByParent.set(parentId, siblings);
  }

  for (const siblings of childrenByParent.values()) {
    siblings.sort((left, right) => left.name.localeCompare(right.name));
  }

  const options: ParentOption[] = [];
  const appendChildren = (parentId: string | null, depth: number) => {
    for (const collection of childrenByParent.get(parentId) ?? []) {
      options.push({ collection, depth });
      appendChildren(collection.id, depth + 1);
    }
  };
  appendChildren(null, 0);
  return options;
}

export default function ChangeCollectionParentRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { collections, refresh } = useRepositories();
  const { colors } = useTheme();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [parents, setParents] = useState<readonly Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([collections.getById(id), collections.listValidParents(id)])
      .then(([selectedCollection, validParents]) => {
        if (!selectedCollection) throw new Error("Collection not found.");
        setCollection(selectedCollection);
        setParents(validParents);
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      );
  }, [collections, id]);

  const chooseParent = async (parentId: string) => {
    if (!collection || parentId === collection.parentId) return;
    setIsSaving(true);
    setError(null);
    try {
      await collections.reparent(collection.id, parentId);
      refresh();
      router.back();
    } catch (moveError: unknown) {
      setError(
        moveError instanceof Error ? moveError.message : String(moveError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (!collection && !error) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          accessibilityLabel="Loading parent collections"
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
          CHANGE PARENT
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
          Choose a new parent collection.
        </Text>
        {arrangeAsTree(parents).map(({ collection: parent, depth }) => {
          const isCurrent = collection?.parentId === parent.id;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{
                checked: isCurrent,
                disabled: isSaving || isCurrent,
              }}
              disabled={isSaving || isCurrent}
              key={parent.id}
              onPress={() => void chooseParent(parent.id)}
              style={[
                styles.option,
                { marginLeft: depth * 20 },
                { borderColor: colors.border, backgroundColor: colors.surface },
                (isSaving || isCurrent) && styles.disabled,
              ]}
            >
              <MaterialIcons
                color={colors.text}
                name={parent.role === "directory" ? "folder" : "shuffle"}
                size={24}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {parent.name}
              </Text>
              {isCurrent ? (
                <MaterialIcons color={colors.text} name="check" size={24} />
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
  list: { gap: 10, padding: 20, paddingBottom: 40 },
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
  disabled: { opacity: 0.42 },
});
