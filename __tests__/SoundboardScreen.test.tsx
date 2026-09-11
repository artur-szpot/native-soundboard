import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import SoundboardScreen from "../app/index";
import { ThemeProvider } from "../src/theme/ThemeProvider";

const mockPlayer = {
  play: jest.fn(),
  seekTo: jest.fn().mockResolvedValue(undefined),
};

let mockStatus = {
  isLoaded: true,
  playing: false,
  currentTime: 0,
  didJustFinish: false,
};

jest.mock("expo-audio", () => ({
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => mockStatus,
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
    mockStatus = {
      isLoaded: true,
      playing: false,
      currentTime: 0,
      didJustFinish: false,
    };
  });

  it("plays the bundled chime when the button is pressed", async () => {
    const screen = await renderScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Play chime" }));

    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("disables the button while audio is playing", async () => {
    mockStatus = { ...mockStatus, playing: true };
    const screen = await renderScreen();

    expect(screen.getByRole("button", { name: "Play chime" })).toBeDisabled();
    expect(screen.getByText("PLAYING")).toBeOnTheScreen();
  });
});
