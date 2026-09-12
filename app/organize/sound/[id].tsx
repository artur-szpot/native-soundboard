import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
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

import type { Collection, Sound } from "../../../src/domain/models";
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
  const { collections, refresh, sounds } = useRepositories();
  const { activeSoundId, isBusy, play } = usePlayback();
  const { colors } = useTheme();
  const [sound, setSound] = useState<Sound | null>(null);
  const [name, setName] = useState("");
  const [allCollections, setAllCollections] = useState<readonly Collection[]>(
    [],
  );
  const [memberships, setMemberships] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      sounds.getById(id),
      collections.listAll(),
      sounds.listMembershipCollectionIds(id),
    ])
      .then(([selectedSound, availableCollections, collectionIds]) => {
        if (!selectedSound) throw new Error("Sound not found.");
        setSound(selectedSound);
        setName(selectedSound.name);
        setAllCollections(
          availableCollections.filter((collection) => collection.id !== "main"),
        );
        setMemberships(new Set(collectionIds));
      })
      .catch((loadError: unknown) =>
        setError(
          loadError instanceof Error ? loadError.message : String(loadError),
        ),
      );
  }, [collections, id, sounds]);

  const toggleMembership = async (collectionId: string) => {
    const included = !memberships.has(collectionId);
    setError(null);
    try {
      await sounds.setMembership(id, collectionId, included);
      setMemberships((current) => {
        const next = new Set(current);
        if (included) next.add(collectionId);
        else next.delete(collectionId);
        return next;
      });
      refresh();
    } catch (membershipError: unknown) {
      setError(
        membershipError instanceof Error
          ? membershipError.message
          : String(membershipError),
      );
    }
  };

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
    ? resolvePlayableSound(sound.id, sound.name, sound.mediaPath)
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
            <Text style={[styles.fileName, { color: colors.mutedText }]}>
              FILE: {sound.originalFilename ?? "Bundled audio"}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{
                disabled:
                  isSaving || !name.trim() || name.trim() === sound.name,
              }}
              disabled={isSaving || !name.trim() || name.trim() === sound.name}
              onPress={saveName}
              style={[
                styles.command,
                { borderColor: colors.border, backgroundColor: colors.accent },
                (isSaving || !name.trim() || name.trim() === sound.name) &&
                  styles.disabled,
              ]}
            >
              <MaterialIcons color={colors.text} name="save" size={22} />
              <Text style={[styles.commandLabel, { color: colors.text }]}>
                SAVE NAME
              </Text>
            </Pressable>
            <View style={styles.commandRow}>
              <Pressable
                accessibilityLabel={`Play ${sound.name}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: isBusy || !playable }}
                disabled={isBusy || !playable}
                onPress={() => playable && play(playable.id, playable.source)}
                style={[
                  styles.command,
                  styles.flexCommand,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                  (isBusy || !playable) && styles.disabled,
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name={activeSoundId === sound.id ? "volume-up" : "play-arrow"}
                  size={22}
                />
                <Text style={[styles.commandLabel, { color: colors.text }]}>
                  PLAY
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                disabled={isSaving}
                onPress={replaceAudio}
                style={[
                  styles.command,
                  styles.flexCommand,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
              >
                <MaterialIcons
                  color={colors.text}
                  name="find-replace"
                  size={22}
                />
                <Text style={[styles.commandLabel, { color: colors.text }]}>
                  REPLACE AUDIO
                </Text>
              </Pressable>
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

        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          COLLECTIONS
        </Text>
        <Text style={[styles.instructions, { color: colors.mutedText }]}>
          Choose the collections containing this sound.
        </Text>
        {allCollections.map((collection) => {
          const isChecked = memberships.has(collection.id);
          return (
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              key={collection.id}
              onPress={() => toggleMembership(collection.id)}
              style={[
                styles.option,
                { borderColor: colors.border, backgroundColor: colors.surface },
              ]}
            >
              <MaterialIcons
                color={colors.text}
                name={isChecked ? "check-box" : "check-box-outline-blank"}
                size={26}
              />
              <Text style={[styles.optionLabel, { color: colors.text }]}>
                {" "}
                {collection.name}{" "}
              </Text>
            </Pressable>
          );
        })}

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
  sectionTitle: {
    marginTop: 8,
    fontFamily: "Courier",
    fontSize: 15,
    fontWeight: "700",
  },
  instructions: { fontSize: 15, marginBottom: 8 },
  repair: { paddingVertical: 6, fontSize: 15 },
  fileName: { fontFamily: "Courier", fontSize: 13 },
  input: {
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
    fontSize: 17,
  },
  commandRow: { flexDirection: "row", gap: 10 },
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
  flexCommand: { flex: 1 },
  commandLabel: {
    fontFamily: "Courier",
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
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
