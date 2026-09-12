import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SoundboardScreen from "../app/index";
import { ThemeProvider } from "../src/theme/ThemeProvider";

const mockPlay = jest.fn();
const mockPush = jest.fn();
const mockPreferences = {
  buttonSize: 132 as const,
  decreaseButtonSize: jest.fn(),
  increaseButtonSize: jest.fn(),
  setThemePreference: jest.fn(),
  themePreference: "system" as const,
};
let mockActiveSoundId: string | null = null;

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  useRouter: () => ({ push: mockPush }),
}));
jest.mock("../src/settings/PreferencesProvider", () => ({
  BUTTON_SIZES: [64, 80, 96, 112, 132, 184],
  usePreferences: () => mockPreferences,
}));
jest.mock("../src/playback/PlaybackProvider", () => ({
  usePlayback: () => ({
    activeSoundId: mockActiveSoundId,
    error: null,
    isBusy: mockActiveSoundId !== null,
    play: mockPlay,
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

describe("SoundboardScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockActiveSoundId = null;
  });

  it("renders and plays each bundled starter sound", async () => {
    const screen = await renderScreen();

    expect(screen.getAllByRole("button", { name: /^Play / })).toHaveLength(4);
    await fireEvent.press(screen.getByRole("button", { name: "Play Bloom" }));

    expect(mockPlay).toHaveBeenCalledWith("bloom", expect.any(Number));
  });

  it("disables every sound button while one sound is playing", async () => {
    mockActiveSoundId = "bloom";
    const screen = await renderScreen();

    for (const button of screen.getAllByRole("button", { name: /^Play / })) {
      expect(button).toBeDisabled();
    }
  });

  it("opens the menu from the header", async () => {
    const screen = await renderScreen();

    expect(screen.queryByLabelText("Button size")).not.toBeOnTheScreen();
    expect(screen.queryByLabelText("Theme")).not.toBeOnTheScreen();
    await fireEvent.press(screen.getByRole("button", { name: "Open menu" }));

    expect(mockPush).toHaveBeenCalledWith("/menu");
  });
});
