import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import type { Collection, CollectionRole } from "../../../src/domain/models";
import { collectionHref } from "../../../src/navigation/routes";
import { useRepositories } from "../../../src/repositories/RepositoryProvider";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function OrganizeCollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { collections, refresh } = useRepositories();
  const { colors } = useTheme();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<CollectionRole>("directory");
  const [children, setChildren] = useState<readonly Collection[]>([]);
  const [parents, setParents] = useState<readonly Collection[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      collections.getById(id),
      collections.listValidParents(id),
      collections.listChildren(id),
    ])
      .then(([selectedCollection, validParents, childCollections]) => {
        if (!selectedCollection) throw new Error("Collection not found.");
        setCollection(selectedCollection);
        setName(selectedCollection.name);
        setRole(selectedCollection.role);
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
      setCollection((current) =>
        current ? { ...current, parentId } : current,
      );
      refresh();
      router.back();
    } catch (moveError: unknown) {
      setError(
        moveError instanceof Error ? moveError.message : String(moveError),
      );
    }
  };

  const saveDetails = async () => {
    if (!collection) return;
    setIsSaving(true);
    setError(null);
    try {
      await collections.update(collection.id, name, role);
      setCollection({ ...collection, name: name.trim(), role });
      refresh();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteCollection = () => {
    if (!collection?.parentId) return;
    const parentId = collection.parentId;
    Alert.alert(
      "Delete collection?",
      `Delete ${collection.name}? Child collections will move to its parent. Sounds will remain in Main and their other collections.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setIsSaving(true);
            void collections
              .delete(collection.id)
              .then(() => {
                refresh();
                router.dismissAll();
                router.replace(collectionHref(parentId));
              })
              .catch((deleteError: unknown) =>
                setError(
                  deleteError instanceof Error
                    ? deleteError.message
                    : String(deleteError),
                ),
              )
              .finally(() => setIsSaving(false));
          },
        },
      ],
    );
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

  const detailsUnchanged =
    !!collection && name.trim() === collection.name && role === collection.role;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          COLLECTION DETAILS
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
        {collection ? (
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              NAME
            </Text>
            <TextInput
              accessibilityLabel="Collection name"
              editable={!isSaving}
              maxLength={80}
              onChangeText={setName}
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
            <Text
              style={[
                styles.sectionTitle,
                styles.sectionSpacing,
                { color: colors.text },
              ]}
            >
              TYPE
            </Text>
            <View accessibilityRole="radiogroup" style={styles.roleControl}>
              {(["directory", "randomizer"] as const).map((option) => {
                const isMainRandomizer =
                  collection.id === "main" && option === "randomizer";
                return (
                  <Pressable
                    accessibilityLabel={`${option} collection`}
                    accessibilityRole="radio"
                    accessibilityState={{
                      checked: role === option,
                      disabled: isMainRandomizer,
                    }}
                    disabled={isMainRandomizer || isSaving}
                    key={option}
                    onPress={() => setRole(option)}
                    style={[
                      styles.roleOption,
                      {
                        borderColor: colors.border,
                        backgroundColor: colors.surface,
                      },
                      role === option && { backgroundColor: colors.playing },
                      isMainRandomizer && styles.disabled,
                    ]}
                  >
                    <MaterialIcons
                      color={colors.text}
                      name={option === "directory" ? "folder" : "play-arrow"}
                      size={24}
                    />
                    <Text style={[styles.roleLabel, { color: colors.text }]}>
                      {option.toUpperCase()}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled: isSaving || !name.trim() || detailsUnchanged,
              }}
              disabled={isSaving || !name.trim() || detailsUnchanged}
              onPress={saveDetails}
              style={[
                styles.command,
                { borderColor: colors.border, backgroundColor: colors.accent },
                (isSaving || !name.trim() || detailsUnchanged) &&
                  styles.disabled,
              ]}
            >
              <MaterialIcons color={colors.text} name="save" size={22} />
              <Text style={[styles.commandLabel, { color: colors.text }]}>
                SAVE DETAILS
              </Text>
            </Pressable>
          </>
        ) : null}

        <Text
          style={[
            styles.sectionTitle,
            styles.sectionSpacing,
            { color: colors.text },
          ]}
        >
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
                styles.sectionSpacing,
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

        {collection?.parentId ? (
          <Pressable
            accessibilityLabel="Delete collection"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={deleteCollection}
            style={[
              styles.command,
              styles.deleteButton,
              { borderColor: colors.border },
            ]}
          >
            <MaterialIcons color={colors.text} name="delete" size={22} />
            <Text style={[styles.commandLabel, { color: colors.text }]}>
              DELETE COLLECTION
            </Text>
          </Pressable>
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
  list: { gap: 10, padding: 20, paddingBottom: 40 },
  instructions: { fontSize: 15, marginBottom: 8 },
  sectionTitle: { fontFamily: "Courier", fontSize: 15, fontWeight: "700" },
  sectionSpacing: { marginTop: 8 },
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
    minHeight: 60,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: 8,
    borderWidth: 2,
  },
  roleLabel: { fontFamily: "Courier", fontSize: 13, fontWeight: "700" },
  command: {
    minHeight: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
  },
  commandLabel: { fontFamily: "Courier", fontSize: 14, fontWeight: "700" },
  deleteButton: { marginTop: 24, backgroundColor: "#E74E36" },
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
