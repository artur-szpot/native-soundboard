import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { Stack, useRouter } from "expo-router";
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

import { IconArtwork } from "../src/components/IconArtwork";
import { imageMediaService } from "../src/media/ImageMediaService";
import { useRepositories } from "../src/repositories/RepositoryProvider";
import { useTheme } from "../src/theme/ThemeProvider";

export default function DeleteImagesScreen() {
  const router = useRouter();
  const { collections, refresh, sounds } = useRepositories();
  const { colors } = useTheme();
  const [importedImages, setImportedImages] = useState<readonly string[]>([]);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setImportedImages(imageMediaService.list());
  }, []);

  const toggleSelected = (iconUri: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(iconUri)) next.delete(iconUri);
      else next.add(iconUri);
      return next;
    });
  };

  const deleteSelected = async () => {
    setIsDeleting(true);
    setError(null);
    try {
      const [allSounds, allCollections] = await Promise.all([
        sounds.listAll(),
        collections.listAll(),
      ]);
      const clearIconTasks = [
        ...allSounds
          .filter((sound) => sound.iconUri && selected.has(sound.iconUri))
          .map((sound) => sounds.updateIcon(sound.id, null)),
        ...allCollections
          .filter(
            (collection) =>
              collection.iconUri && selected.has(collection.iconUri),
          )
          .map((collection) => collections.updateIcon(collection.id, null)),
      ];
      await Promise.all(clearIconTasks);

      for (const iconUri of selected) {
        try {
          imageMediaService.remove(iconUri);
        } catch {
          // Startup orphan cleanup retries removal.
        }
      }

      refresh();
      router.back();
    } catch (deleteError: unknown) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : String(deleteError),
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen options={{ presentation: "modal" }} />
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          DELETE IMAGES
        </Text>
        <Pressable
          accessibilityLabel="Close delete images"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={[
            styles.closeButton,
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
      {isDeleting ? (
        <ActivityIndicator
          accessibilityLabel="Deleting images"
          color={colors.accent}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {importedImages.map((iconUri, index) => {
            const isSelected = selected.has(iconUri);
            return (
              <Pressable
                accessibilityLabel={`Imported image ${index + 1}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                disabled={isDeleting}
                key={iconUri}
                onPress={() => toggleSelected(iconUri)}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  isSelected && styles.optionSelected,
                ]}
              >
                <IconArtwork
                  color={colors.text}
                  fallback="image"
                  iconUri={iconUri}
                  size={76}
                />
              </Pressable>
            );
          })}
        </View>
        <Pressable
          accessibilityLabel="Delete selected images"
          accessibilityRole="button"
          disabled={selected.size === 0 || isDeleting}
          onPress={() => void deleteSelected()}
          style={[
            styles.deleteButton,
            { borderColor: colors.border },
            (selected.size === 0 || isDeleting) && styles.disabled,
          ]}
        >
          <MaterialIcons color={colors.text} name="delete" size={24} />
          <Text style={[styles.deleteLabel, { color: colors.text }]}>
            DELETE {selected.size} IMAGES
          </Text>
        </Pressable>
      </ScrollView>
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
    paddingHorizontal: 20,
  },
  title: { fontFamily: "Courier", fontSize: 20, fontWeight: "700" },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 2,
  },
  error: { paddingHorizontal: 20, paddingVertical: 8, textAlign: "center" },
  content: { gap: 24, padding: 20, paddingBottom: 40 },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 12,
  },
  option: {
    width: 88,
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 3,
  },
  optionSelected: { borderColor: "#E74E36", borderWidth: 5 },
  deleteButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 4,
    borderWidth: 2,
    backgroundColor: "#E74E36",
  },
  deleteLabel: { fontFamily: "Courier", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.4 },
});
