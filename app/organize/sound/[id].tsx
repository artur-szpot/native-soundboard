import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { type Href, useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { IconArtwork } from "../../../src/components/IconArtwork";
import type { Sound } from "../../../src/domain/models";
import { isImageIconReference } from "../../../src/icons/iconReferences";
import { audioMediaService } from "../../../src/media/AudioMediaService";
import { usePlayback } from "../../../src/playback/PlaybackProvider";
import { useRepositories } from "../../../src/repositories/RepositoryProvider";
import { resolvePlayableSound } from "../../../src/sounds/starterSounds";
import { useTheme } from "../../../src/theme/ThemeProvider";

const AUDIO_TYPES = [
  "audio/mpeg",
  "audio/mp4",
  "audio/aac",
  "audio/wav",
  "audio/ogg",
  "application/ogg",
];

export default function OrganizeSoundRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { refresh, revision, sounds } = useRepositories();
  const { activeSoundId, isBusy, play } = usePlayback();
  const { colors } = useTheme();
  const [sound, setSound] = useState<Sound | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    sounds
      .getById(id)
      .then((selectedSound) => {
        if (!selectedSound) throw new Error("Sound not found.");
        setSound(selectedSound);
        setName(selectedSound.name);
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      );
  }, [id, revision, sounds]);

  const saveName = async () => {
    if (!sound) return;
    setIsSaving(true);
    setError(null);
    try {
      await sounds.updateName(sound.id, name);
      setSound({ ...sound, name: name.trim() });
      refresh();
    } catch (saveError: unknown) {
      setError(
        saveError instanceof Error ? saveError.message : String(saveError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const replaceAudio = async () => {
    if (!sound) return;
    const result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: Platform.OS !== "android",
      multiple: false,
      type: AUDIO_TYPES,
    });
    if (result.canceled) return;

    setIsSaving(true);
    setError(null);
    let replacementPath: string | null = null;
    try {
      const replacement = await audioMediaService.import(result.assets[0]);
      replacementPath = replacement.mediaPath;
      try {
        await sounds.replaceMedia(
          sound.id,
          replacement.mediaPath,
          result.assets[0].name,
        );
      } catch (replaceError) {
        audioMediaService.remove(replacement.mediaPath);
        throw replaceError;
      }
      try {
        audioMediaService.remove(sound.mediaPath);
      } catch {
        // Startup orphan cleanup retries removal without breaking the new reference.
      }
      setSound({
        ...sound,
        mediaPath: replacement.mediaPath,
        originalFilename: result.assets[0].name,
      });
      refresh();
    } catch (replaceError: unknown) {
      if (replacementPath) {
        try {
          audioMediaService.remove(replacementPath);
        } catch {
          // Startup orphan cleanup handles a staged file that cannot be removed now.
        }
      }
      setError(
        replaceError instanceof Error
          ? replaceError.message
          : String(replaceError),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const deleteSound = () => {
    if (!sound) return;
    Alert.alert(
      "Delete sound?",
      `Delete ${sound.name} from Main and every collection? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            setIsSaving(true);
            void sounds
              .delete(sound.id)
              .then(() => {
                try {
                  audioMediaService.remove(sound.mediaPath);
                } catch {
                  // Startup orphan cleanup retries removal.
                }
                refresh();
                router.dismissAll();
                router.replace("/");
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

  const playable = sound
    ? resolvePlayableSound(sound.id, sound.iconUri, sound.name, sound.mediaPath)
    : null;

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          SOUND DETAILS
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
          <>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              NAME
            </Text>
            <View style={styles.nameRow}>
              <TextInput
                accessibilityLabel="Sound name"
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
                accessibilityLabel="Save sound name"
                accessibilityRole="button"
                accessibilityState={{
                  disabled:
                    isSaving || !name.trim() || name.trim() === sound.name,
                }}
                disabled={
                  isSaving || !name.trim() || name.trim() === sound.name
                }
                onPress={saveName}
                style={({ pressed }) => [
                  styles.nameSaveButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.success,
                  },
                  pressed && styles.pressed,
                  (isSaving || !name.trim() || name.trim() === sound.name) &&
                    styles.disabled,
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name="check"
                  size={26}
                  testID="sound-name-save-icon"
                />
              </Pressable>
            </View>
            <View style={styles.actionRow}>
              <View style={styles.actionItem}>
                <Pressable
                  accessibilityLabel="Choose sound icon"
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      `/images?id=${encodeURIComponent(sound.id)}&kind=sound` as Href,
                    )
                  }
                  style={({ pressed }) => [
                    styles.squareButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: isImageIconReference(sound.iconUri)
                        ? colors.background
                        : colors.accent,
                      shadowColor: colors.shadow,
                    },
                    pressed && styles.squareButtonPressed,
                  ]}
                >
                  <IconArtwork
                    color={colors.text}
                    fallback="play-arrow"
                    iconUri={sound.iconUri}
                    size={62}
                  />
                </Pressable>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  ICON
                </Text>
              </View>
              <View style={styles.actionItem}>
                <Pressable
                  accessibilityLabel={`Play ${sound.name}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isBusy || !playable }}
                  disabled={isBusy || !playable}
                  onPress={() => playable && play(playable.id, playable.source)}
                  style={({ pressed }) => [
                    styles.squareButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.accent,
                      shadowColor: colors.shadow,
                    },
                    pressed && styles.squareButtonPressed,
                    (isBusy || !playable) && styles.disabled,
                  ]}
                >
                  <MaterialIcons
                    color={colors.text}
                    name={
                      activeSoundId === sound.id ? "volume-up" : "play-arrow"
                    }
                    size={46}
                  />
                </Pressable>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  PLAY
                </Text>
              </View>
              <View style={styles.actionItem}>
                <Pressable
                  accessibilityLabel="Change sound file"
                  accessibilityRole="button"
                  disabled={isSaving}
                  onPress={replaceAudio}
                  style={({ pressed }) => [
                    styles.squareButton,
                    {
                      borderColor: colors.border,
                      backgroundColor: colors.surface,
                      shadowColor: colors.shadow,
                    },
                    pressed && styles.squareButtonPressed,
                    isSaving && styles.disabled,
                  ]}
                >
                  <MaterialIcons
                    color={colors.text}
                    name="audio-file"
                    size={42}
                  />
                </Pressable>
                <Text style={[styles.actionLabel, { color: colors.text }]}>
                  CHANGE FILE
                </Text>
              </View>
            </View>
            {!playable ? (
              <Text
                accessibilityRole="alert"
                style={[styles.repair, { color: colors.text }]}
              >
                Audio is unavailable. Replace the file to repair this sound.
              </Text>
            ) : null}
          </>
        ) : null}

        {sound ? (
          <Pressable
            accessibilityRole="button"
            disabled={isSaving}
            onPress={() =>
              router.push(
                `/organize/sound/${encodeURIComponent(sound.id)}/collections` as Href,
              )
            }
            style={({ pressed }) => [
              styles.command,
              { borderColor: colors.border, backgroundColor: colors.surface },
              pressed && styles.pressed,
              isSaving && styles.disabled,
            ]}
          >
            <MaterialIcons color={colors.text} name="folder" size={22} />
            <Text style={[styles.commandLabel, { color: colors.text }]}>
              COLLECTIONS
            </Text>
          </Pressable>
        ) : null}

        {sound ? (
          <Pressable
            accessibilityLabel="Delete sound globally"
            accessibilityRole="button"
            disabled={isSaving}
            onPress={deleteSound}
            style={[
              styles.command,
              styles.deleteButton,
              { borderColor: colors.border },
            ]}
          >
            <MaterialIcons color={colors.text} name="delete" size={22} />
            <Text style={[styles.commandLabel, { color: colors.text }]}>
              DELETE SOUND
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
  repair: { paddingVertical: 6, fontSize: 15 },
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 10,
  },
  actionItem: { flex: 1, maxWidth: 104, alignItems: "center", gap: 8 },
  squareButton: {
    width: "100%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 3,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  squareButtonPressed: {
    transform: [{ translateX: 4 }, { translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
    elevation: 2,
  },
  actionLabel: {
    minHeight: 36,
    fontFamily: "Courier",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
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
  commandLabel: {
    fontFamily: "Courier",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  pressed: { opacity: 0.65 },
  deleteButton: { marginTop: 24, backgroundColor: "#E74E36" },
  disabled: { opacity: 0.42 },
});
