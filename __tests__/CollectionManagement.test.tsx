import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";

import CreateCollectionRoute from "../app/collections/create";
import OrganizeCollectionRoute from "../app/organize/collection/[id]";
import OrganizeSoundRoute from "../app/organize/sound/[id]";

const mockBack = jest.fn();
const mockDismissAll = jest.fn();
const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockRefresh = jest.fn();
const mockCreate = jest.fn();
const mockReparent = jest.fn();
const mockSetMembership = jest.fn();
const mockPlay = jest.fn();
const mockUpdateCollection = jest.fn();
const mockDeleteCollection = jest.fn();
const mockUpdateSoundName = jest.fn();
let mockParams: Record<string, string> = {};

const mockMain = {
  id: "main",
  name: "Main",
  role: "directory" as const,
  iconUri: null,
  parentId: null,
  createdAt: 1,
  updatedAt: 1,
};
const mockFavorites = {
  ...mockMain,
  id: "favorites",
  name: "Favorites",
  parentId: "main",
};
const mockBloom = {
  id: "bloom",
  name: "Bloom",
  mediaPath: "bundled:bloom",
  iconUri: null,
  createdAt: 1,
  updatedAt: 1,
};
const mockCollectionGetById = jest.fn(async (id: string) =>
  id === "favorites" ? mockFavorites : mockMain,
);
const mockCollections = {
  create: mockCreate,
  delete: mockDeleteCollection,
  getById: mockCollectionGetById,
  listAll: jest.fn().mockResolvedValue([mockMain, mockFavorites]),
  listChildren: jest.fn().mockResolvedValue([]),
  listValidParents: jest.fn().mockResolvedValue([mockMain]),
  reparent: mockReparent,
  update: mockUpdateCollection,
};
const mockSounds = {
  getById: jest.fn().mockResolvedValue(mockBloom),
  listMembershipCollectionIds: jest.fn().mockResolvedValue(["main"]),
  setMembership: mockSetMembership,
  updateName: mockUpdateSoundName,
};
const mockRepositories = {
  collections: mockCollections,
  refresh: mockRefresh,
  sounds: mockSounds,
};

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => mockParams,
  useRouter: () => ({
    back: mockBack,
    dismissAll: mockDismissAll,
    push: mockPush,
    replace: mockReplace,
  }),
}));
jest.mock("../src/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      accent: "#f00",
      background: "#fff",
      border: "#000",
      mutedText: "#555",
      surface: "#fff",
      text: "#000",
    },
  }),
}));
jest.mock("../src/repositories/RepositoryProvider", () => ({
  useRepositories: () => mockRepositories,
}));
jest.mock("../src/media/AudioMediaService", () => ({
  audioMediaService: { import: jest.fn(), remove: jest.fn() },
}));
jest.mock("../src/playback/PlaybackProvider", () => ({
  usePlayback: () => ({
    activeSoundId: null,
    isBusy: false,
    play: mockPlay,
  }),
}));

describe("collection management routes", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCreate.mockResolvedValue(mockFavorites);
    mockReparent.mockResolvedValue(undefined);
    mockSetMembership.mockResolvedValue(undefined);
    mockUpdateCollection.mockResolvedValue(undefined);
    mockDeleteCollection.mockResolvedValue(undefined);
    mockUpdateSoundName.mockResolvedValue(undefined);
  });

  it("creates a randomizer in the requested parent", async () => {
    mockParams = { parentId: "main" };
    const screen = await render(<CreateCollectionRoute />);

    await fireEvent.changeText(
      screen.getByLabelText("Collection name"),
      "My Mix",
    );
    await fireEvent.press(
      screen.getByRole("radio", { name: "randomizer collection" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "CREATE" }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith("My Mix", "randomizer", "main"),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("adds a sound membership while keeping Main locked", async () => {
    mockParams = { id: "bloom" };
    const screen = await render(<OrganizeSoundRoute />);

    await waitFor(() =>
      expect(
        screen.getByRole("checkbox", { name: "Favorites" }),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByRole("checkbox", { name: "Main" })).toBeDisabled();
    await fireEvent.press(screen.getByRole("checkbox", { name: "Favorites" }));

    expect(mockSetMembership).toHaveBeenCalledWith("bloom", "favorites", true);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("moves a collection to a valid parent", async () => {
    mockParams = { id: "favorites" };
    const screen = await render(<OrganizeCollectionRoute />);

    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Main" })).toBeOnTheScreen(),
    );
    await fireEvent.press(screen.getByRole("radio", { name: "Main" }));

    expect(mockReparent).toHaveBeenCalledWith("favorites", "main");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("renames a sound", async () => {
    mockParams = { id: "bloom" };
    const screen = await render(<OrganizeSoundRoute />);

    const input = await screen.findByLabelText("Sound name");
    await fireEvent.changeText(input, "Morning Bloom");
    await fireEvent.press(screen.getByRole("button", { name: "SAVE NAME" }));

    await waitFor(() =>
      expect(mockUpdateSoundName).toHaveBeenCalledWith(
        "bloom",
        "Morning Bloom",
      ),
    );
  });

  it("converts a directory to a randomizer and deletes it after confirmation", async () => {
    mockParams = { id: "favorites" };
    const alert = jest.spyOn(Alert, "alert").mockImplementation(jest.fn());
    const screen = await render(<OrganizeCollectionRoute />);

    await fireEvent.press(
      await screen.findByRole("radio", { name: "randomizer collection" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "SAVE DETAILS" }));
    await waitFor(() =>
      expect(mockUpdateCollection).toHaveBeenCalledWith(
        "favorites",
        "Favorites",
        "randomizer",
      ),
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Delete collection" }),
    );
    const destructiveAction = alert.mock.calls[0][2]?.find(
      (action) => action.style === "destructive",
    );
    await act(async () => {
      destructiveAction?.onPress?.();
    });

    await waitFor(() =>
      expect(mockDeleteCollection).toHaveBeenCalledWith("favorites"),
    );
    expect(mockReplace).toHaveBeenCalledWith("/");
    alert.mockRestore();
  });
});
