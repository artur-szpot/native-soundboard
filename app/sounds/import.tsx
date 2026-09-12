import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useState } from "react";
import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
  audioMediaService,
  type PickedAudio,
} from "../../src/media/AudioMediaService";
import { collectionHref } from "../../src/navigation/routes";
import { useRepositories } from "../../src/repositories/RepositoryProvider";
import { useTheme } from "../../src/theme/ThemeProvider";

const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/ogg",
  "application/ogg",
];

function nameFromFilename(filename: string): string {
  const extensionIndex = filename.lastIndexOf(".");
  return extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
}

export default function ImportSoundRoute() {
  const { collectionId = "main" } = useLocalSearchParams<{
    collectionId?: string;
  }>();
  const router = useRouter();
  const { refresh, sounds } = useRepositories();
  const { colors } = useTheme();
  const [pickedAudio, setPickedAudio] = useState<PickedAudio | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const chooseAudio = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: Platform.OS !== "android",
        multiple: false,
        type: AUDIO_TYPES,
      });
      if (result.canceled) return;

      const asset = result.assets[0];
      setPickedAudio(asset);
      setName(nameFromFilename(asset.name));
    } catch (pickerError: unknown) {
      setError(
        pickerError instanceof Error
          ? pickerError.message
          : String(pickerError),
      );
    }
  };

  const importSound = async () => {
    if (!pickedAudio) return;
    setError(null);
    setIsSaving(true);
    let mediaPath: string | null = null;
    let soundId: string | null = null;

    try {
      const imported = await audioMediaService.import(pickedAudio);
      mediaPath = imported.mediaPath;
      const sound = await sounds.create(
        name,
        imported.mediaPath,
        pickedAudio.name,
      );
      soundId = sound.id;
      if (collectionId !== "main") {
        await sounds.setMembership(sound.id, collectionId, true);
      }
      refresh();
      router.dismissAll();
      router.replace(collectionHref(collectionId));
    } catch (importError: unknown) {
      let canRemoveMedia = soundId === null;
      if (soundId) {
        try {
          await sounds.delete(soundId);
          canRemoveMedia = true;
        } catch {
          setError(
            "Import failed and cleanup could not complete. The sound remains in Main.",
          );
          return;
        }
      }
      if (mediaPath && canRemoveMedia) {
        try {
          audioMediaService.remove(mediaPath);
        } catch {
          // Startup orphan cleanup retries removal.
        }
      }
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
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          IMPORT SOUND
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
        <Pressable
          accessibilityLabel={
            pickedAudio
              ? `Selected audio file ${pickedAudio.name}`
              : "Choose audio file"
          }
          accessibilityRole="button"
          disabled={isSaving}
          onPress={chooseAudio}
          style={[
            styles.fileButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
          ]}
        >
          <MaterialIcons color={colors.text} name="folder-open" size={26} />
          <Text style={[styles.fileLabel, { color: colors.text }]}>
            {pickedAudio?.name ?? "CHOOSE AUDIO FILE"}
          </Text>
        </Pressable>
        <Text style={[styles.help, { color: colors.mutedText }]}>
          MP3, M4A, AAC, WAV, or OGG. Maximum 10 MB and one minute.
        </Text>
        <Text style={[styles.label, { color: colors.text }]}>NAME</Text>
        <TextInput
          accessibilityLabel="Sound name"
          editable={!isSaving}
          maxLength={80}
          onChangeText={setName}
          placeholder="Sound name"
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
          accessibilityState={{
            disabled: isSaving || !pickedAudio || !name.trim(),
          }}
          disabled={isSaving || !pickedAudio || !name.trim()}
          onPress={importSound}
          style={[
            styles.saveButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            (isSaving || !pickedAudio || !name.trim()) && styles.disabled,
          ]}
        >
          <Text style={[styles.saveLabel, { color: colors.text }]}>
            {isSaving ? "IMPORTING..." : "IMPORT"}
          </Text>
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
  fileButton: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
  },
  fileLabel: {
    flex: 1,
    fontFamily: "Courier",
    fontSize: 15,
    fontWeight: "700",
  },
  help: { fontSize: 14 },
  label: { fontFamily: "Courier", fontSize: 15, fontWeight: "700" },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
    fontSize: 17,
  },
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
