import {
    fireEvent,
    render,
    waitFor,
    within,
} from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SoundboardScreen from "../app/index";
import type { Collection, Sound } from "../src/domain/models";
import { CollectionScreen } from "../src/screens/CollectionScreen";
import { ThemeProvider } from "../src/theme/ThemeProvider";

const mockPlay = jest.fn();
const mockPlayRandomizer = jest.fn();
const mockPush = jest.fn();
const mockNavigate = jest.fn();
const mockPreferences = {
  buttonSize: 132 as const,
  decreaseButtonSize: jest.fn(),
  hideAssignedSoundsInMain: true,
  increaseButtonSize: jest.fn(),
  setHideAssignedSoundsInMain: jest.fn(),
  setThemePreference: jest.fn(),
  themePreference: "system" as const,
};
let mockActiveSoundId: string | null = null;
let mockActiveRandomizerId: string | null = null;
let mockPlaybackDuration = 0;
let mockPlaybackProgress = 0;
const mockMain: Collection = {
  id: "main",
  name: "Main",
  role: "directory",
  iconUri: null,
  hideBorder: false,
  parentId: null,
  createdAt: 1,
  updatedAt: 1,
};
const mockFavorites: Collection = {
  ...mockMain,
  id: "favorites",
  name: "Favorites",
  parentId: "main",
};
const mockSurprise: Collection = {
  ...mockMain,
  id: "surprise-me",
  name: "Surprise Me",
  role: "randomizer",
  parentId: "main",
};
const mockStarterSounds: Sound[] = [
  {
    id: "bloom",
    name: "Bloom",
    mediaPath: "bundled:bloom",
    iconUri: null,
    hideBorder: false,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "click",
    name: "Click",
    mediaPath: "bundled:click",
    iconUri: null,
    hideBorder: false,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "rise",
    name: "Rise",
    mediaPath: "bundled:rise",
    iconUri: null,
    hideBorder: false,
    createdAt: 1,
    updatedAt: 1,
  },
  {
    id: "low",
    name: "Low",
    mediaPath: "bundled:low",
    iconUri: null,
    hideBorder: false,
    createdAt: 1,
    updatedAt: 1,
  },
];
let mockCurrentCollection: Collection = mockMain;
let mockAncestors: readonly Collection[] = [];
let mockChildren: readonly Collection[] = [mockFavorites, mockSurprise];
let mockDirectSounds: readonly Sound[] = mockStarterSounds;
let mockRandomizerSounds: readonly Sound[] = [mockStarterSounds[0]];
const mockCollections = {
  getById: jest.fn(async () => mockCurrentCollection),
  listAncestors: jest.fn(async () => mockAncestors),
  listChildren: jest.fn(async () => mockChildren),
  listPlayableSounds: jest.fn(async () => mockRandomizerSounds),
};
const mockSounds = {
  listByCollection: jest.fn(async () => mockDirectSounds),
};

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
  useRouter: () => ({ navigate: mockNavigate, push: mockPush }),
}));
jest.mock("../src/settings/PreferencesProvider", () => ({
  BUTTON_SIZES: [64, 80, 96, 112, 132, 184],
  usePreferences: () => mockPreferences,
}));
jest.mock("../src/playback/PlaybackProvider", () => ({
  usePlayback: () => ({
    activeRandomizerId: mockActiveRandomizerId,
    activeSoundId: mockActiveSoundId,
    error: null,
    isBusy: mockActiveSoundId !== null,
    playbackDuration: mockPlaybackDuration,
    playbackProgress: mockPlaybackProgress,
    play: mockPlay,
    playRandomizer: mockPlayRandomizer,
  }),
}));
jest.mock("../src/repositories/RepositoryProvider", () => ({
  useRepositories: () => ({
    collections: mockCollections,
    revision: 0,
    sounds: mockSounds,
  }),
}));

function renderScreen() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider>
        <SoundboardScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

function renderCollection(collectionId: string) {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider>
        <CollectionScreen collectionId={collectionId} />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe("SoundboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveRandomizerId = null;
    mockActiveSoundId = null;
    mockPlaybackDuration = 0;
    mockPlaybackProgress = 0;
    mockCurrentCollection = mockMain;
    mockAncestors = [];
    mockChildren = [mockFavorites, mockSurprise];
    mockDirectSounds = mockStarterSounds;
    mockRandomizerSounds = [mockStarterSounds[0]];
  });

  it("renders and plays each bundled starter sound", async () => {
    const screen = await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("Favorites")).toBeOnTheScreen(),
    );
    expect(
      screen.getAllByRole("button", { name: /^Play (Bloom|Click|Rise|Low)$/ }),
    ).toHaveLength(4);
    await fireEvent.press(screen.getByRole("button", { name: "Play Bloom" }));

    expect(mockPlay).toHaveBeenCalledWith("bloom", expect.any(Number));
    expect(mockSounds.listByCollection).toHaveBeenCalledWith("main", true);
  });

  it("disables every sound button while one sound is playing", async () => {
    jest.useFakeTimers();
    mockActiveSoundId = "bloom";
    mockPlaybackDuration = 10;
    mockPlaybackProgress = 0.4;
    const screen = await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("Favorites")).toBeOnTheScreen(),
    );
    for (const button of screen.getAllByRole("button", {
      name: /^Play (Bloom|Click|Rise|Low)$/,
    })) {
      expect(button).toBeDisabled();
    }
    expect(screen.getByTestId("sound-icon-bloom")).toHaveProp(
      "name",
      "play-arrow",
    );
    expect(screen.getByTestId("playback-progress-overlay").parent).toHaveStyle({
      height: 126,
      left: 0,
      position: "absolute",
      top: 0,
      width: 126,
    });
    expect(screen.getByRole("button", { name: "Play Bloom" })).toHaveProp(
      "accessibilityValue",
      { max: 100, min: 0, now: 40, text: "40% played" },
    );
    screen.unmount();
    jest.useRealTimers();
  });

  it("opens the menu from the header", async () => {
    const screen = await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("Favorites")).toBeOnTheScreen(),
    );
    expect(
      screen.queryByRole("button", { name: "Settings" }),
    ).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Button size")).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Theme")).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Open menu" }));

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/menu",
      params: { collectionId: "main" },
    });
  });

  it("opens directories and plays randomizers", async () => {
    const screen = await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("Favorites")).toBeOnTheScreen(),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Open directory Favorites" }),
    );
    const directory = screen.getByRole("button", {
      name: "Open directory Favorites",
    });
    const randomizer = screen.getByRole("button", {
      name: "Play randomizer Surprise Me",
    });
    expect(directory).toHaveStyle({ backgroundColor: "#F3C969" });
    expect(randomizer).toHaveStyle({ backgroundColor: "#F3C969" });
    expect(screen.getByTestId("directory-icon-favorites")).toHaveProp(
      "size",
      Math.round(Math.round(132 * 0.72) * 0.84),
    );
    expect(screen.getByTestId("randomizer-icon-surprise-me")).toHaveProp(
      "name",
      "shuffle",
    );
    expect(screen.getByTestId("randomizer-icon-surprise-me")).toHaveProp(
      "size",
      Math.round(132 * 0.72),
    );

    await fireEvent.press(directory);
    await fireEvent.press(randomizer);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/collections/[collectionId]",
      params: { collectionId: "favorites" },
    });
    expect(mockPlayRandomizer).toHaveBeenCalledWith(
      "surprise-me",
      expect.arrayContaining([expect.objectContaining({ id: "bloom" })]),
    );
  });

  it("shows sound progress on the randomizer that started playback", async () => {
    jest.useFakeTimers();
    mockActiveRandomizerId = "surprise-me";
    mockActiveSoundId = "bloom";
    mockPlaybackDuration = 8;
    mockPlaybackProgress = 0.25;
    const screen = await renderScreen();

    const randomizer = await screen.findByRole("button", {
      name: "Play randomizer Surprise Me",
    });

    expect(randomizer).toHaveStyle({ backgroundColor: "#F3B63F" });
    expect(randomizer).not.toHaveStyle({ opacity: 0.42 });
    expect(randomizer).toHaveProp("accessibilityValue", {
      max: 100,
      min: 0,
      now: 25,
      text: "25% played",
    });
    expect(screen.getByTestId("randomizer-icon-surprise-me")).toHaveProp(
      "name",
      "shuffle",
    );
    expect(
      within(randomizer).getByTestId("playback-progress-overlay"),
    ).toBeOnTheScreen();
    screen.unmount();
    jest.useRealTimers();
  });

  it("keeps image tile geometry while visually hiding its border", async () => {
    mockChildren = [
      {
        ...mockFavorites,
        hideBorder: true,
        iconUri: "file:///favorites.png",
      },
    ];
    const screen = await renderScreen();

    const directory = await screen.findByRole("button", {
      name: "Open directory Favorites",
    });

    expect(directory).toHaveStyle({
      backgroundColor: "#F2EFE8",
      borderColor: "#F2EFE8",
      borderWidth: 3,
    });
  });

  it("keeps sound tile geometry while visually hiding its image border", async () => {
    mockDirectSounds = [
      {
        ...mockStarterSounds[0],
        hideBorder: true,
        iconUri: "file:///bloom.png",
      },
    ];
    const screen = await renderScreen();

    const sound = await screen.findByRole("button", { name: "Play Bloom" });
    expect(sound).toHaveStyle({
      backgroundColor: "#F2EFE8",
      borderColor: "#F2EFE8",
      borderWidth: 3,
    });
  });

  it("shows collection actions last and opens their active-collection routes", async () => {
    mockCurrentCollection = mockFavorites;
    const screen = await renderCollection("favorites");

    const addButton = await screen.findByRole("button", {
      name: "Add new collection",
    });
    const importButton = screen.getByRole("button", { name: "Import sound" });
    const settingsButton = screen.getByRole("button", { name: "Settings" });
    const buttons = screen.getAllByRole("button");
    expect(buttons.slice(-3)).toEqual([
      addButton,
      importButton,
      settingsButton,
    ]);

    await fireEvent.press(addButton);
    await fireEvent.press(importButton);
    await fireEvent.press(settingsButton);

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/collections/create",
      params: { parentId: "favorites" },
    });
    expect(mockPush).toHaveBeenCalledWith(
      "/sounds/import?collectionId=favorites",
    );
    expect(mockPush).toHaveBeenCalledWith("/organize/collection/favorites");
  });

  it("exposes organization as an accessibility action", async () => {
    const screen = await renderScreen();

    await waitFor(() =>
      expect(screen.getByText("Favorites")).toBeOnTheScreen(),
    );
    fireEvent(
      screen.getByRole("button", { name: "Open directory Favorites" }),
      "accessibilityAction",
      { nativeEvent: { actionName: "longpress" } },
    );

    expect(mockPush).toHaveBeenCalledWith("/organize/collection/favorites");
  });

  it("shows breadcrumbs in nested directories and navigates to Main", async () => {
    mockCurrentCollection = mockFavorites;
    mockAncestors = [mockMain];
    mockChildren = [];
    mockDirectSounds = [];
    const screen = await renderCollection("favorites");

    await screen.findByRole("button", { name: "Add new collection" });
    expect(screen.getByText("This collection is empty.")).toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("link", { name: "Main" }));

    expect(mockNavigate).toHaveBeenCalledWith("/");
    expect(mockSounds.listByCollection).toHaveBeenCalledWith(
      "favorites",
      false,
    );
  });

  it("keeps an empty randomizer available for hold-to-open navigation", async () => {
    mockRandomizerSounds = [];
    const screen = await renderScreen();

    const randomizer = await screen.findByRole("button", {
      name: "Play randomizer Surprise Me",
    });
    expect(randomizer).toHaveProp(
      "accessibilityHint",
      "This randomizer has no playable sounds. Hold to open the collection",
    );
    await fireEvent.press(randomizer);
    fireEvent(randomizer, "longPress");

    expect(mockPlayRandomizer).not.toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/collections/[collectionId]",
      params: { collectionId: "surprise-me" },
    });
  });

  it("selects sounds without playing, disables collections, and opens bulk editing", async () => {
    const screen = await renderScreen();

    await screen.findByText("Favorites");
    await fireEvent.press(
      screen.getByRole("button", { name: "Toggle multiselect" }),
    );

    expect(
      screen.getByRole("button", { name: "Add new collection" }),
    ).toBeDisabled();
    const sound = screen.getByRole("button", { name: "Play Bloom" });
    const collection = screen.getByRole("button", {
      name: "Open directory Favorites",
    });

    await fireEvent.press(sound);

    expect(mockPlay).not.toHaveBeenCalled();
    expect(sound).toHaveProp("accessibilityState", {
      disabled: false,
      selected: true,
    });
    expect(sound).toHaveStyle({ borderColor: "#E74E36", borderWidth: 5 });
    expect(collection).toBeDisabled();
    expect(screen.getByText("MODIFY 1 SOUND")).toBeOnTheScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "MODIFY 1 SOUND" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/organize/sound/bloom");

    await fireEvent.press(
      screen.getByRole("button", { name: "Toggle multiselect" }),
    );
    expect(screen.queryByText("MODIFY 1 SOUND")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Open directory Favorites" }),
    ).not.toBeDisabled();
  });

  it("keeps an incompatible collection tile disabled without pressed feedback", async () => {
    const screen = await renderScreen();

    await screen.findByText("Favorites");
    await fireEvent.press(
      screen.getByRole("button", { name: "Toggle multiselect" }),
    );
    const sound = screen.getByRole("button", { name: "Play Bloom" });
    const collection = screen.getByRole("button", {
      name: "Open directory Favorites",
    });
    await fireEvent.press(sound);

    expect(collection).toBeDisabled();

    expect(mockPlay).not.toHaveBeenCalled();
    expect(screen.getByText("MODIFY 1 SOUND")).toBeOnTheScreen();
  });

  it("keeps an empty randomizer enabled during multiselect", async () => {
    mockRandomizerSounds = [];
    const screen = await renderScreen();

    await screen.findByText("Favorites");
    await fireEvent.press(
      screen.getByRole("button", { name: "Toggle multiselect" }),
    );
    const randomizer = screen.getByRole("button", {
      name: "Play randomizer Surprise Me",
    });

    expect(randomizer).not.toBeDisabled();
    await fireEvent.press(randomizer);

    expect(randomizer).toHaveProp("accessibilityState", {
      disabled: false,
      selected: true,
    });
    expect(randomizer).not.toHaveStyle({ opacity: 0.42 });
    expect(screen.getByText("MODIFY 1 COLLECTION")).toBeOnTheScreen();
  });
});
