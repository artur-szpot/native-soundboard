import { act, fireEvent, render, waitFor } from "@testing-library/react-native";
import {
    AccessibilityInfo,
    Animated,
    Keyboard,
    ScrollView,
    TextInput,
    type KeyboardEvent,
} from "react-native";

import ImportSoundRoute from "../app/sounds/import";

const mockBack = jest.fn();
const mockDismissAll = jest.fn();
const mockReplace = jest.fn();
const mockCreate = jest.fn();
const mockDelete = jest.fn();
const mockSetMembership = jest.fn();
const mockRefresh = jest.fn();
const mockPick = jest.fn();
const mockPickDirectory = jest.fn();
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
  isSupportedAudioFilename: (name: string) =>
    /\.(aac|m4a|mp3|ogg|wav)$/i.test(name),
}));
jest.mock("../src/media/DirectoryMediaPicker", () => ({
  pickDirectoryMediaFiles: (...args: unknown[]) => mockPickDirectory(...args),
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
    mockPickDirectory.mockResolvedValue(null);
    mockImport.mockResolvedValue({
      mediaPath: "media/sounds/imported.mp3",
      suggestedName: "air horn",
    });
    mockCreate.mockResolvedValue({ id: "imported" });
    mockDelete.mockResolvedValue(undefined);
    mockSetMembership.mockResolvedValue(undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("uses one keyboard viewport adjustment mechanism", async () => {
    const screen = await render(<ImportSoundRoute />);
    const scrollView = screen.getByTestId("import-scroll-view");

    expect(screen.getByTestId("import-keyboard-region")).toHaveStyle({
      flex: 1,
    });
    expect(scrollView).not.toHaveProp(
      "automaticallyAdjustKeyboardInsets",
      true,
    );
    expect(scrollView).not.toHaveProp("keyboardDismissMode");
  });

  it("scrolls the focused name input by its keyboard overlap", async () => {
    const keyboardDidShow = {
      current: undefined as ((event: KeyboardEvent) => void) | undefined,
    };
    jest.spyOn(Keyboard, "metrics").mockReturnValue(undefined);
    jest
      .spyOn(Keyboard, "addListener")
      .mockImplementation((event, listener) => {
        if (event === "keyboardDidShow") keyboardDidShow.current = listener;
        return { remove: jest.fn() } as unknown as ReturnType<
          typeof Keyboard.addListener
        >;
      });
    jest
      .spyOn(globalThis, "requestAnimationFrame")
      .mockImplementation((callback: FrameRequestCallback) => {
        callback(0);
        return 1;
      });
    jest
      .spyOn(TextInput.prototype, "measureInWindow")
      .mockImplementationOnce((callback) => callback(20, 400, 280, 52))
      .mockImplementation((callback) => callback(20, 480, 280, 52));
    const scrollTo = jest
      .spyOn(ScrollView.prototype, "scrollTo")
      .mockImplementation();
    const screen = await render(<ImportSoundRoute />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );

    await fireEvent(
      screen.getByLabelText("Sound name for air-horn.mp3"),
      "focus",
      { target: 42 },
    );

    keyboardDidShow.current?.({
      duration: 250,
      easing: "keyboard",
      endCoordinates: {
        height: 300,
        screenX: 0,
        screenY: 500,
        width: 320,
      },
      isEventFromThisApp: true,
      startCoordinates: {
        height: 0,
        screenX: 0,
        screenY: 800,
        width: 320,
      },
    });
    const scrollView = screen.getByTestId("import-scroll-view");
    expect(scrollView.props.onLayout).toEqual(expect.any(Function));
    scrollView.props.onLayout({
      nativeEvent: { layout: { height: 500, width: 320, x: 0, y: 0 } },
    });

    expect(scrollTo).toHaveBeenCalledWith({
      animated: true,
      y: 56,
    });
  });

  it("shows one name field per selected file only after multi-selection", async () => {
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          name: "air-horn.mp3",
          size: 1024,
          uri: "file:///cache/air-horn.mp3",
        },
        {
          name: "crowd_cheer.wav",
          size: 2048,
          uri: "file:///cache/crowd_cheer.wav",
        },
      ],
    });
    const screen = await render(<ImportSoundRoute />);

    expect(screen.queryByLabelText(/Sound name/)).not.toBeOnTheScreen();
    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );

    expect(mockPick).toHaveBeenCalledWith(
      expect.objectContaining({ multiple: true }),
    );
    await waitFor(() => {
      expect(screen.getByText("air-horn.mp3")).toBeOnTheScreen();
      expect(screen.getByText("crowd_cheer.wav")).toBeOnTheScreen();
      expect(screen.getByLabelText("Sound name for air-horn.mp3")).toHaveProp(
        "value",
        "air-horn",
      );
      expect(
        screen.getByLabelText("Sound name for crowd_cheer.wav"),
      ).toHaveProp("value", "crowd_cheer");
    });
  });

  it("selects supported directory sounds into the rename form", async () => {
    mockPickDirectory.mockResolvedValueOnce([
      {
        name: "nested-one.mp3",
        size: 1024,
        uri: "content://picked/nested/nested-one.mp3",
      },
      {
        name: "nested_two.wav",
        size: 2048,
        uri: "content://picked/nested_two.wav",
      },
    ]);
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio directory" }),
    );

    expect(mockPickDirectory).toHaveBeenCalledWith(expect.any(Function));
    expect(screen.getByLabelText("Sound name for nested-one.mp3")).toHaveProp(
      "value",
      "nested-one",
    );
    expect(screen.getByLabelText("Sound name for nested_two.wav")).toHaveProp(
      "value",
      "nested_two",
    );
  });

  it("shows a loading indicator while directory sounds are discovered", async () => {
    let resolveDirectory:
      | ((assets: Array<{ name: string; size: number; uri: string }>) => void)
      | undefined;
    mockPickDirectory.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveDirectory = resolve;
      }),
    );
    const screen = await render(<ImportSoundRoute />);

    fireEvent.press(
      screen.getByRole("button", { name: "Choose audio directory" }),
    );

    await waitFor(() =>
      expect(
        screen.getByLabelText("Loading audio directory"),
      ).toBeOnTheScreen(),
    );
    expect(screen.getByLabelText("Loading audio directory")).toHaveProp(
      "size",
      "large",
    );
    expect(screen.getByText("LOADING FILES...")).toBeOnTheScreen();
    await act(() =>
      resolveDirectory?.([
        {
          name: "loaded.mp3",
          size: 1024,
          uri: "content://picked/loaded.mp3",
        },
      ]),
    );
    await waitFor(() =>
      expect(
        screen.queryByLabelText("Loading audio directory"),
      ).not.toBeOnTheScreen(),
    );
  });

  it("reports a directory without supported sounds", async () => {
    mockPickDirectory.mockResolvedValueOnce([]);
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio directory" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "No supported audio files were found in that directory.",
    );
  });

  it("leaves the sound review unchanged when directory selection is canceled", async () => {
    mockPickDirectory.mockResolvedValueOnce(null);
    const screen = await render(<ImportSoundRoute />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio directory" }),
    );

    expect(
      screen.getByLabelText("Sound name for air-horn.mp3"),
    ).toBeOnTheScreen();
  });

  it("reports directory traversal errors", async () => {
    mockPickDirectory.mockRejectedValueOnce(new Error("Directory unavailable"));
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio directory" }),
    );

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Directory unavailable",
    );
  });

  it("removes a selected file and keeps the remaining edited names", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(false);
    let finishAnimation: ((result: { finished: boolean }) => void) | undefined;
    const timing = jest.spyOn(Animated, "timing").mockImplementation(() => ({
      reset: jest.fn(),
      start: (callback) => {
        finishAnimation = callback;
      },
      stop: jest.fn(),
    }));
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          name: "first.mp3",
          size: 1024,
          uri: "file:///cache/first.mp3",
        },
        {
          name: "second.wav",
          size: 2048,
          uri: "file:///cache/second.wav",
        },
      ],
    });
    const screen = await render(<ImportSoundRoute />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Sound name for second.wav"),
      "Second edited",
    );
    await waitFor(() =>
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledTimes(1),
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Remove first.mp3" }),
    );

    expect(timing).toHaveBeenCalledWith(
      expect.any(Animated.Value),
      expect.objectContaining({
        duration: 180,
        toValue: 0,
        useNativeDriver: true,
      }),
    );
    expect(screen.getByText("first.mp3")).toBeOnTheScreen();

    await act(() => finishAnimation?.({ finished: true }));

    expect(screen.queryByText("first.mp3")).not.toBeOnTheScreen();
    expect(
      screen.queryByLabelText("Sound name for first.mp3"),
    ).not.toBeOnTheScreen();
    expect(screen.getByText("second.wav")).toBeOnTheScreen();
    expect(screen.getByLabelText("Sound name for second.wav")).toHaveProp(
      "value",
      "Second edited",
    );
  });

  it("removes a selected file without animation when reduced motion is enabled", async () => {
    jest
      .spyOn(AccessibilityInfo, "isReduceMotionEnabled")
      .mockResolvedValue(true);
    const timing = jest.spyOn(Animated, "timing");
    const screen = await render(<ImportSoundRoute />);
    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    await waitFor(() =>
      expect(AccessibilityInfo.isReduceMotionEnabled).toHaveBeenCalledTimes(1),
    );

    await fireEvent.press(
      screen.getByRole("button", { name: "Remove air-horn.mp3" }),
    );

    expect(timing).not.toHaveBeenCalled();
    expect(screen.queryByText("air-horn.mp3")).not.toBeOnTheScreen();
  });

  it("imports a picked sound into Main and the active collection", async () => {
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    expect(screen.getByLabelText("Sound name for air-horn.mp3")).toHaveProp(
      "value",
      "air-horn",
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledWith(
      "air-horn",
      "media/sounds/imported.mp3",
      "air-horn.mp3",
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

  it("updates the name from every selected filename without changing punctuation", async () => {
    mockPick
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            name: "first-sound_v1.mp3",
            size: 1024,
            uri: "file:///cache/first-sound_v1.mp3",
          },
        ],
      })
      .mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            name: "second--sound_final.wav",
            size: 1024,
            uri: "file:///cache/second--sound_final.wav",
          },
        ],
      });
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    expect(
      screen.getByLabelText("Sound name for first-sound_v1.mp3"),
    ).toHaveProp("value", "first-sound_v1");

    await fireEvent.press(
      screen.getByRole("button", {
        name: "Change selected audio files",
      }),
    );
    await waitFor(() =>
      expect(
        screen.getByLabelText("Sound name for second--sound_final.wav"),
      ).toHaveProp("value", "second--sound_final"),
    );
  });

  it("imports multiple sounds with independently edited names", async () => {
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          name: "first.mp3",
          size: 1024,
          uri: "file:///cache/first.mp3",
        },
        {
          name: "second.wav",
          size: 2048,
          uri: "file:///cache/second.wav",
        },
      ],
    });
    mockImport
      .mockResolvedValueOnce({ mediaPath: "media/sounds/first.mp3" })
      .mockResolvedValueOnce({ mediaPath: "media/sounds/second.wav" });
    mockCreate
      .mockResolvedValueOnce({ id: "first-id" })
      .mockResolvedValueOnce({ id: "second-id" });
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Sound name for first.mp3"),
      "First edited",
    );
    await fireEvent.changeText(
      screen.getByLabelText("Sound name for second.wav"),
      "Second edited",
    );
    await waitFor(() => {
      expect(screen.getByLabelText("Sound name for first.mp3")).toHaveProp(
        "value",
        "First edited",
      );
      expect(screen.getByLabelText("Sound name for second.wav")).toHaveProp(
        "value",
        "Second edited",
      );
    });
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    await waitFor(() => expect(mockReplace).toHaveBeenCalledTimes(1));
    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(mockCreate).toHaveBeenNthCalledWith(
      1,
      "First edited",
      "media/sounds/first.mp3",
      "first.mp3",
    );
    expect(mockCreate).toHaveBeenNthCalledWith(
      2,
      "Second edited",
      "media/sounds/second.wav",
      "second.wav",
    );
    expect(mockSetMembership).toHaveBeenNthCalledWith(
      1,
      "first-id",
      "favorites",
      true,
    );
    expect(mockSetMembership).toHaveBeenNthCalledWith(
      2,
      "second-id",
      "favorites",
      true,
    );
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockReplace).toHaveBeenCalledTimes(1);
  });

  it("disables batch import while any selected sound name is blank", async () => {
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          name: "first.mp3",
          size: 1024,
          uri: "file:///cache/first.mp3",
        },
        {
          name: "second.wav",
          size: 2048,
          uri: "file:///cache/second.wav",
        },
      ],
    });
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    await fireEvent.changeText(
      screen.getByLabelText("Sound name for second.wav"),
      "   ",
    );

    expect(screen.getByRole("button", { name: "IMPORT" })).toBeDisabled();
    expect(mockImport).not.toHaveBeenCalled();
  });

  it("keeps only failed sounds for retry after a partial import", async () => {
    mockPick.mockResolvedValueOnce({
      canceled: false,
      assets: [
        {
          name: "first.mp3",
          size: 1024,
          uri: "file:///cache/first.mp3",
        },
        {
          name: "broken.wav",
          size: 2048,
          uri: "file:///cache/broken.wav",
        },
      ],
    });
    mockImport
      .mockResolvedValueOnce({ mediaPath: "media/sounds/first.mp3" })
      .mockRejectedValueOnce(new Error("could not decode"));
    mockCreate.mockResolvedValueOnce({ id: "first-id" });
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "broken.wav: could not decode",
    );
    expect(screen.queryByText("first.mp3")).not.toBeOnTheScreen();
    expect(screen.getByText("broken.wav")).toBeOnTheScreen();
    expect(mockCreate).toHaveBeenCalledTimes(1);
    expect(mockRefresh).toHaveBeenCalledTimes(1);
    expect(mockReplace).not.toHaveBeenCalled();
  });

  it("rolls back metadata and media when adding the active membership fails", async () => {
    mockSetMembership.mockRejectedValueOnce(new Error("membership failed"));
    const screen = await render(<ImportSoundRoute />);

    await fireEvent.press(
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "air-horn.mp3: membership failed",
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
      screen.getByRole("button", { name: "Choose audio files" }),
    );
    await fireEvent.press(screen.getByRole("button", { name: "IMPORT" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      /sound remains in Main/i,
    );
    expect(mockRemove).not.toHaveBeenCalled();
  });
});
