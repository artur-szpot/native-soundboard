import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import {
    Stack,
    useFocusEffect,
    useLocalSearchParams,
    useRouter,
} from "expo-router";
import { useCallback, useState } from "react";
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
import { pickDirectoryMediaFiles } from "../src/media/DirectoryMediaPicker";
import {
    imageMediaService,
    isSupportedImageFilename,
    type PickedImage,
} from "../src/media/ImageMediaService";
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
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isSaving, setIsSaving] = useState(true);
  const fallback = kind === "collection" ? "folder" : "play-arrow";

  useFocusEffect(
    useCallback(() => {
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
    }, [collections, id, kind, sounds]),
  );

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

  const importImageBatch = async (assets: readonly PickedImage[]) => {
    const failures: string[] = [];
    for (const asset of assets) {
      try {
        await imageMediaService.import(asset);
      } catch (importError: unknown) {
        failures.push(
          `${asset.name}: ${
            importError instanceof Error
              ? importError.message
              : String(importError)
          }`,
        );
      }
    }
    setImportedImages(imageMediaService.list());
    if (failures.length > 0) setError(failures.join("\n"));
  };

  const importImage = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: Platform.OS !== "android",
        multiple: true,
        type: IMAGE_TYPES,
      });
      if (result.canceled) return;

      setIsSaving(true);
      if (result.assets.length === 1) {
        let importedPath: string | null = null;
        let persisted = false;
        try {
          importedPath = await imageMediaService.import(result.assets[0]);
          await updateIcon(importedPath);
          persisted = true;
          refresh();
          router.back();
        } catch (importError: unknown) {
          if (importedPath && !persisted)
            imageMediaService.remove(importedPath);
          throw importError;
        }
        return;
      }

      await importImageBatch(result.assets);
    } catch (importError: unknown) {
      setError(
        importError instanceof Error
          ? importError.message
          : String(importError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const importImageDirectory = async () => {
    setIsLoadingDirectory(true);
    try {
      const assets = await pickDirectoryMediaFiles(isSupportedImageFilename);
      if (assets === null) return;
      if (assets.length === 0) {
        setError("No supported images were found in that directory.");
        return;
      }

      setError(null);
      setIsSaving(true);
      await importImageBatch(assets);
    } catch (importError: unknown) {
      setError(
        importError instanceof Error
          ? importError.message
          : String(importError),
      );
    } finally {
      setIsSaving(false);
      setIsLoadingDirectory(false);
    }
  };

  const isBusy = isSaving || isLoadingDirectory;

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
      {isSaving && !isLoadingDirectory ? (
        <ActivityIndicator
          accessibilityLabel="Saving icon"
          color={colors.accent}
        />
      ) : null}
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.grid}>
          {BUILT_IN_ICONS.map((icon) => {
            const reference = materialIconReference(icon.name);
            const isSelected = currentIconUri === reference;
            return (
              <Pressable
                accessibilityLabel={icon.label}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected }}
                disabled={isBusy}
                key={icon.name}
                onPress={() => void saveIcon(reference)}
                style={[
                  styles.option,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  isSelected && {
                    borderColor: colors.accent,
                    borderWidth: 5,
                  },
                ]}
              >
                <MaterialIcons
                  color={isSelected ? colors.accent : colors.text}
                  name={icon.name}
                  size={52}
                  testID={`built-in-icon-${icon.name}`}
                />
              </Pressable>
            );
          })}
          {importedImages.map((iconUri, index) => (
            <Pressable
              accessibilityLabel={`Imported image ${index + 1}`}
              accessibilityRole="button"
              accessibilityState={{ selected: currentIconUri === iconUri }}
              disabled={isBusy}
              key={iconUri}
              onPress={() => void saveIcon(iconUri)}
              style={[
                styles.option,
                { borderColor: colors.border, backgroundColor: colors.surface },
                currentIconUri === iconUri && {
                  borderColor: colors.accent,
                  borderWidth: 5,
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
          accessibilityLabel="Use default icon"
          accessibilityRole="button"
          accessibilityState={{
            selected: currentIconUri === null,
            disabled: isBusy || currentIconUri === null,
          }}
          disabled={isBusy || currentIconUri === null}
          onPress={() => void saveIcon(null)}
          style={[
            styles.defaultButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            isBusy && styles.disabled,
          ]}
        >
          <MaterialIcons
            color={colors.text}
            name="not-interested"
            size={28}
            testID="default-icon"
          />
          <Text style={[styles.importLabel, { color: colors.text }]}>
            DEFAULT
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => void importImage()}
          style={[
            styles.importButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            isBusy && styles.disabled,
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
        <Pressable
          accessibilityLabel="Choose image directory"
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => void importImageDirectory()}
          style={[
            styles.importButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            isBusy && styles.disabled,
          ]}
        >
          <MaterialIcons color={colors.text} name="folder" size={24} />
          <Text style={[styles.importLabel, { color: colors.text }]}>
            IMPORT DIRECTORY
          </Text>
        </Pressable>
        <Text style={[styles.help, { color: colors.mutedText }]}>
          PNG, JPEG, or WebP. Maximum 5 MB and 4096 by 4096 pixels each.
        </Text>
        <Pressable
          accessibilityLabel="Delete images"
          accessibilityRole="button"
          disabled={isBusy}
          onPress={() => router.push("/images-delete")}
          style={[
            styles.importButton,
            styles.deleteButton,
            { borderColor: colors.border },
            isBusy && styles.disabled,
          ]}
        >
          <MaterialIcons color={colors.text} name="delete" size={24} />
          <Text style={[styles.importLabel, { color: colors.text }]}>
            DELETE IMAGES
          </Text>
        </Pressable>
        {isLoadingDirectory ? (
          <View
            style={[
              styles.loadingStatus,
              {
                backgroundColor: colors.surface,
                borderColor: colors.accent,
              },
            ]}
          >
            <ActivityIndicator
              accessibilityLabel="Loading image directory"
              color={colors.accent}
              size="large"
            />
            <Text style={[styles.loadingLabel, { color: colors.text }]}>
              LOADING FILES...
            </Text>
          </View>
        ) : null}
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
  help: { fontSize: 14 },
  deleteButton: { backgroundColor: "#E74E36" },
  loadingStatus: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 14,
    paddingHorizontal: 16,
    borderRadius: 4,
    borderWidth: 2,
  },
  loadingLabel: { fontFamily: "Courier", fontSize: 16, fontWeight: "700" },
  defaultButton: {
    width: "100%",
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
