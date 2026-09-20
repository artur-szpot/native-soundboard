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

import type { Collection, Sound } from "../../../../src/domain/models";
import { parseIds } from "../../../../src/navigation/routes";
import { useRepositories } from "../../../../src/repositories/RepositoryProvider";
import { useTheme } from "../../../../src/theme/ThemeProvider";

interface CollectionOption {
  collection: Collection;
  depth: number;
}

function arrangeAsTree(collections: readonly Collection[]): CollectionOption[] {
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

  const options: CollectionOption[] = [];
  const appendChildren = (parentId: string | null, depth: number) => {
    for (const collection of childrenByParent.get(parentId) ?? []) {
      options.push({ collection, depth });
      appendChildren(collection.id, depth + 1);
    }
  };
  appendChildren(null, 0);
  return options;
}

export default function SoundCollectionsRoute() {
  const { id, ids: idsParam } = useLocalSearchParams<{
    id: string;
    ids?: string;
  }>();
  const router = useRouter();
  const { collections, refresh, sounds } = useRepositories();
  const { colors } = useTheme();
  const [sound, setSound] = useState<Sound | null>(null);
  const [selectedSounds, setSelectedSounds] = useState<readonly Sound[]>([]);
  const [availableCollections, setAvailableCollections] = useState<
    readonly Collection[]
  >([]);
  const [memberships, setMemberships] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [savingCollectionId, setSavingCollectionId] = useState<string | null>(
    null,
  );
  const selectedIds = parseIds(idsParam);
  const isBulk = selectedIds.length > 1;

  useEffect(() => {
    Promise.all([
      isBulk
        ? Promise.all(
            selectedIds.map((selectedId) => sounds.getById(selectedId)),
          )
        : sounds
            .getById(id)
            .then((selectedSound) => (selectedSound ? [selectedSound] : [])),
      collections.listAll(),
      isBulk
        ? Promise.all(
            selectedIds.map((selectedId) =>
              sounds.listMembershipCollectionIds(selectedId),
            ),
          )
        : sounds
            .listMembershipCollectionIds(id)
            .then((collectionIds) => [collectionIds]),
    ])
      .then(([loadedSounds, allCollections, allMemberships]) => {
        const validSounds = loadedSounds.filter(
          (item): item is Sound => item !== null,
        );
        if (validSounds.length !== selectedIds.length && isBulk) {
          throw new Error("One or more sounds could not be found.");
        }
        const selectedSound = validSounds[0];
        if (!selectedSound) throw new Error("Sound not found.");
        setSound(selectedSound);
        setSelectedSounds(validSounds);
        setAvailableCollections(
          allCollections.filter((collection) => collection.id !== "main"),
        );
        const membershipSets = allMemberships.map(
          (collectionIds) => new Set(collectionIds),
        );
        setMemberships(
          new Set(
            membershipSets[0] && membershipSets.every((set) => set.has("main"))
              ? [...membershipSets[0]].filter((collectionId) =>
                  membershipSets.every((set) => set.has(collectionId)),
                )
              : [],
          ),
        );
        setMembershipSets(membershipSets);
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      );
  }, [collections, id, isBulk, selectedIds.join(","), sounds]);

  const [membershipSets, setMembershipSets] = useState<
    readonly ReadonlySet<string>[]
  >([]);

  const toggleMembership = async (collectionId: string) => {
    const included = isBulk
      ? !membershipSets.every((set) => set.has(collectionId))
      : !memberships.has(collectionId);
    setSavingCollectionId(collectionId);
    setError(null);
    try {
      if (isBulk) {
        await sounds.setMembershipForSounds(
          selectedIds,
          collectionId,
          included,
        );
      } else {
        await sounds.setMembership(id, collectionId, included);
      }
      setMemberships((current) => {
        const next = new Set(current);
        if (included) next.add(collectionId);
        else next.delete(collectionId);
        return next;
      });
      if (isBulk) {
        setMembershipSets((current) =>
          current.map((set) => {
            const next = new Set(set);
            if (included) next.add(collectionId);
            else next.delete(collectionId);
            return next;
          }),
        );
      }
      refresh();
    } catch (membershipError: unknown) {
      setError(
        membershipError instanceof Error
          ? membershipError.message
          : String(membershipError),
      );
    } finally {
      setSavingCollectionId(null);
    }
  };

  if (!sound && !error) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <ActivityIndicator
          accessibilityLabel="Loading sound collections"
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
          COLLECTIONS
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
        {sound ? (
          <Text style={[styles.instructions, { color: colors.mutedText }]}>
            Include {sound.name} in the following collections:
          </Text>
        ) : null}
        {arrangeAsTree(availableCollections).map(({ collection, depth }) => {
          const isChecked = isBulk
            ? membershipSets.length > 0 &&
              membershipSets.every((set) => set.has(collection.id))
            : memberships.has(collection.id);
          const isMixed =
            isBulk &&
            membershipSets.some((set) => set.has(collection.id)) &&
            !membershipSets.every((set) => set.has(collection.id));
          const isSaving = savingCollectionId === collection.id;
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked, disabled: isSaving }}
              accessibilityHint={
                isMixed ? "Some selected sounds are members" : undefined
              }
              disabled={isSaving}
              key={collection.id}
              onPress={() => void toggleMembership(collection.id)}
              style={[
                styles.option,
                { marginLeft: depth * 20 },
                { backgroundColor: colors.background },
                isSaving && styles.disabled,
              ]}
            >
              <MaterialIcons
                color={colors.text}
                name={collection.role === "directory" ? "folder" : "shuffle"}
                size={24}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {collection.name}
              </Text>
              <MaterialIcons
                color={colors.text}
                name={
                  isMixed
                    ? "indeterminate-check-box"
                    : isChecked
                      ? "check-box"
                      : "check-box-outline-blank"
                }
                size={26}
              />
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
  },
  optionLabel: { flex: 1, fontSize: 16, fontWeight: "700" },
  disabled: { opacity: 0.42 },
});
