import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ImportSoundRoute from "../app/sounds/import";

const mockBack = jest.fn();
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockSetMembership = jest.fn();
const mockRefresh = jest.fn();
const mockPick = jest.fn();
const mockImport = jest.fn();
const mockRemove = jest.fn();

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ collectionId: "favorites" }),
  useRouter: () => ({
    back: mockBack,
    dismissAll: mockDismissAll,
    replace: mockReplace,
  }),
}));
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockPick(...args),
}));
jest.mock("../src/media/AudioMediaService", () => ({
  audioMediaService: {
    import: (...args: unknown[]) => mockImport(...args),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));
jest.mock("../src/repositories/RepositoryProvider", () => ({
  useRepositories: () => ({
    refresh: mockRefresh,
    sounds: {
      create: mockCreate,
      delete: mockDelete,
      setMembership: mockSetMembership,
    },
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

describe("ImportSoundRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPick.mockResolvedValue({
      canceled: false,
      assets: [
        {
          name: "air-horn.mp3",
          size: 1024,
          uri: "file:///cache/air-horn.mp3",
        },
      ],
    });
    mockImport.mockResolvedValue({
      mediaPath: "media/sounds/imported.mp3",
      suggestedName: "air horn",
    });
    mockCreate.mockResolvedValue({ id: "imported" });
    mockDelete.mockResolvedValue(undefined);
    mockSetMembership.mockResolvedValue(undefined);
  });

  it("imports a picked sound into Main and the active collection", async () => {
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio file" }),
    );
    expect(screen.getByLabelText("Sound name")).toHaveProp("value", "air horn");
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    await waitFor(() =>
      expect(mockCreate).toHaveBeenCalledWith(
        "air horn",
        "media/sounds/imported.mp3",
        "air-horn.mp3",
      ),
    );
    expect(mockSetMembership).toHaveBeenCalledWith(
      "imported",
      "favorites",
      true,
    );
    expect(mockReplace).toHaveBeenCalledWith({
      pathname: "/collections/[collectionId]",
      params: { collectionId: "favorites" },
    });
  });

  it("rolls back metadata and media when adding the active membership fails", async () => {
    mockSetMembership.mockRejectedValueOnce(new Error("membership failed"));
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio file" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "membership failed",
    );
    expect(mockDelete).toHaveBeenCalledWith("imported");
    expect(mockRemove).toHaveBeenCalledWith("media/sounds/imported.mp3");
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("keeps media when rollback cannot remove its database record", async () => {
    mockSetMembership.mockRejectedValueOnce(new Error("membership failed"));
    mockDelete.mockRejectedValueOnce(new Error("delete failed"));
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio file" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /sound remains in Main/i,
    );
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
