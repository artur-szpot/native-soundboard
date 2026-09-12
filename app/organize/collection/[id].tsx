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

import { IconArtwork } from "../../../src/components/IconArtwork";
import type { Collection, CollectionRole } from "../../../src/domain/models";
import { isImageIconReference } from "../../../src/icons/iconReferences";
import { collectionHref } from "../../../src/navigation/routes";
import { useRepositories } from "../../../src/repositories/RepositoryProvider";
import { useTheme } from "../../../src/theme/ThemeProvider";

export default function OrganizeCollectionRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { collections, refresh, revision } = useRepositories();
  const { colors } = useTheme();
  const [collection, setCollection] = useState<Collection | null>(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState<CollectionRole>("directory");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    collections
      .getById(id)
      .then((selectedCollection) => {
        if (!selectedCollection) throw new Error("Collection not found.");
        setCollection(selectedCollection);
        setName(selectedCollection.name);
        setRole(selectedCollection.role);
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      );
  }, [collections, id, revision]);

  const saveName = async () => {
    if (!collection) return;
    setIsSaving(true);
    setError(null);
    try {
      await collections.update(collection.id, name, collection.role);
      setCollection({ ...collection, name: name.trim() });
      refresh();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const changeRole = async (nextRole: CollectionRole) => {
    if (!collection || nextRole === collection.role) return;
    const previousRole = collection.role;
    setRole(nextRole);
    setIsSaving(true);
    setError(null);
    try {
      await collections.update(collection.id, collection.name, nextRole);
      setCollection({ ...collection, role: nextRole });
      refresh();
    } catch (saveError: unknown) {
      setRole(previousRole);
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const changeHideBorder = async (hideBorder: boolean) => {
    if (!collection) return;
    setIsSaving(true);
    setError(null);
    try {
      await collections.updateHideBorder(collection.id, hideBorder);
      setCollection({ ...collection, hideBorder });
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

  const nameUnchanged = !!collection && name.trim() === collection.name;
  const hasImage = isImageIconReference(collection?.iconUri ?? null);

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
              ICON
            </Text>
            <Pressable
              accessibilityLabel="Choose collection icon"
              accessibilityRole="button"
              onPress={() =>
                router.push(
                  `/images?id=${encodeURIComponent(collection.id)}&kind=collection` as Href,
                )
              }
              style={[
                styles.iconPreview,
                {
                  borderColor:
                    hasImage && collection.hideBorder
                      ? colors.background
                      : colors.border,
                  backgroundColor: hasImage
                    ? colors.background
                    : colors.collection,
                },
              ]}
            >
              <IconArtwork
                color={colors.text}
                fallback={
                  collection.role === "randomizer" ? "shuffle" : "folder"
                }
                iconUri={collection.iconUri}
                size={72}
              />
            </Pressable>
            {hasImage ? (
              <Pressable
                accessibilityLabel="Hide collection border"
                accessibilityRole="checkbox"
                accessibilityState={{ checked: collection.hideBorder }}
                disabled={isSaving}
                onPress={() => void changeHideBorder(!collection.hideBorder)}
                style={[
                  styles.checkboxOption,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  isSaving && styles.disabled,
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name={
                    collection.hideBorder
                      ? "check-box"
                      : "check-box-outline-blank"
                  }
                  size={26}
                />
                <Text style={[styles.checkboxLabel, { color: colors.text }]}>
                  Hide border
                </Text>
              </Pressable>
            ) : null}
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              NAME
            </Text>
            <View style={styles.nameRow}>
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
              <Pressable
                accessibilityLabel="Save collection name"
                accessibilityRole="button"
                accessibilityState={{
                  disabled: isSaving || !name.trim() || nameUnchanged,
                }}
                disabled={isSaving || !name.trim() || nameUnchanged}
                onPress={saveName}
                style={({ pressed }) => [
                  styles.nameSaveButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.success,
                  },
                  pressed && styles.pressed,
                  (isSaving || !name.trim() || nameUnchanged) &&
                    styles.disabled,
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name="check"
                  size={26}
                  testID="collection-name-save-icon"
                />
              </Pressable>
            </View>
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
                    onPress={() => void changeRole(option)}
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
          </>
        ) : null}

        {collection?.parentId ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() =>
              router.push(
                `/organize/collection/${collection.id}/parent` as Href,
              )
            }
            style={[
              styles.command,
              styles.sectionSpacing,
              { borderColor: colors.border, backgroundColor: colors.surface },
              isSaving && styles.disabled,
            ]}
          >
            <MaterialIcons
              color={colors.text}
              name="drive-file-move"
              size={22}
            />
            <Text style={[styles.commandLabel, { color: colors.text }]}>
              CHANGE PARENT
            </Text>
          </Pressable>
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
  sectionTitle: { fontFamily: "Courier", fontSize: 15, fontWeight: "700" },
  iconPreview: {
    width: 104,
    height: 104,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 3,
  },
  checkboxOption: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 4,
    borderWidth: 2,
  },
  checkboxLabel: { fontSize: 16, fontWeight: "700" },
  sectionSpacing: { marginTop: 8 },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
    fontSize: 17,
  },
  nameSaveButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 2,
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
  pressed: { opacity: 0.65 },
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
  disabled: { opacity: 0.42 },
});
