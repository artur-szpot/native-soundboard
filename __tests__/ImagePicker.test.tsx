import { act, fireEvent, render, waitFor } from "@testing-library/react-native";

import ImagePickerScreen from "../app/images";

const mockBack = jest.fn();
const mockPush = jest.fn();
const mockRefresh = jest.fn();
const mockUpdateIcon = jest.fn();
const mockPick = jest.fn();
const mockPickDirectory = jest.fn();
const mockImport = jest.fn();
const mockRemove = jest.fn();
const mockCollections = { getById: jest.fn(), updateIcon: jest.fn() };
let mockCurrentIconUri: string | null = null;
let mockImportedImages: string[] = [];
const mockSounds = {
  getById: jest.fn(async () => ({
    id: "bloom",
    iconUri: mockCurrentIconUri,
  })),
  updateIcon: mockUpdateIcon,
};

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-document-picker", () => ({
  getDocumentAsync: (...args: unknown[]) => mockPick(...args),
}));
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useFocusEffect: (effect: () => void) => {
    const { useEffect } = require("react");
    useEffect(effect, [effect]);
  },
  useLocalSearchParams: () => ({ id: "bloom", kind: "sound" }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock("../src/components/IconArtwork", () => ({
  IconArtwork: "IconArtwork",
}));
jest.mock("../src/icons/iconReferences", () => ({
  BUILT_IN_ICONS: [{ label: "Music note", name: "music-note" }],
  materialIconReference: (name: string) => `material:${name}`,
}));
jest.mock("../src/media/ImageMediaService", () => ({
  imageMediaService: {
    import: (...args: unknown[]) => mockImport(...args),
    list: jest.fn(() => mockImportedImages),
    remove: (...args: unknown[]) => mockRemove(...args),
  },
  isSupportedImageFilename: (name: string) => /\.(jpe?g|png|webp)$/i.test(name),
}));
jest.mock("../src/media/DirectoryMediaPicker", () => ({
  pickDirectoryMediaFiles: (...args: unknown[]) => mockPickDirectory(...args),
}));
jest.mock("../src/repositories/RepositoryProvider", () => ({
  useRepositories: () => ({
    collections: mockCollections,
    refresh: mockRefresh,
    sounds: mockSounds,
  }),
}));
jest.mock("../src/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      accent: "#f00",
      background: "#fff",
      border: "#000",
      playing: "#fc0",
      surface: "#fff",
      text: "#000",
    },
  }),
}));

describe("ImagePickerScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentIconUri = null;
    mockImportedImages = [];
    mockUpdateIcon.mockResolvedValue(undefined);
    mockPick.mockResolvedValue({ canceled: true, assets: null });
    mockPickDirectory.mockResolvedValue(null);
  });

  it("shows Default, Import Image, Import Directory, then a red Delete Images", async () => {
    const screen = await render(<ImagePickerScreen />);

    const defaultButton = await screen.findByRole("button", {
      name: "Use default icon",
    });
    expect(defaultButton).toBeSelected();
    expect(defaultButton).toBeDisabled();
    expect(defaultButton).toHaveStyle({
      width: "100%",
      borderColor: "#000",
      borderWidth: 2,
    });
    expect(screen.getByTestId("default-icon")).toHaveProp(
      "name",
      "not-interested",
    );
    expect(screen.getByTestId("default-icon")).toHaveProp("color", "#000");
    expect(screen.getByText("DEFAULT")).toBeOnTheScreen();
    const buttons = screen.getAllByRole("button");
    expect(buttons.at(-4)).toBe(defaultButton);
    expect(buttons.at(-3)).toHaveTextContent("IMPORT IMAGE");
    expect(buttons.at(-2)).toHaveTextContent("IMPORT DIRECTORY");
    expect(buttons.at(-2)).toHaveStyle({ backgroundColor: "#f00" });
    expect(buttons.at(-1)).toHaveTextContent("DELETE IMAGES");
    expect(buttons.at(-1)).toHaveStyle({ backgroundColor: "#E74E36" });
  });

  it("navigates to the delete images screen", async () => {
    const screen = await render(<ImagePickerScreen />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Delete images" }),
      ).toBeEnabled(),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Delete images" }),
    );

    expect(mockPush).toHaveBeenCalledWith("/images-delete");
  });

  it("uses a red border and red glyph for the selected built-in icon", async () => {
    mockCurrentIconUri = "material:music-note";
    const screen = await render(<ImagePickerScreen />);

    const selectedIcon = await screen.findByRole("button", {
      name: "Music note",
    });
    expect(selectedIcon).toBeSelected();
    expect(selectedIcon).toHaveStyle({
      borderColor: "#f00",
      borderWidth: 5,
    });
    expect(screen.getByTestId("built-in-icon-music-note")).toHaveProp(
      "color",
      "#f00",
    );
  });

  it("marks an imported image with a red border without tinting it", async () => {
    mockCurrentIconUri = "media/images/custom.png";
    mockImportedImages = [mockCurrentIconUri];
    const screen = await render(<ImagePickerScreen />);

    const selectedImage = await screen.findByRole("button", {
      name: "Imported image 1",
    });
    expect(selectedImage).toBeSelected();
    expect(selectedImage).toHaveStyle({
      borderColor: "#f00",
      borderWidth: 5,
    });
  });

  it("resets a custom icon from the bottom Default button", async () => {
    mockCurrentIconUri = "material:music-note";
    const screen = await render(<ImagePickerScreen />);
    const defaultButton = await screen.findByRole("button", {
      name: "Use default icon",
    });

    expect(defaultButton).not.toBeSelected();
    await fireEvent.press(defaultButton);

    await waitFor(() =>
      expect(mockUpdateIcon).toHaveBeenCalledWith("bloom", null),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("saves a built-in icon and returns", async () => {
    const screen = await render(<ImagePickerScreen />);

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Music note" })).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "Music note" }));

    await waitFor(() =>
      expect(mockUpdateIcon).toHaveBeenCalledWith(
        "bloom",
        "material:music-note",
      ),
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("imports one image, assigns it, and returns", async () => {
    const asset = {
      name: "bloom.png",
      size: 1024,
      uri: "file:///cache/bloom.png",
    };
    mockPick.mockResolvedValueOnce({ canceled: false, assets: [asset] });
    mockImport.mockResolvedValueOnce("media/images/bloom.png");
    const screen = await render(<ImagePickerScreen />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "IMPORT IMAGE" }),
      ).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT IMAGE" }));

    expect(mockPick).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: true }),
    );
    expect(mockImport).toHaveBeenCalledWith(asset);
    expect(mockUpdateIcon).toHaveBeenCalledWith(
      "bloom",
      "media/images/bloom.png",
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("imports multiple images into the grid without assigning or returning", async () => {
    const first = {
      name: "first.png",
      size: 1024,
      uri: "file:///cache/first.png",
    };
    const second = {
      name: "second.webp",
      size: 2048,
      uri: "file:///cache/second.webp",
    };
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [first, second],
    });
    mockImport
      .mockImplementationOnce(async () => {
        mockImportedImages = ["media/images/first.png"];
        return "media/images/first.png";
      })
      .mockImplementationOnce(async () => {
        mockImportedImages = [
          "media/images/first.png",
          "media/images/second.webp",
        ];
        return "media/images/second.webp";
      });
    const screen = await render(<ImagePickerScreen />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "IMPORT IMAGE" }),
      ).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT IMAGE" }));

    expect(mockImport).toHaveBeenNthCalledWith(1, first);
    expect(mockImport).toHaveBeenNthCalledWith(2, second);
    expect(
      await screen.findByRole("button", { name: "Imported image 2" }),
    ).toBeEnabled();
    expect(mockUpdateIcon).not.toHaveBeenCalled();
    expect(mockRefresh).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("imports a one-image directory into the grid without assigning or returning", async () => {
    const asset = {
      name: "nested.png",
      size: 1024,
      uri: "content://picked/nested/nested.png",
    };
    mockPickDirectory.mockResolvedValueOnce([asset]);
    mockImport.mockImplementationOnce(async () => {
      mockImportedImages = ["media/images/nested.png"];
      return "media/images/nested.png";
    });
    const screen = await render(<ImagePickerScreen />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Choose image directory" }),
      ).toBeEnabled(),
    );
    await fireEvent.press(
      screen.getByRole("button", { name: "Choose image directory" }),
    );

    expect(mockPickDirectory).toHaveBeenCalledWith(expect.any(Function));
    expect(mockImport).toHaveBeenCalledWith(asset);
    expect(
      await screen.findByRole("button", { name: "Imported image 1" }),
    ).toBeEnabled();
    expect(mockUpdateIcon).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("shows a loading indicator while directory images are discovered", async () => {
    let resolveDirectory:
      | ((assets: Array<{ name: string; size: number; uri: string }>) => void)
      | undefined;
    mockPickDirectory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDirectory = resolve;
      }),
    );
    const screen = await render(<ImagePickerScreen />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Choose image directory" }),
      ).toBeEnabled(),
    );

    fireEvent.press(
      screen.getByRole("button", { name: "Choose image directory" }),
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("Loading image directory"),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByLabelText("Loading image directory")).toHaveProp(
      "size",
      "large",
    );
    expect(screen.getByText("LOADING FILES...")).toBeOnTheScreen();
    await act(() =>
      resolveDirectory?.([
        {
          name: "loaded.png",
          size: 1024,
          uri: "content://picked/loaded.png",
        },
      ]),
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText("Loading image directory"),
      ).not.toBeOnTheScreen(),
    );
  });

  it("reports a directory without supported images", async () => {
    mockPickDirectory.mockResolvedValueOnce([]);
    const screen = await render(<ImagePickerScreen />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Choose image directory" }),
      ).toBeEnabled(),
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose image directory" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No supported images were found in that directory.",
    );
  });

  it("keeps successful directory images when another fails", async () => {
    const first = {
      name: "first.png",
      size: 1024,
      uri: "content://picked/first.png",
    };
    const broken = {
      name: "broken.webp",
      size: 2048,
      uri: "content://picked/nested/broken.webp",
    };
    mockPickDirectory.mockResolvedValueOnce([first, broken]);
    mockImport
      .mockImplementationOnce(async () => {
        mockImportedImages = ["media/images/first.png"];
        return "media/images/first.png";
      })
      .mockRejectedValueOnce(new Error("image could not be decoded"));
    const screen = await render(<ImagePickerScreen />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Choose image directory" }),
      ).toBeEnabled(),
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose image directory" }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "broken.webp: image could not be decoded",
    );
    expect(
      screen.getByRole("button", { name: "Imported image 1" }),
    ).toBeEnabled();
    expect(mockUpdateIcon).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });

  it("ignores canceled image directory selection and reports other errors", async () => {
    const screen = await render(<ImagePickerScreen />);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Choose image directory" }),
      ).toBeEnabled(),
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose image directory" }),
    );
    expect(screen.queryByRole("alert")).not.toBeOnTheScreen();

    mockPickDirectory.mockRejectedValueOnce(new Error("Directory unavailable"));
    await fireEvent.press(
      screen.getByRole("button", { name: "Choose image directory" }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Directory unavailable",
    );
  });

  it("keeps successful images when another image in the batch fails", async () => {
    const first = {
      name: "first.png",
      size: 1024,
      uri: "file:///cache/first.png",
    };
    const broken = {
      name: "broken.webp",
      size: 2048,
      uri: "file:///cache/broken.webp",
    };
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [first, broken],
    });
    mockImport
      .mockImplementationOnce(async () => {
        mockImportedImages = ["media/images/first.png"];
        return "media/images/first.png";
      })
      .mockRejectedValueOnce(new Error("image could not be decoded"));
    const screen = await render(<ImagePickerScreen />);

    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "IMPORT IMAGE" }),
      ).toBeEnabled(),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT IMAGE" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "broken.webp: image could not be decoded",
    );
    expect(
      screen.getByRole("button", { name: "Imported image 1" }),
    ).toBeEnabled();
    expect(mockUpdateIcon).not.toHaveBeenCalled();
    expect(mockBack).not.toHaveBeenCalled();
  });
});
