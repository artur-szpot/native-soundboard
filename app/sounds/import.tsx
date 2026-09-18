import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
    AccessibilityInfo,
    ActivityIndicator,
    Animated,
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
    type NativeScrollEvent,
    type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import {
    audioMediaService,
    isSupportedAudioFilename,
    type PickedAudio,
} from "../../src/media/AudioMediaService";
import { pickDirectoryMediaFiles } from "../../src/media/DirectoryMediaPicker";
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

const REMOVE_ANIMATION_DURATION = 180;

function nameFromFilename(filename: string): string {
  const extensionIndex = filename.lastIndexOf(".");
  return extensionIndex > 0 ? filename.slice(0, extensionIndex) : filename;
}

interface AudioReviewItem {
  id: string;
  asset: PickedAudio;
  name: string;
}

export default function ImportSoundRoute() {
  const { collectionId = "main" } = useLocalSearchParams<{
    collectionId?: string;
  }>();
  const router = useRouter();
  const { refresh, sounds } = useRepositories();
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);
  const nameInputRefs = useRef<Array<TextInput | null>>([]);
  const focusedInputIndexRef = useRef<number | null>(null);
  const keyboardTopRef = useRef<number | null>(null);
  const reduceMotionRef = useRef(true);
  const reviewItemOpacitiesRef = useRef(new Map<string, Animated.Value>());
  const scrollOffsetRef = useRef(0);
  const [reviewItems, setReviewItems] = useState<readonly AudioReviewItem[]>(
    [],
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);

  const setAudioReviewItems = (assets: readonly PickedAudio[]) => {
    reviewItemOpacitiesRef.current.clear();
    setReviewItems(
      assets.map((asset, index) => ({
        id: `${asset.uri}-${index}`,
        asset,
        name: nameFromFilename(asset.name),
      })),
    );
  };

  const chooseAudio = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: Platform.OS !== "android",
        multiple: true,
        type: AUDIO_TYPES,
      });
      if (result.canceled) return;

      setAudioReviewItems(result.assets);
    } catch (pickerError: unknown) {
      setError(
        pickerError instanceof Error
          ? pickerError.message
          : String(pickerError),
      );
    }
  };

  const chooseAudioDirectory = async () => {
    setIsLoadingDirectory(true);
    try {
      const assets = await pickDirectoryMediaFiles(isSupportedAudioFilename);
      if (assets === null) return;
      if (assets.length === 0) {
        setError("No supported audio files were found in that directory.");
        return;
      }

      setError(null);
      setAudioReviewItems(assets);
    } catch (pickerError: unknown) {
      setError(
        pickerError instanceof Error
          ? pickerError.message
          : String(pickerError),
      );
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  const importSound = async () => {
    if (reviewItems.length === 0) return;
    setError(null);
    setIsSaving(true);

    const failedItems: AudioReviewItem[] = [];
    const failureMessages: string[] = [];
    let retainedCount = 0;

    for (const item of reviewItems) {
      let mediaPath: string | null = null;
      let soundId: string | null = null;

      try {
        const imported = await audioMediaService.import(item.asset);
        mediaPath = imported.mediaPath;
        const sound = await sounds.create(
          item.name,
          imported.mediaPath,
          item.asset.name,
        );
        soundId = sound.id;
        if (collectionId !== "main") {
          await sounds.setMembership(sound.id, collectionId, true);
        }
        retainedCount += 1;
      } catch (importError: unknown) {
        let canRemoveMedia = soundId === null;
        let canRetry = true;
        if (soundId) {
          try {
            await sounds.delete(soundId);
            canRemoveMedia = true;
          } catch {
            canRetry = false;
            retainedCount += 1;
            failureMessages.push(
              `${item.asset.name}: Import failed and cleanup could not complete. The sound remains in Main.`,
            );
          }
        }
        if (mediaPath && canRemoveMedia) {
          try {
            audioMediaService.remove(mediaPath);
          } catch {
            // Startup orphan cleanup retries removal.
          }
        }
        if (canRetry) {
          failedItems.push(item);
          failureMessages.push(
            `${item.asset.name}: ${
              importError instanceof Error
                ? importError.message
                : String(importError)
            }`,
          );
        }
      }
    }

    if (retainedCount > 0) refresh();
    if (failureMessages.length === 0) {
      router.dismissAll();
      router.replace(collectionHref(collectionId));
    } else {
      setReviewItems(failedItems);
      setError(failureMessages.join("\n"));
    }
    setIsSaving(false);
  };

  const updateName = (index: number, name: string) => {
    setReviewItems((items) =>
      items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, name } : item,
      ),
    );
  };

  const removeReviewItem = (index: number, itemId: string) => {
    nameInputRefs.current.splice(index, 1);
    if (focusedInputIndexRef.current === index) {
      focusedInputIndexRef.current = null;
      Keyboard.dismiss();
    } else if (
      focusedInputIndexRef.current !== null &&
      focusedInputIndexRef.current > index
    ) {
      focusedInputIndexRef.current -= 1;
    }
    reviewItemOpacitiesRef.current.delete(itemId);
    setReviewItems((items) =>
      items.filter((_item, itemIndex) => itemIndex !== index),
    );
    setError(null);
  };

  const getReviewItemOpacity = (itemId: string) => {
    let opacity = reviewItemOpacitiesRef.current.get(itemId);
    if (!opacity) {
      opacity = new Animated.Value(1);
      reviewItemOpacitiesRef.current.set(itemId, opacity);
    }
    return opacity;
  };

  const animateReviewItemRemoval = (index: number, itemId: string) => {
    if (reduceMotionRef.current) {
      removeReviewItem(index, itemId);
      return;
    }

    const opacity = getReviewItemOpacity(itemId);
    setRemovingItemId(itemId);
    Animated.timing(opacity, {
      duration: REMOVE_ANIMATION_DURATION,
      easing: undefined,
      toValue: 0,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        removeReviewItem(index, itemId);
      } else {
        opacity.setValue(1);
      }
      setRemovingItemId(null);
    });
  };

  const ensureFocusedInputVisible = (keyboardTop?: number) => {
    const focusedIndex = focusedInputIndexRef.current;
    const input =
      focusedIndex === null ? null : nameInputRefs.current[focusedIndex];
    const resolvedKeyboardTop =
      keyboardTop ?? keyboardTopRef.current ?? Keyboard.metrics()?.screenY;
    if (!input || resolvedKeyboardTop === undefined) return;

    input.measureInWindow((_x, inputTop, _width, inputHeight) => {
      const overlap = inputTop + inputHeight + 24 - resolvedKeyboardTop;
      if (overlap <= 0) return;
      scrollViewRef.current?.scrollTo({
        animated: true,
        y: scrollOffsetRef.current + overlap,
      });
    });
  };

  useEffect(() => {
    const showSubscription = Keyboard.addListener(
      "keyboardDidShow",
      (event) => {
        keyboardTopRef.current = event.endCoordinates.screenY;
        requestAnimationFrame(() => {
          ensureFocusedInputVisible(event.endCoordinates.screenY);
        });
      },
    );
    const hideSubscription = Keyboard.addListener("keyboardDidHide", () => {
      keyboardTopRef.current = null;
    });
    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((isEnabled) => {
      if (isMounted) reduceMotionRef.current = isEnabled;
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (isEnabled) => {
        reduceMotionRef.current = isEnabled;
      },
    );
    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleInputFocus = (index: number) => {
    focusedInputIndexRef.current = index;
    ensureFocusedInputVisible();
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    scrollOffsetRef.current = event.nativeEvent.contentOffset.y;
  };

  const handleViewportLayout = () => {
    if (
      focusedInputIndexRef.current === null ||
      keyboardTopRef.current === null
    ) {
      return;
    }
    requestAnimationFrame(() => ensureFocusedInputVisible());
  };

  const isImportDisabled =
    isSaving ||
    isLoadingDirectory ||
    removingItemId !== null ||
    reviewItems.length === 0 ||
    reviewItems.some((item) => !item.name.trim());

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
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardRegion}
        testID="import-keyboard-region"
      >
        <ScrollView
          contentContainerStyle={styles.form}
          keyboardShouldPersistTaps="handled"
          onLayout={handleViewportLayout}
          onScroll={handleScroll}
          ref={scrollViewRef}
          scrollEventThrottle={16}
          testID="import-scroll-view"
        >
          <Pressable
            accessibilityLabel={
              reviewItems.length > 0
                ? "Change selected audio files"
                : "Choose audio files"
            }
            accessibilityRole="button"
            disabled={isSaving || isLoadingDirectory || removingItemId !== null}
            onPress={chooseAudio}
            style={[
              styles.fileButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
            ]}
          >
            <MaterialIcons color={colors.text} name="folder-open" size={26} />
            <Text style={[styles.fileLabel, { color: colors.text }]}>
              {reviewItems.length > 0
                ? "CHANGE SELECTED FILES"
                : "CHOOSE AUDIO FILES"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Choose audio directory"
            accessibilityRole="button"
            disabled={isSaving || isLoadingDirectory || removingItemId !== null}
            onPress={() => void chooseAudioDirectory()}
            style={[
              styles.fileButton,
              { borderColor: colors.border, backgroundColor: colors.surface },
              (isSaving || isLoadingDirectory || removingItemId !== null) &&
                styles.disabled,
            ]}
          >
            <MaterialIcons color={colors.text} name="folder" size={26} />
            <Text style={[styles.fileLabel, { color: colors.text }]}>
              CHOOSE DIRECTORY
            </Text>
          </Pressable>
          <Text style={[styles.help, { color: colors.mutedText }]}>
            MP3, M4A, AAC, WAV, or OGG. Maximum 10 MB and one minute each.
          </Text>
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
                accessibilityLabel="Loading audio directory"
                color={colors.accent}
                size="large"
              />
              <Text style={[styles.loadingLabel, { color: colors.text }]}>
                LOADING FILES...
              </Text>
            </View>
          ) : null}
          {reviewItems.map((item, index) => (
            <Animated.View
              key={item.id}
              style={[
                styles.reviewItem,
                { opacity: getReviewItemOpacity(item.id) },
              ]}
            >
              <View style={styles.selectedFileHeader}>
                <MaterialIcons
                  color={colors.mutedText}
                  name="audio-file"
                  size={22}
                />
                <Text
                  accessibilityRole="header"
                  style={[styles.selectedFileLabel, { color: colors.text }]}
                >
                  {item.asset.name}
                </Text>
                <Pressable
                  accessibilityLabel={`Remove ${item.asset.name}`}
                  accessibilityRole="button"
                  disabled={
                    isSaving || isLoadingDirectory || removingItemId !== null
                  }
                  onPress={() => animateReviewItemRemoval(index, item.id)}
                  style={({ pressed }) => [
                    styles.removeFileButton,
                    pressed && styles.pressed,
                    (isSaving ||
                      isLoadingDirectory ||
                      removingItemId !== null) &&
                      styles.disabled,
                  ]}
                >
                  <MaterialIcons color={colors.text} name="close" size={24} />
                </Pressable>
              </View>
              <Text style={[styles.label, { color: colors.text }]}>NAME</Text>
              <TextInput
                accessibilityLabel={`Sound name for ${item.asset.name}`}
                editable={!isSaving && !isLoadingDirectory}
                maxLength={80}
                onChangeText={(name) => updateName(index, name)}
                onFocus={() => handleInputFocus(index)}
                placeholder="Sound name"
                placeholderTextColor={colors.mutedText}
                ref={(input) => {
                  nameInputRefs.current[index] = input;
                }}
                style={[
                  styles.input,
                  {
                    color: colors.text,
                    borderColor: colors.border,
                    backgroundColor: colors.surface,
                  },
                ]}
                value={item.name}
              />
            </Animated.View>
          ))}
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
            accessibilityState={{ disabled: isImportDisabled }}
            disabled={isImportDisabled}
            onPress={() => void importSound()}
            style={[
              styles.saveButton,
              { borderColor: colors.border, backgroundColor: colors.accent },
              isImportDisabled && styles.disabled,
            ]}
          >
            <Text style={[styles.saveLabel, { color: colors.text }]}>
              {isSaving ? "IMPORTING..." : "IMPORT"}
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
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
  keyboardRegion: { flex: 1 },
  form: { gap: 14, padding: 20, paddingBottom: 40 },
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
  reviewItem: { gap: 8 },
  selectedFileHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
  },
  selectedFileLabel: {
    flex: 1,
    fontFamily: "Courier",
    fontSize: 17,
    fontWeight: "700",
  },
  removeFileButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
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
  pressed: { opacity: 0.62 },
  disabled: { opacity: 0.42 },
});
