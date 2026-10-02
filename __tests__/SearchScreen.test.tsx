import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SearchRoute from "../app/search";
import type { Collection, Sound } from "../src/domain/models";
import { ThemeProvider } from "../src/theme/ThemeProvider";

const mockPlay = jest.fn();
const mockPlayRandomizer = jest.fn();
const mockPush = jest.fn();
const mockBack = jest.fn();
const mockPreferences = {
  buttonSize: 132 as const,
  listView: false,
  setListView: jest.fn(),
};
const baseCollection: Collection = {
  id: "main",
  name: "Main",
  role: "directory",
  iconUri: null,
  hideBorder: false,
  parentId: null,
  order: 0,
  createdAt: 1,
  updatedAt: 1,
};
const baseSound: Sound = {
  id: "bloom",
  name: "Bloom",
  mediaPath: "bundled:bloom",
  iconUri: null,
  hideBorder: false,
  createdAt: 1,
  updatedAt: 1,
};
const mockAllCollections: Collection[] = [
  { ...baseCollection, name: "Main Loom" },
  { ...baseCollection, id: "loom-dir", name: "Loom Folder", parentId: "main" },
  {
    ...baseCollection,
    id: "loomy",
    name: "LOOMY Mix",
    role: "randomizer",
    parentId: "main",
  },
  {
    ...baseCollection,
    id: "other",
    name: "Other Mix",
    role: "randomizer",
    parentId: "main",
  },
];
const mockAllSounds: Sound[] = [
  baseSound,
  { ...baseSound, id: "click", name: "Click", mediaPath: "bundled:click" },
  { ...baseSound, id: "low", name: "Low", mediaPath: "bundled:low" },
];
const mockCollections = {
  listAll: jest.fn(async () => mockAllCollections),
  listPlayableSounds: jest.fn(async () => [baseSound]),
};
const mockSounds = {
  listAll: jest.fn(async () => mockAllSounds),
};

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock("../src/settings/PreferencesProvider", () => ({
  usePreferences: () => mockPreferences,
}));
jest.mock("../src/playback/PlaybackProvider", () => ({
  usePlayback: () => ({
    activeRandomizerId: null,
    activeSoundId: null,
    error: null,
    isBusy: false,
    playbackDuration: 0,
    playbackProgress: 0,
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

function renderSearch() {
  return render(
    <SafeAreaProvider
      initialMetrics={{
        frame: { x: 0, y: 0, width: 390, height: 844 },
        insets: { top: 47, right: 0, bottom: 34, left: 0 },
      }}
    >
      <ThemeProvider>
        <SearchRoute />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

const resultLabels = (screen: Awaited<ReturnType<typeof renderSearch>>) =>
  screen
    .getAllByRole("button")
    .map((button) => button.props.accessibilityLabel as string | undefined)
    .filter(
      (label): label is string =>
        !!label && /^(Play|Open directory) /.test(label),
    );

describe("SearchRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPreferences.listView = false;
  });

  it("enables search only for new, non-blank text", async () => {
    const screen = await renderSearch();
    const input = screen.getByLabelText("Search text");
    const button = screen.getByRole("button", { name: "Search" });

    expect(button).toBeDisabled();
    await fireEvent.changeText(input, "   ");
    expect(button).toBeDisabled();
    await fireEvent.changeText(input, " loom ");
    expect(button).toBeEnabled();

    await fireEvent.press(button);
    await screen.findByRole("button", { name: "Play randomizer LOOMY Mix" });
    expect(button).toBeDisabled();
    await fireEvent.changeText(input, "loom");
    expect(button).toBeDisabled();
    await fireEvent.changeText(input, "loo");
    expect(button).toBeEnabled();
  });

  it("finds sounds and randomizers case-insensitively in mixed name order", async () => {
    const screen = await renderSearch();

    await fireEvent.changeText(screen.getByLabelText("Search text"), "LO");
    await fireEvent(screen.getByLabelText("Search text"), "submitEditing");

    await screen.findByRole("button", { name: "Play Low" });
    expect(resultLabels(screen)).toEqual([
      "Play Bloom",
      "Play randomizer LOOMY Mix",
      "Play Low",
    ]);
  });

  it("shows an empty state when nothing matches", async () => {
    const screen = await renderSearch();

    await fireEvent.changeText(screen.getByLabelText("Search text"), "zzz");
    await fireEvent.press(screen.getByRole("button", { name: "Search" }));

    expect(
      await screen.findByText("No sounds or randomizers match “zzz”."),
    ).toBeOnTheScreen();
  });

  it("keeps list mode neutral and uses the checklist multiselect icon", async () => {
    mockPreferences.listView = true;
    const screen = await renderSearch();
    const listToggle = screen.getByRole("button", {
      name: "Toggle list view",
    });

    expect(listToggle).toHaveProp("accessibilityState", { selected: true });
    expect(listToggle).toHaveStyle({ backgroundColor: "#FFFDF8" });
    expect(screen.getByTestId("multiselect-icon")).toHaveProp(
      "name",
      "checklist",
    );
  });

  it("plays and edits results like a collection view", async () => {
    const screen = await renderSearch();

    await fireEvent.changeText(screen.getByLabelText("Search text"), "o");
    await fireEvent.press(screen.getByRole("button", { name: "Search" }));
    const bloom = await screen.findByRole("button", { name: "Play Bloom" });
    const randomizer = screen.getByRole("button", {
      name: "Play randomizer LOOMY Mix",
    });

    await fireEvent.press(bloom);
    await fireEvent.press(randomizer);
    await fireEvent(bloom, "longPress");
    await fireEvent(randomizer, "longPress");

    expect(mockPlay).toHaveBeenCalledWith("bloom", expect.any(Number));
    expect(mockPlayRandomizer).toHaveBeenCalledWith(
      "loomy",
      expect.arrayContaining([expect.objectContaining({ id: "bloom" })]),
    );
    expect(mockPush).toHaveBeenCalledWith("/organize/sound/bloom");
    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/collections/[collectionId]",
      params: { collectionId: "loomy" },
    });
  });

  it("toggles list view and bulk-modifies selected sounds", async () => {
    const screen = await renderSearch();

    await fireEvent.changeText(screen.getByLabelText("Search text"), "o");
    await fireEvent.press(screen.getByRole("button", { name: "Search" }));
    await screen.findByRole("button", { name: "Play Bloom" });

    await fireEvent.press(
      screen.getByRole("button", { name: "Toggle list view" }),
    );
    expect(mockPreferences.setListView).toHaveBeenCalledWith(true);

    await fireEvent.press(
      screen.getByRole("button", { name: "Toggle multiselect" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Play Bloom" }));
    await fireEvent.press(screen.getByRole("button", { name: "Play Low" }));

    expect(mockPlay).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Play randomizer LOOMY Mix" }),
    ).toBeDisabled();
    await fireEvent.press(
      screen.getByRole("button", { name: "MODIFY 2 SOUNDS" }),
    );

    await waitFor(() =>
      expect(mockPush).toHaveBeenCalledWith(
        "/organize/sound/bloom?ids=bloom%2Clow",
      ),
    );
  });
});
