import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconArtwork } from "../src/components/IconArtwork";
import {
    BUILT_IN_ICONS,
    materialIconReference,
} from "../src/icons/iconReferences";
import { imageMediaService } from "../src/media/ImageMediaService";
import { useRepositories } from "../src/repositories/RepositoryProvider";
import { useTheme } from "../src/theme/ThemeProvider";

const IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp"];

export default function ImagePickerScreen() {
  const { id, kind } = useLocalSearchParams<{
    id: string;
    kind: "collection" | "sound";
  }>();
  const router = useRouter();
  const { collections, refresh, sounds } = useRepositories();
  const { colors } = useTheme();
  const [currentIconUri, setCurrentIconUri] = useState<string | null>(null);
  const [importedImages, setImportedImages] = useState<readonly string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(true);
  const fallback = kind === "collection" ? "folder" : "play-arrow";

  useEffect(() => {
    const repository = kind === "collection" ? collections : sounds;
    repository
      .getById(id)
      .then((item) => {
        if (!item) {
          throw new Error(
            `${kind === "collection" ? "Collection" : "Sound"} not found.`,
          );
        }
        setCurrentIconUri(item.iconUri);
        setImportedImages(imageMediaService.list());
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      )
      .finally(() => setIsSaving(false));
  }, [collections, id, kind, sounds]);

  const updateIcon = async (iconUri: string | null) => {
    if (kind === "collection") await collections.updateIcon(id, iconUri);
    else await sounds.updateIcon(id, iconUri);
  };

  const saveIcon = async (iconUri: string | null) => {
    setIsSaving(true);
    setError(null);
    try {
      await updateIcon(iconUri);
      setCurrentIconUri(iconUri);
      refresh();
      router.back();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const importImage = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: Platform.OS !== "android",
      multiple: false,
      type: IMAGE_TYPES,
    });
    if (result.canceled) return;

    setIsSaving(true);
    setError(null);
    let importedPath: string | null = null;
    let persisted = false;
    try {
      importedPath = await imageMediaService.import(result.assets[0]);
      await updateIcon(importedPath);
      persisted = true;
      refresh();
      router.back();
    } catch (importError: unknown) {
      if (importedPath && !persisted) imageMediaService.remove(importedPath);
      setError(
        importError instanceof Error
          ? importError.message
          : String(importError),
      );
    } finally {
      setIsSaving(false);
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
          CHOOSE ICON
        </Text>
        <Pressable
          accessibilityLabel="Close image picker"
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
      {isSaving ? (
        <ActivityIndicator
          accessibilityLabel="Saving icon"
          color={colors.accent}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          <Pressable
            accessibilityLabel="Use default icon"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() => void saveIcon(null)}
            style={[
              styles.option,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <IconArtwork
              color={colors.text}
              fallback={fallback}
              iconUri={null}
              size={52}
            />
          </Pressable>
          {BUILT_IN_ICONS.map((icon) => {
            const reference = materialIconReference(icon.name);
            return (
              <Pressable
                accessibilityLabel={icon.label}
                accessibilityRole="button"
                accessibilityState={{ selected: currentIconUri === reference }}
                disabled={isSaving}
                key={icon.name}
                onPress={() => void saveIcon(reference)}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  currentIconUri === reference && {
                    backgroundColor: colors.playing,
                  },
                ]}
              >
                <MaterialIcons color={colors.text} name={icon.name} size={52} />
              </Pressable>
            );
          })}
          {importedImages.map((iconUri, index) => (
            <Pressable
              accessibilityLabel={`Imported image ${index + 1}`}
              accessibilityRole="button"
              accessibilityState={{ selected: currentIconUri === iconUri }}
              disabled={isSaving}
              key={iconUri}
              onPress={() => void saveIcon(iconUri)}
              style={[
                styles.option,
                { borderColor: colors.border, backgroundColor: colors.surface },
                currentIconUri === iconUri && {
                  backgroundColor: colors.playing,
                },
              ]}
            >
              <IconArtwork
                color={colors.text}
                fallback={fallback}
                iconUri={iconUri}
                size={76}
              />
            </Pressable>
          ))}
        </View>
        <Pressable
          accessibilityRole="button"
          disabled={isSaving}
          onPress={() => void importImage()}
          style={[
            styles.importButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            isSaving && styles.disabled,
          ]}
        >
          <MaterialIcons
            color={colors.text}
            name="add-photo-alternate"
            size={24}
          />
          <Text style={[styles.importLabel, { color: colors.text }]}>
            IMPORT IMAGE
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
  importButton: {
    minHeight: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 4,
    borderWidth: 2,
  },
  importLabel: { fontFamily: "Courier", fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.4 },
});
