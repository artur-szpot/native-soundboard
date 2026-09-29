import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type Href, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    BackHandler,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    TextInput,
    View,
    useWindowDimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { CollectionButton } from "../src/components/CollectionButton";
import { SoundButton } from "../src/components/SoundButton";
import type { Collection, Sound } from "../src/domain/models";
import { collectionHref } from "../src/navigation/routes";
import { usePlayback } from "../src/playback/PlaybackProvider";
import { useRepositories } from "../src/repositories/RepositoryProvider";
import { usePreferences } from "../src/settings/PreferencesProvider";
import {
    type PlayableSound,
    resolvePlayableSound,
} from "../src/sounds/starterSounds";
import { useTheme } from "../src/theme/ThemeProvider";

const GRID_GAP = 18;
const PAGE_PADDING = 20;

type ResultItem =
  | { kind: "collection"; value: Collection }
  | { kind: "sound"; value: Sound; playable: PlayableSound };

interface SearchResults {
  items: readonly ResultItem[];
  randomizerSounds: ReadonlyMap<string, readonly PlayableSound[]>;
  unavailableCount: number;
}

const toPlayable = (sound: Sound) =>
  resolvePlayableSound(
    sound.id,
    sound.iconUri,
    sound.name,
    sound.mediaPath,
    sound.hideBorder,
  );

export default function SearchRoute() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, statusBarStyle } = useTheme();
  const { error: playbackError } = usePlayback();
  const { collections, revision, sounds } = useRepositories();
  const { buttonSize, listView, setListView } = usePreferences();
  const [text, setText] = useState("");
  const [executedQuery, setExecutedQuery] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [selection, setSelection] = useState<{
    ids: readonly string[];
    kind: "collection" | "sound" | null;
  } | null>(null);
  const hasLeftScreen = useRef(false);

  const trimmedText = text.trim();
  const canSearch = trimmedText.length > 0 && trimmedText !== executedQuery;
  const isSelectionMode = selection !== null;
  const selectedIds = new Set(selection?.ids ?? []);

  const runSearch = () => {
    if (!canSearch) return;
    setSelection((current) => (current ? { ids: [], kind: null } : null));
    setExecutedQuery(trimmedText);
  };

  const selectItem = (kind: "collection" | "sound", id: string) => {
    setSelection((current) => {
      if (!current) return null;
      if (current.ids.length > 0 && current.kind !== kind) return current;
      const ids = current.ids.includes(id)
        ? current.ids.filter((selectedId) => selectedId !== id)
        : [...current.ids, id];
      return ids.length === 0 ? { ids: [], kind: null } : { ids, kind };
    });
  };

  useFocusEffect(
    useCallback(() => {
      if (hasLeftScreen.current) {
        setSelection(null);
        hasLeftScreen.current = false;
      }
      return () => {
        hasLeftScreen.current = true;
      };
    }, []),
  );

  useEffect(() => {
    if (!isSelectionMode) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        setSelection(null);
        return true;
      },
    );
    return () => subscription.remove();
  }, [isSelectionMode]);

  useEffect(() => {
    if (executedQuery === null) return;
    let isCancelled = false;
    const needle = executedQuery.toLowerCase();
    const matches = (name: string) => name.toLowerCase().includes(needle);

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      const [allSounds, allCollections] = await Promise.all([
        sounds.listAll(),
        collections.listAll(),
      ]);
      const matchedSounds = allSounds.filter((sound) => matches(sound.name));
      const matchedRandomizers = allCollections.filter(
        (collection) =>
          collection.role === "randomizer" && matches(collection.name),
      );
      const randomizerEntries = await Promise.all(
        matchedRandomizers.map(async (randomizer) => {
          const candidates = await collections.listPlayableSounds(
            randomizer.id,
          );
          return [
            randomizer.id,
            candidates
              .map(toPlayable)
              .filter((sound): sound is PlayableSound => sound !== null),
          ] as const;
        }),
      );
      const soundItems = matchedSounds.flatMap((sound): ResultItem[] => {
        const playable = toPlayable(sound);
        return playable ? [{ kind: "sound", value: sound, playable }] : [];
      });
      const items: ResultItem[] = [
        ...matchedRandomizers.map(
          (value): ResultItem => ({ kind: "collection", value }),
        ),
        ...soundItems,
      ].sort(
        (a, b) =>
          a.value.name
            .toLowerCase()
            .localeCompare(b.value.name.toLowerCase()) ||
          a.kind.localeCompare(b.kind) ||
          a.value.id.localeCompare(b.value.id),
      );

      if (!isCancelled) {
        setResults({
          items,
          randomizerSounds: new Map(randomizerEntries),
          unavailableCount: matchedSounds.length - soundItems.length,
        });
        setIsLoading(false);
      }
    }

    void load().catch((error: unknown) => {
      if (!isCancelled) {
        setLoadError(error instanceof Error ? error.message : String(error));
        setIsLoading(false);
      }
    });

    return () => {
      isCancelled = true;
    };
  }, [collections, executedQuery, retryCount, revision, sounds]);

  const availableWidth = Math.max(0, width - PAGE_PADDING * 2);
  const columnCount = Math.max(
    1,
    Math.floor((availableWidth + GRID_GAP) / (buttonSize + GRID_GAP)),
  );

  const routeToOrganizer = (kind: "collection" | "sound", id: string) => {
    router.push(`/organize/${kind}/${id}` as Href);
  };

  const routeToBulkOrganizer = () => {
    if (!selection || selection.ids.length === 0 || !selection.kind) return;
    if (selection.ids.length === 1) {
      routeToOrganizer(selection.kind, selection.ids[0]);
      return;
    }
    const ids = encodeURIComponent(selection.ids.join(","));
    router.push(
      `/organize/${selection.kind}/${selection.ids[0]}?ids=${ids}` as Href,
    );
  };

  const renderItem = (item: ResultItem) => {
    const isOtherKindSelected =
      isSelectionMode &&
      selection.ids.length > 0 &&
      selection.kind !== item.kind;
    if (item.kind === "sound") {
      return (
        <SoundButton
          accessibilityHint={
            isOtherKindSelected
              ? "Collections are selected. Turn off multiselect to select sounds."
              : undefined
          }
          isSelected={selectedIds.has(item.value.id)}
          isSelectionDisabled={isOtherKindSelected}
          listView={listView}
          onLongPress={
            isSelectionMode
              ? undefined
              : () => routeToOrganizer("sound", item.value.id)
          }
          onSelect={
            isSelectionMode
              ? () => selectItem("sound", item.value.id)
              : undefined
          }
          size={buttonSize}
          sound={item.playable}
        />
      );
    }
    return (
      <CollectionButton
        accessibilityHint={
          isOtherKindSelected
            ? "Sounds are selected. Turn off multiselect to select collections."
            : undefined
        }
        collection={item.value}
        isSelected={selectedIds.has(item.value.id)}
        isSelectionDisabled={isOtherKindSelected}
        listView={listView}
        onLongPress={() => routeToOrganizer("collection", item.value.id)}
        onOpen={() => {
          if (isSelectionMode) return;
          router.push(collectionHref(item.value.id));
        }}
        onSelect={
          isSelectionMode
            ? () => selectItem("collection", item.value.id)
            : undefined
        }
        playableSounds={results?.randomizerSounds.get(item.value.id) ?? []}
        size={buttonSize}
      />
    );
  };

  const renderBody = () => {
    if (loadError) {
      return (
        <View style={styles.centered}>
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
        </View>
      );
    }
    if (executedQuery === null) {
      return (
        <Text style={[styles.message, { color: colors.mutedText }]}>
          Search sounds and randomizers by name.
        </Text>
      );
    }
    if (isLoading || !results) {
      return (
        <View style={styles.centered}>
          <ActivityIndicator
            accessibilityLabel="Searching"
            color={colors.accent}
          />
        </View>
      );
    }
    return (
      <FlatList
        ListHeaderComponent={
          results.items.length === 0 ? (
            <Text style={[styles.message, { color: colors.mutedText }]}>
              No sounds or randomizers match “{executedQuery}”.
            </Text>
          ) : null
        }
        columnWrapperStyle={
          !listView && columnCount > 1 ? styles.row : undefined
        }
        contentContainerStyle={listView ? styles.list : styles.grid}
        data={results.items}
        key={`${listView ? "list" : "grid"}-${columnCount}`}
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => `${item.kind}:${item.value.id}`}
        numColumns={listView ? 1 : columnCount}
        renderItem={({ item }) => renderItem(item)}
      />
    );
  };

  const statusMessage =
    playbackError ??
    (results && results.unavailableCount > 0
      ? `${results.unavailableCount} sound file is unavailable.`
      : null);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, { color: colors.text }]}
        >
          SEARCH
        </Text>
        <View style={styles.headerActions}>
          <Pressable
            accessibilityLabel="Toggle list view"
            accessibilityRole="button"
            accessibilityState={{ selected: listView }}
            onPress={() => setListView(!listView)}
            style={({ pressed }) => [
              styles.headerButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              listView && { backgroundColor: colors.accent },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons
              color={colors.text}
              name={listView ? "grid-view" : "view-list"}
              size={28}
            />
          </Pressable>
          <Pressable
            accessibilityLabel="Toggle multiselect"
            accessibilityRole="button"
            accessibilityState={{ selected: isSelectionMode }}
            onPress={() =>
              setSelection((current) =>
                current ? null : { ids: [], kind: null },
              )
            }
            style={({ pressed }) => [
              styles.headerButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              isSelectionMode && { backgroundColor: colors.accent },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons color={colors.text} name="checklist" size={28} />
          </Pressable>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.headerButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons color={colors.text} name="close" size={28} />
          </Pressable>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search text"
          autoCapitalize="none"
          autoCorrect={false}
          autoFocus
          maxLength={80}
          onChangeText={setText}
          onSubmitEditing={runSearch}
          placeholder="Sound or randomizer name"
          placeholderTextColor={colors.mutedText}
          returnKeyType="search"
          style={[
            styles.input,
            {
              color: colors.text,
              borderColor: colors.border,
              backgroundColor: colors.surface,
            },
          ]}
          value={text}
        />
        <Pressable
          accessibilityLabel="Search"
          accessibilityRole="button"
          accessibilityState={{ disabled: !canSearch }}
          disabled={!canSearch}
          onPress={runSearch}
          style={({ pressed }) => [
            styles.searchButton,
            { borderColor: colors.border, backgroundColor: colors.accent },
            pressed && styles.pressed,
            !canSearch && styles.disabled,
          ]}
        >
          <MaterialIcons color={colors.text} name="search" size={30} />
        </Pressable>
      </View>

      {statusMessage ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[styles.error, { color: colors.text }]}
        >
          {statusMessage}
        </Text>
      ) : null}

      <View style={styles.body}>{renderBody()}</View>

      {isSelectionMode && selection.ids.length > 0 ? (
        <Pressable
          accessibilityRole="button"
          onPress={routeToBulkOrganizer}
          style={({ pressed }) => [
            styles.modifyButton,
            { backgroundColor: colors.accent, borderColor: colors.border },
            pressed && styles.pressed,
          ]}
        >
          <Text style={[styles.modifyLabel, { color: colors.text }]}>
            MODIFY {selection.ids.length}{" "}
            {selection.kind === "sound"
              ? selection.ids.length === 1
                ? "SOUND"
                : "SOUNDS"
              : selection.ids.length === 1
                ? "COLLECTION"
                : "COLLECTIONS"}
          </Text>
        </Pressable>
      ) : null}
      <StatusBar style={statusBarStyle} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    minHeight: 64,
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 8,
  },
  title: {
    flexShrink: 1,
    minWidth: 90,
    fontFamily: "Courier",
    fontSize: 22,
    fontWeight: "700",
  },
  headerActions: { flexDirection: "row", gap: 10 },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 2,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 8,
  },
  input: {
    flex: 1,
    minHeight: 52,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 2,
    fontSize: 17,
  },
  searchButton: {
    width: 52,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 3,
  },
  body: { flex: 1 },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: PAGE_PADDING,
  },
  message: { fontSize: 16, textAlign: "center", padding: PAGE_PADDING },
  retryButton: {
    minWidth: 132,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 6,
    borderWidth: 3,
  },
  retryLabel: { fontFamily: "Courier", fontSize: 16, fontWeight: "700" },
  error: {
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 8,
    fontSize: 15,
    textAlign: "center",
  },
  grid: { gap: GRID_GAP, padding: PAGE_PADDING },
  list: { gap: 10, padding: PAGE_PADDING },
  row: { justifyContent: "center", gap: GRID_GAP },
  modifyButton: {
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    marginHorizontal: PAGE_PADDING,
    marginBottom: 12,
    borderRadius: 4,
    borderWidth: 3,
  },
  modifyLabel: { fontFamily: "Courier", fontSize: 16, fontWeight: "700" },
  pressed: { opacity: 0.65 },
  disabled: { opacity: 0.42 },
});
