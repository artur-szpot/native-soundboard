import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ImagePickerScreen from "../app/images";

const mockBack = jest.fn();
const mockRefresh = jest.fn();
const mockUpdateIcon = jest.fn();
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
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: "bloom", kind: "sound" }),
  useRouter: () => ({ back: mockBack }),
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
    import: jest.fn(),
    list: jest.fn(() => mockImportedImages),
    remove: jest.fn(),
  },
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
  });

  it("shows a disabled, normally styled Default above Import Image", async () => {
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
    expect(buttons.at(-2)).toBe(defaultButton);
    expect(buttons.at(-1)).toHaveTextContent("IMPORT IMAGE");
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
});
