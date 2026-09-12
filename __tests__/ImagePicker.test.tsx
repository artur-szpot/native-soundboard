import { fireEvent, render, waitFor } from "@testing-library/react-native";

import ImagePickerScreen from "../app/images";

const mockBack = jest.fn();
const mockRefresh = jest.fn();
const mockUpdateIcon = jest.fn();
const mockCollections = { getById: jest.fn(), updateIcon: jest.fn() };
const mockSounds = {
  getById: jest.fn().mockResolvedValue({ id: "bloom", iconUri: null }),
  updateIcon: mockUpdateIcon,
};

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: "bloom", kind: "sound" }),
  useRouter: () => ({ back: mockBack }),
}));
jest.mock("../src/components/IconArtwork", () => ({
  IconArtwork: () => null,
}));
jest.mock("../src/icons/iconReferences", () => ({
  BUILT_IN_ICONS: [{ label: "Music note", name: "music-note" }],
  materialIconReference: (name: string) => `material:${name}`,
}));
jest.mock("../src/media/ImageMediaService", () => ({
  imageMediaService: {
    import: jest.fn(),
    list: jest.fn(() => []),
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
    mockUpdateIcon.mockResolvedValue(undefined);
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
