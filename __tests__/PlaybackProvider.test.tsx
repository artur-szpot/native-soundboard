import { fireEvent, render } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import {
    PlaybackProvider,
    usePlayback,
} from "../src/playback/PlaybackProvider";

const mockPlayer = {
  play: jest.fn(),
  replace: jest.fn(),
};
const mockSetAudioModeAsync = jest.fn().mockResolvedValue(undefined);
let mockStatus = {
  didJustFinish: false,
  error: null as string | null,
  isBuffering: false,
  playing: false,
};

jest.mock("expo-audio", () => ({
  setAudioModeAsync: (...args: unknown[]) => mockSetAudioModeAsync(...args),
  useAudioPlayer: () => mockPlayer,
  useAudioPlayerStatus: () => mockStatus,
}));

function Harness() {
  const { activeSoundId, play, playRandomizer } = usePlayback();

  return (
    <View>
      <Text>{activeSoundId ?? "idle"}</Text>
      <Pressable accessibilityRole="button" onPress={() => play("one", 1)}>
        <Text>One</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => play("two", 2)}>
        <Text>Two</Text>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          playRandomizer("mix", [
            { id: "one", name: "One", source: 1 },
            { id: "two", name: "Two", source: 2 },
          ])
        }
      >
        <Text>Random</Text>
      </Pressable>
    </View>
  );
}

describe("PlaybackProvider", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockStatus = {
      didJustFinish: false,
      error: null,
      isBuffering: false,
      playing: false,
    };
  });

  it("accepts only one playback request until the active sound finishes", async () => {
    const screen = await render(
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "One" }));
    await fireEvent.press(screen.getByRole("button", { name: "Two" }));

    expect(mockPlayer.replace).toHaveBeenCalledTimes(1);
    expect(mockPlayer.replace).toHaveBeenCalledWith(1);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
    expect(screen.getByText("one")).toBeOnTheScreen();
  });

  it("configures playback for predictable OS interruption behavior", async () => {
    await render(
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>,
    );

    expect(mockSetAudioModeAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        interruptionMode: "doNotMix",
        shouldPlayInBackground: false,
      }),
    );
  });

  it("plays randomizer selections through the same global lock", async () => {
    const screen = await render(
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "Random" }));
    await fireEvent.press(screen.getByRole("button", { name: "Two" }));

    expect(mockPlayer.replace).toHaveBeenCalledTimes(1);
    expect(mockPlayer.play).toHaveBeenCalledTimes(1);
  });

  it("accepts another request after playback finishes", async () => {
    const screen = await render(
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>,
    );

    await fireEvent.press(screen.getByRole("button", { name: "One" }));
    mockStatus = { ...mockStatus, playing: true };
    await screen.rerender(
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>,
    );
    mockStatus = { ...mockStatus, didJustFinish: true, playing: false };
    await screen.rerender(
      <PlaybackProvider>
        <Harness />
      </PlaybackProvider>,
    );
    await fireEvent.press(screen.getByRole("button", { name: "Two" }));

    expect(mockPlayer.replace).toHaveBeenCalledTimes(2);
    expect(mockPlayer.replace).toHaveBeenLastCalledWith(2);
  });
});
