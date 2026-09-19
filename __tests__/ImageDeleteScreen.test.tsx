import { fireEvent, render, waitFor } from "@testing-library/react-native";

import DeleteImagesScreen from "../app/images-delete";

const mockBack = jest.fn();
const mockRefresh = jest.fn();
const mockRemove = jest.fn();
let mockImportedImages: string[] = [];
let mockSounds: Array<{ id: string; iconUri: string | null }> = [];
let mockCollections: Array<{ id: string; iconUri: string | null }> = [];
const mockSoundsUpdateIcon = jest.fn();
const mockCollectionsUpdateIcon = jest.fn();

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useRouter: () => ({ back: mockBack }),
}));
jest.mock("../src/components/IconArtwork", () => ({
  IconArtwork: "IconArtwork",
}));
jest.mock("../src/media/ImageMediaService", () => ({
  imageMediaService: {
    list: jest.fn(() => mockImportedImages),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
}));
jest.mock("../src/repositories/RepositoryProvider", () => ({
  useRepositories: () => ({
    collections: {
      listAll: jest.fn(async () => mockCollections),
      updateIcon: mockCollectionsUpdateIcon,
    },
    refresh: mockRefresh,
    sounds: {
      listAll: jest.fn(async () => mockSounds),
      updateIcon: mockSoundsUpdateIcon,
    },
  }),
}));
jest.mock("../src/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      accent: "#f00",
      background: "#fff",
      border: "#000",
      surface: "#fff",
      text: "#000",
    },
  }),
}));

describe("DeleteImagesScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockImportedImages = [];
    mockSounds = [];
    mockCollections = [];
    mockSoundsUpdateIcon.mockResolvedValue(undefined);
    mockCollectionsUpdateIcon.mockResolvedValue(undefined);
  });

  it("shows only imported images and a disabled delete button at zero", async () => {
    mockImportedImages = ["media/images/first.png", "media/images/second.png"];
    const screen = await render(<DeleteImagesScreen />);

    expect(
      await screen.findByRole("button", { name: "Imported image 1" }),
    ).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "Imported image 2" }),
    ).toBeOnTheScreen();
    const deleteButton = screen.getByRole("button", {
      name: "Delete selected images",
    });
    expect(deleteButton).toHaveTextContent("DELETE 0 IMAGES");
    expect(deleteButton).toBeDisabled();
  });

  it("toggles selection when an image is tapped", async () => {
    mockImportedImages = ["media/images/first.png"];
    const screen = await render(<DeleteImagesScreen />);

    const image = await screen.findByRole("button", {
      name: "Imported image 1",
    });
    expect(image).not.toBeSelected();

    await fireEvent.press(image);
    expect(image).toBeSelected();
    expect(
      screen.getByRole("button", { name: "Delete selected images" }),
    ).toHaveTextContent("DELETE 1 IMAGES");
    expect(
      screen.getByRole("button", { name: "Delete selected images" }),
    ).toBeEnabled();

    await fireEvent.press(image);
    expect(image).not.toBeSelected();
    expect(
      screen.getByRole("button", { name: "Delete selected images" }),
    ).toHaveTextContent("DELETE 0 IMAGES");
  });

  it("deletes selected images, clears icon references, and returns", async () => {
    mockImportedImages = ["media/images/first.png", "media/images/second.png"];
    mockSounds = [
      { id: "bloom", iconUri: "media/images/first.png" },
      { id: "other", iconUri: "material:music-note" },
    ];
    mockCollections = [{ id: "favorites", iconUri: "media/images/second.png" }];
    const screen = await render(<DeleteImagesScreen />);

    const first = await screen.findByRole("button", {
      name: "Imported image 1",
    });
    const second = screen.getByRole("button", { name: "Imported image 2" });
    await fireEvent.press(first);
    await fireEvent.press(second);
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete selected images" }),
    );

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(mockSoundsUpdateIcon).toHaveBeenCalledWith("bloom", null);
    expect(mockCollectionsUpdateIcon).toHaveBeenCalledWith("favorites", null);
    expect(mockRemove).toHaveBeenCalledWith("media/images/first.png");
    expect(mockRemove).toHaveBeenCalledWith("media/images/second.png");
    expect(mockRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not show a confirmation dialog", async () => {
    const alertSpy = jest.spyOn(require("react-native").Alert, "alert");
    mockImportedImages = ["media/images/first.png"];
    const screen = await render(<DeleteImagesScreen />);

    const image = await screen.findByRole("button", {
      name: "Imported image 1",
    });
    await fireEvent.press(image);
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete selected images" }),
    );

    await waitFor(() => expect(mockBack).toHaveBeenCalledTimes(1));
    expect(alertSpy).not.toHaveBeenCalled();
  });
});
