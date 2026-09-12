import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type Href, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CollectionButton } from "../components/CollectionButton";
import { SoundButton } from "../components/SoundButton";
import type { Collection, Sound } from "../domain/models";
import { collectionHref } from "../navigation/routes";
import { usePlayback } from "../playback/PlaybackProvider";
import { useRepositories } from "../repositories/RepositoryProvider";
import { usePreferences } from "../settings/PreferencesProvider";
import {
    type PlayableSound,
    resolvePlayableSound,
} from "../sounds/starterSounds";
import { useTheme } from "../theme/ThemeProvider";

const GRID_GAP = 18;
const PAGE_PADDING = 20;

type GridItem =
  | { kind: "collection"; value: Collection }
  | { kind: "sound"; value: Sound; playable: PlayableSound };

interface CollectionData {
  ancestors: readonly Collection[];
  collection: Collection;
  items: readonly GridItem[];
  randomizerSounds: ReadonlyMap<string, readonly PlayableSound[]>;
  unavailableCount: number;
}

interface CollectionScreenProps {
  collectionId: string;
}

export function CollectionScreen({ collectionId }: CollectionScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, statusBarStyle } = useTheme();
  const { error: playbackError } = usePlayback();
  const { collections, revision, sounds } = useRepositories();
  const { buttonSize } = usePreferences();
  const [data, setData] = useState<CollectionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setLoadError(null);
      const [collection, ancestors, childCollections, directSounds] =
        await Promise.all([
          collections.getById(collectionId),
          collections.listAncestors(collectionId),
          collections.listChildren(collectionId),
          sounds.listByCollection(collectionId),
        ]);
      if (!collection) {
        throw new Error("Collection not found.");
      }

      const playableDirectSounds = directSounds
        .map((sound) => ({
          sound,
          playable: resolvePlayableSound(sound.id, sound.name, sound.mediaPath),
        }))
        .filter(
          (entry): entry is { sound: Sound; playable: PlayableSound } =>
            entry.playable !== null,
        );
      const randomizerEntries = await Promise.all(
        childCollections
          .filter((child) => child.role === "randomizer")
          .map(async (child) => {
            const candidates = await collections.listPlayableSounds(child.id);
            return [
              child.id,
              candidates
                .map((sound) =>
                  resolvePlayableSound(sound.id, sound.name, sound.mediaPath),
                )
                .filter((sound): sound is PlayableSound => sound !== null),
            ] as const;
          }),
      );

      if (!isCancelled) {
        setData({
          ancestors,
          collection,
          items: [
            ...childCollections.map((value) => ({
              kind: "collection" as const,
              value,
            })),
            ...playableDirectSounds.map(({ sound, playable }) => ({
              kind: "sound" as const,
              value: sound,
              playable,
            })),
          ],
          randomizerSounds: new Map(randomizerEntries),
          unavailableCount: directSounds.length - playableDirectSounds.length,
        });
      }
    }

    void load().catch((error: unknown) => {
      if (!isCancelled) {
        setLoadError(error instanceof Error ? error.message : String(error));
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [collectionId, collections, retryCount, revision, sounds]);

  const availableWidth = Math.max(0, width - PAGE_PADDING * 2);
  const columnCount = Math.max(
    1,
    Math.floor((availableWidth + GRID_GAP) / (buttonSize + GRID_GAP)),
  );

  if (loadError) {
    return (
      <SafeAreaView
        style={[styles.centered, { backgroundColor: colors.background }]}
      >
        <Text
          accessibilityRole="alert"
          style={[styles.message, { color: colors.text }]}
        >
          {loadError}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setRetryCount((count) => count + 1)}
          style={[
            styles.retryButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
          ]}
        >
          <Text style={[styles.retryLabel, { color: colors.text }]}>
            TRY AGAIN
          </Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (!data) {
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

  const routeToOrganizer = (kind: "collection" | "sound", id: string) => {
    router.push(`/organize/${kind}/${id}` as Href);
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
          {data.collection.name.toUpperCase()}
        </Text>
        <Pressable
          accessibilityLabel="Open menu"
          accessibilityRole="button"
          onPress={() =>
            router.push({ pathname: "/menu", params: { collectionId } } as Href)
          }
          style={({ pressed }) => [
            styles.menuButton,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && styles.pressed,
          ]}
        >
          <MaterialIcons color={colors.text} name="menu" size={28} />
        </Pressable>
      </View>

      {data.ancestors.length > 0 ? (
        <ScrollView
          accessibilityLabel="Breadcrumbs"
          contentContainerStyle={styles.breadcrumbs}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.breadcrumbScroller}
        >
          {data.ancestors.map((ancestor) => (
            <View key={ancestor.id} style={styles.breadcrumbItem}>
              <Pressable
                accessibilityRole="link"
                onPress={() => router.navigate(collectionHref(ancestor.id))}
              >
                <Text style={[styles.breadcrumbText, { color: colors.text }]}>
                  {ancestor.name}
                </Text>
              </Pressable>
              <MaterialIcons
                color={colors.mutedText}
                name="chevron-right"
                size={18}
              />
            </View>
          ))}
          <Text style={[styles.breadcrumbCurrent, { color: colors.mutedText }]}>
            {data.collection.name}
          </Text>
        </ScrollView>
      ) : null}

      {playbackError || data.unavailableCount > 0 ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.text }]}
        >
          {playbackError ??
            `${data.unavailableCount} sound file is unavailable.`}
        </Text>
      ) : null}

      <FlatList
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.mutedText }]}>
            This collection is empty.
          </Text>
        }
        columnWrapperStyle={columnCount > 1 ? styles.row : undefined}
        contentContainerStyle={[
          styles.grid,
          data.items.length === 0 && styles.emptyGrid,
        ]}
        data={data.items}
        key={columnCount}
        keyExtractor={(item) => `${item.kind}:${item.value.id}`}
        numColumns={columnCount}
        renderItem={({ item }) =>
          item.kind === "sound" ? (
            <SoundButton
              onLongPress={() => routeToOrganizer("sound", item.value.id)}
              size={buttonSize}
              sound={item.playable}
            />
          ) : (
            <CollectionButton
              collection={item.value}
              onLongPress={() => routeToOrganizer("collection", item.value.id)}
              onOpen={() => router.push(collectionHref(item.value.id))}
              playableSounds={data.randomizerSounds.get(item.value.id) ?? []}
              size={buttonSize}
            />
          )
        }
      />
      <StatusBar style={statusBarStyle} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: PAGE_PADDING,
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: PAGE_PADDING,
  },
  title: {
    flexShrink: 1,
    fontFamily: "Courier",
    fontSize: 22,
    fontWeight: "700",
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 2,
  },
  breadcrumbs: {
    minHeight: 40,
    alignItems: "center",
    paddingHorizontal: PAGE_PADDING,
  },
  breadcrumbScroller: { flexGrow: 0 },
  breadcrumbItem: { flexDirection: "row", alignItems: "center" },
  breadcrumbText: { fontSize: 15, fontWeight: "700" },
  breadcrumbCurrent: { fontSize: 15 },
  message: { fontSize: 16, textAlign: "center" },
  retryButton: {
    minWidth: 132,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 3,
  },
  retryLabel: { fontFamily: "Courier", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  error: {
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "center",
  },
  grid: {
    gap: GRID_GAP,
    padding: PAGE_PADDING,
  },
  emptyGrid: {
    flexGrow: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  empty: { fontSize: 16, textAlign: "center" },
  row: { justifyContent: "center", gap: GRID_GAP },
});
