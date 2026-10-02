import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { type Href, Stack, useFocusEffect, useRouter } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    Animated,
    BackHandler,
    Easing,
    FlatList,
    Pressable,
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
const GRID_ACTIONS = {
  addCollection: { icon: "add", label: "Add new collection" },
  importSound: { icon: "audio-file", label: "Import sound" },
  settings: { icon: "settings", label: "Settings" },
} as const;

type GridAction = keyof typeof GRID_ACTIONS;

type GridItem =
  | { kind: "collection"; value: Collection }
  | { kind: "sound"; value: Sound; playable: PlayableSound }
  | { kind: "action"; action: GridAction };

type ReorderableGridItem = Extract<
  GridItem,
  { kind: "collection" } | { kind: "sound" }
>;

type ReorderSide = "left" | "right";

interface TileLayout {
  x: number;
  y: number;
}

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

interface CollectionHeaderActionsProps {
  collectionId: string;
  isReorderMode: boolean;
  isSelectionMode: boolean;
  listView: boolean;
  onClearSelection: () => void;
  onToggleListView: () => void;
  onToggleReorderMode: () => void;
  onToggleSelectionMode: () => void;
}

function CollectionHeaderActions({
  collectionId,
  isReorderMode,
  isSelectionMode,
  listView,
  onClearSelection,
  onToggleListView,
  onToggleReorderMode,
  onToggleSelectionMode,
}: CollectionHeaderActionsProps) {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <View style={styles.headerActions}>
      <Pressable
        accessibilityLabel="Toggle list view"
        accessibilityRole="button"
        accessibilityState={{ selected: listView }}
        onPress={onToggleListView}
        style={({ pressed }) => [
          styles.menuButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
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
        accessibilityLabel="Toggle reorder mode"
        accessibilityRole="button"
        accessibilityState={{ selected: isReorderMode }}
        onPress={onToggleReorderMode}
        style={({ pressed }) => [
          styles.menuButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
          isReorderMode && { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons
          color={colors.text}
          name="import-export"
          size={28}
          testID="reorder-toggle-icon"
        />
      </Pressable>
      <Pressable
        accessibilityLabel="Toggle multiselect"
        accessibilityRole="button"
        accessibilityState={{ selected: isSelectionMode }}
        onPress={onToggleSelectionMode}
        style={({ pressed }) => [
          styles.menuButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
          isSelectionMode && { backgroundColor: colors.accent },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons
          color={colors.text}
          name="checklist"
          size={28}
          testID="multiselect-icon"
        />
      </Pressable>
      <Pressable
        accessibilityLabel="Search"
        accessibilityRole="button"
        onPress={() => {
          onClearSelection();
          router.push("/search" as Href);
        }}
        style={({ pressed }) => [
          styles.menuButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons color={colors.text} name="search" size={28} />
      </Pressable>
      <Pressable
        accessibilityLabel="Open menu"
        accessibilityRole="button"
        onPress={() => {
          onClearSelection();
          router.push({
            pathname: "/menu",
            params: { collectionId },
          } as Href);
        }}
        style={({ pressed }) => [
          styles.menuButton,
          { borderColor: colors.border, backgroundColor: colors.surface },
          pressed && styles.pressed,
        ]}
      >
        <MaterialIcons color={colors.text} name="menu" size={28} />
      </Pressable>
    </View>
  );
}

export function CollectionScreen({ collectionId }: CollectionScreenProps) {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, statusBarStyle } = useTheme();
  const { error: playbackError } = usePlayback();
  const { collections, ordering, refresh, revision, sounds } =
    useRepositories();
  const { buttonSize, hideAssignedSoundsInMain, listView, setListView } =
    usePreferences();
  const [data, setData] = useState<CollectionData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [displayItems, setDisplayItems] = useState<readonly GridItem[]>([]);
  const [isReducedMotionEnabled, setIsReducedMotionEnabled] = useState(false);
  const [selection, setSelection] = useState<{
    ids: readonly string[];
    kind: "collection" | "sound" | null;
  } | null>(null);
  const [isReorderMode, setIsReorderMode] = useState(false);
  const hasLeftScreen = useRef(false);
  const isReorderSaving = useRef(false);
  const itemAnimations = useRef(new Map<string, Animated.ValueXY>());
  const itemLayouts = useRef(new Map<string, TileLayout>());
  const pendingPositionAnimation = useRef<Map<string, TileLayout> | null>(null);

  const isSelectionMode = selection !== null;
  const selectedIds = new Set(selection?.ids ?? []);

  const clearSelection = () => setSelection(null);

  const toggleSelectionMode = () => {
    setIsReorderMode(false);
    setSelection((current) => (current ? null : { ids: [], kind: null }));
  };

  const toggleReorderMode = () => {
    setSelection(null);
    setIsReorderMode((current) => !current);
  };

  const toggleListView = () => {
    pendingPositionAnimation.current = null;
    itemLayouts.current.clear();
    itemAnimations.current.forEach((animation) => {
      animation.stopAnimation();
      animation.setValue({ x: 0, y: 0 });
    });
    setListView(!listView);
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
    let isCancelled = false;

    async function load() {
      setLoadError(null);
      const [
        collection,
        ancestors,
        childCollections,
        directSounds,
        orderedChildIds,
      ] = await Promise.all([
        collections.getById(collectionId),
        collections.listAncestors(collectionId),
        collections.listChildren(collectionId),
        sounds.listByCollection(
          collectionId,
          collectionId === "main" && hideAssignedSoundsInMain,
        ),
        ordering.listOrderedChildIds(collectionId),
      ]);
      if (!collection) {
        throw new Error("Collection not found.");
      }

      const playableDirectSounds = directSounds
        .map((sound) => ({
          sound,
          playable: resolvePlayableSound(
            sound.id,
            sound.iconUri,
            sound.name,
            sound.mediaPath,
            sound.hideBorder,
          ),
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
                  resolvePlayableSound(
                    sound.id,
                    sound.iconUri,
                    sound.name,
                    sound.mediaPath,
                    sound.hideBorder,
                  ),
                )
                .filter((sound): sound is PlayableSound => sound !== null),
            ] as const;
          }),
      );

      if (!isCancelled) {
        const collectionsById = new Map(
          childCollections.map((value) => [value.id, value]),
        );
        const soundsById = new Map(
          playableDirectSounds.map((entry) => [entry.sound.id, entry]),
        );
        const orderedNonActionItems: GridItem[] = orderedChildIds
          .map((entry): GridItem | null => {
            if (entry.kind === "collection") {
              const value = collectionsById.get(entry.id);
              return value ? { kind: "collection", value } : null;
            }
            const soundEntry = soundsById.get(entry.id);
            return soundEntry
              ? {
                  kind: "sound",
                  value: soundEntry.sound,
                  playable: soundEntry.playable,
                }
              : null;
          })
          .filter((item): item is GridItem => item !== null);

        setData({
          ancestors,
          collection,
          items: [
            ...orderedNonActionItems,
            { kind: "action", action: "addCollection" },
            { kind: "action", action: "importSound" },
            ...(collection.id === "main"
              ? []
              : [{ kind: "action" as const, action: "settings" as const }]),
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
  }, [
    collectionId,
    collections,
    hideAssignedSoundsInMain,
    ordering,
    retryCount,
    revision,
    sounds,
  ]);

  useEffect(() => {
    let isMounted = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((isEnabled) => {
        if (isMounted) setIsReducedMotionEnabled(isEnabled);
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setIsReducedMotionEnabled,
    );

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    if (data) setDisplayItems(data.items);
  }, [data]);

  useEffect(() => {
    if (!isSelectionMode && !isReorderMode) return;
    const subscription = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        clearSelection();
        setIsReorderMode(false);
        return true;
      },
    );
    return () => subscription.remove();
  }, [isReorderMode, isSelectionMode]);

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

  const parentCollection = data.ancestors[data.ancestors.length - 1];

  const itemKey = (item: GridItem) =>
    item.kind === "action"
      ? `${item.kind}:${item.action}`
      : `${item.kind}:${item.value.id}`;

  const getItemAnimation = (key: string) => {
    const existing = itemAnimations.current.get(key);
    if (existing) return existing;
    const animation = new Animated.ValueXY({ x: 0, y: 0 });
    itemAnimations.current.set(key, animation);
    return animation;
  };

  const animatePendingLayout = (key: string, layout: TileLayout) => {
    const previousLayouts = pendingPositionAnimation.current;
    const previousLayout = previousLayouts?.get(key);
    itemLayouts.current.set(key, layout);
    if (!previousLayouts || !previousLayout) return;

    previousLayouts.delete(key);
    if (previousLayouts.size === 0) pendingPositionAnimation.current = null;

    const translateX = previousLayout.x - layout.x;
    const translateY = previousLayout.y - layout.y;
    if (translateX === 0 && translateY === 0) return;

    const animation = getItemAnimation(key);
    animation.stopAnimation();
    animation.setValue({ x: translateX, y: translateY });
    Animated.timing(animation, {
      toValue: { x: 0, y: 0 },
      duration: 240,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const handleReorder = async (
    item: ReorderableGridItem,
    side: ReorderSide,
    toEdge: boolean,
  ) => {
    if (isReorderSaving.current) return;
    const items = displayItems.filter(
      (candidate): candidate is ReorderableGridItem =>
        candidate.kind !== "action",
    );
    const actionItems = displayItems.filter(
      (candidate) => candidate.kind === "action",
    );
    if (items.length < 2) return;

    const currentIndex = items.findIndex(
      (candidate) =>
        candidate.kind === item.kind && candidate.value.id === item.value.id,
    );
    if (currentIndex < 0) return;

    const lastIndex = items.length - 1;
    const targetIndex = toEdge
      ? side === "left"
        ? 0
        : lastIndex
      : side === "left"
        ? currentIndex === 0
          ? lastIndex
          : currentIndex - 1
        : currentIndex === lastIndex
          ? 0
          : currentIndex + 1;
    if (targetIndex === currentIndex) return;

    const reordered = [...items];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);
    const orderedItems = reordered.map((entry) => ({
      id: entry.value.id,
      kind: entry.kind,
    }));

    isReorderSaving.current = true;
    pendingPositionAnimation.current = isReducedMotionEnabled
      ? null
      : new Map(itemLayouts.current);
    setDisplayItems([...reordered, ...actionItems]);

    try {
      await ordering.reorderChildren(collectionId, orderedItems);
    } catch {
      // Refresh below restores the database-backed order.
    } finally {
      isReorderSaving.current = false;
      refresh();
    }
  };

  const renderGridButtonContent = (item: GridItem) => {
    if (item.kind === "sound") {
      return (
        <SoundButton
          accessibilityHint={
            isSelectionMode &&
            selection.ids.length > 0 &&
            selection.kind !== "sound"
              ? "Collections are selected. Turn off multiselect to select sounds."
              : undefined
          }
          isSelected={selectedIds.has(item.value.id)}
          isSelectionDisabled={
            isSelectionMode &&
            selection.ids.length > 0 &&
            selection.kind !== "sound"
          }
          listView={listView}
          onLongPress={
            isSelectionMode || isReorderMode
              ? undefined
              : () => routeToOrganizer("sound", item.value.id)
          }
          onReorder={
            isReorderMode
              ? (side, toEdge) => void handleReorder(item, side, toEdge)
              : undefined
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
    if (item.kind === "collection") {
      return (
        <CollectionButton
          accessibilityHint={
            isSelectionMode &&
            selection.ids.length > 0 &&
            selection.kind !== "collection"
              ? "Sounds are selected. Turn off multiselect to select collections."
              : undefined
          }
          collection={item.value}
          isSelected={selectedIds.has(item.value.id)}
          isSelectionDisabled={
            isSelectionMode &&
            selection.ids.length > 0 &&
            selection.kind !== "collection"
          }
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
          onReorder={
            isReorderMode
              ? (side, toEdge) => void handleReorder(item, side, toEdge)
              : undefined
          }
          playableSounds={data?.randomizerSounds.get(item.value.id) ?? []}
          size={buttonSize}
        />
      );
    }
    const action = GRID_ACTIONS[item.action];
    const isDisabled = isSelectionMode || isReorderMode;
    const openAction = () => {
      if (item.action === "addCollection") {
        router.push({
          pathname: "/collections/create",
          params: { parentId: collectionId },
        } as Href);
      } else if (item.action === "importSound") {
        router.push(
          `/sounds/import?collectionId=${encodeURIComponent(collectionId)}` as Href,
        );
      } else {
        router.push(
          `/organize/collection/${collectionId}?openedFromSelf=1` as Href,
        );
      }
    };

    if (listView) {
      return (
        <Pressable
          accessibilityLabel={action.label}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={openAction}
          style={({ pressed }) => [
            styles.listAction,
            { borderColor: colors.border, backgroundColor: colors.surface },
            pressed && styles.pressed,
            isDisabled && styles.disabled,
          ]}
        >
          <View
            style={[styles.listActionIcon, { backgroundColor: colors.surface }]}
            testID="list-action-icon"
          >
            <MaterialIcons color={colors.text} name={action.icon} size={34} />
          </View>
          <Text style={[styles.listActionLabel, { color: colors.text }]}>
            {action.label}
          </Text>
        </Pressable>
      );
    }

    return (
      <View style={[styles.gridItem, { width: buttonSize }]}>
        <Pressable
          accessibilityLabel={action.label}
          accessibilityRole="button"
          accessibilityState={{ disabled: isDisabled }}
          disabled={isDisabled}
          onPress={openAction}
          style={({ pressed }) => [
            styles.actionButton,
            {
              width: buttonSize,
              height: buttonSize,
              backgroundColor: colors.surface,
              borderColor: colors.border,
              shadowColor: colors.shadow,
            },
            pressed && styles.actionButtonPressed,
            isDisabled && styles.disabled,
          ]}
        >
          <MaterialIcons
            color={colors.text}
            name={action.icon}
            size={Math.round(buttonSize * 0.46)}
          />
        </Pressable>
        <Text
          numberOfLines={2}
          style={[
            styles.gridItemLabel,
            { color: colors.text, maxWidth: buttonSize },
          ]}
        >
          {action.label}
        </Text>
      </View>
    );
  };

  const renderGridButton = (item: GridItem) => {
    const key = itemKey(item);
    const animation = getItemAnimation(key);
    return (
      <Animated.View
        onLayout={(event) =>
          animatePendingLayout(key, event.nativeEvent.layout)
        }
        style={{ transform: animation.getTranslateTransform() }}
      >
        {renderGridButtonContent(item)}
      </Animated.View>
    );
  };

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Stack.Screen
        options={{
          headerRight: () => (
            <CollectionHeaderActions
              collectionId={collectionId}
              isReorderMode={isReorderMode}
              isSelectionMode={isSelectionMode}
              listView={listView}
              onClearSelection={clearSelection}
              onToggleListView={toggleListView}
              onToggleReorderMode={toggleReorderMode}
              onToggleSelectionMode={toggleSelectionMode}
            />
          ),
        }}
      />
      <View style={styles.header}>
        <View style={styles.collectionNavigation}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[styles.title, { color: colors.text }]}
          >
            {data.collection.name.toUpperCase()}
          </Text>
          {parentCollection ? (
            <Pressable
              accessibilityLabel={`Go to parent collection ${parentCollection.name}`}
              accessibilityRole="button"
              onPress={() => {
                clearSelection();
                router.setParams({ collectionId: parentCollection.id });
              }}
              style={styles.parentButton}
            >
              <MaterialIcons
                color={colors.text}
                name="arrow-upward"
                size={20}
              />
              <Text
                numberOfLines={1}
                style={[styles.parentLabel, { color: colors.text }]}
              >
                {parentCollection.name}
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>

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
        ListHeaderComponent={
          displayItems.every((item) => item.kind === "action") ? (
            <Text style={[styles.empty, { color: colors.mutedText }]}>
              This collection is empty.
            </Text>
          ) : null
        }
        columnWrapperStyle={
          !listView && columnCount > 1 ? styles.row : undefined
        }
        contentContainerStyle={listView ? styles.list : styles.grid}
        data={displayItems}
        key={`${listView ? "list" : "grid"}-${columnCount}`}
        keyExtractor={itemKey}
        numColumns={listView ? 1 : columnCount}
        renderItem={({ item }) => renderGridButton(item)}
      />
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
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: PAGE_PADDING,
  },
  header: {
    gap: 8,
    paddingHorizontal: PAGE_PADDING,
    paddingVertical: 8,
  },
  title: {
    flex: 2,
    minWidth: 0,
    fontFamily: "Courier",
    fontSize: 22,
    fontWeight: "700",
  },
  collectionNavigation: {
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  parentButton: {
    flex: 1,
    minWidth: 0,
    minHeight: 40,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
  },
  parentLabel: {
    flexShrink: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "right",
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 4,
    borderWidth: 2,
  },
  headerActions: { flexDirection: "row", gap: 6 },
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
  disabled: { opacity: 0.42 },
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
  list: { gap: 10, padding: PAGE_PADDING },
  listAction: {
    width: "100%",
    minHeight: 60,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  listActionIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  listActionLabel: {
    flex: 1,
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
    paddingRight: 12,
    paddingVertical: 10,
  },
  gridItem: { alignItems: "center", gap: 8 },
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderRadius: 6,
    shadowOffset: { width: 6, height: 6 },
    shadowOpacity: 1,
    shadowRadius: 0,
    elevation: 6,
  },
  actionButtonPressed: {
    transform: [{ translateX: 4 }, { translateY: 4 }],
    shadowOffset: { width: 2, height: 2 },
    elevation: 2,
  },
  gridItemLabel: {
    minHeight: 40,
    fontFamily: "Courier",
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  empty: { fontSize: 16, textAlign: "center" },
  row: { justifyContent: "center", gap: GRID_GAP },
});
