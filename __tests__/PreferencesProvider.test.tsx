import { fireEvent, render, waitFor } from "@testing-library/react-native";
import { Pressable, Text, View } from "react-native";

import {
    PreferencesProvider,
    usePreferences,
} from "../src/settings/PreferencesProvider";

const mockSettings = new Map<string, string>();
const mockGetFirstAsync = jest.fn(async (_sql: string, key: string) => {
  const value = mockSettings.get(key);
  return value === undefined ? null : { value };
});
const mockRunAsync = jest.fn(
  async (_sql: string, key: string, value: string) => {
    mockSettings.set(key, value);
  },
);

jest.mock("expo-sqlite", () => ({
  useSQLiteContext: () => ({
    getFirstAsync: mockGetFirstAsync,
    runAsync: mockRunAsync,
  }),
}));

function ViewPreference() {
  const { listView, setListView } = usePreferences();
  return (
    <View>
      <Text>{listView ? "List" : "Tiles"}</Text>
      <Pressable onPress={() => setListView(!listView)}>
        <Text>Change view</Text>
      </Pressable>
    </View>
  );
}

function renderPreference() {
  return render(
    <PreferencesProvider fallback={<Text>Loading</Text>}>
      <ViewPreference />
    </PreferencesProvider>,
  );
}

describe("list view preference", () => {
  beforeEach(() => {
    mockSettings.clear();
    jest.clearAllMocks();
  });

  it("defaults to tiles and persists the global choice across remounts", async () => {
    const screen = await renderPreference();
    expect(await screen.findByText("Tiles")).toBeOnTheScreen();

    await fireEvent.press(screen.getByText("Change view"));
    expect(screen.getByText("List")).toBeOnTheScreen();
    await waitFor(() => expect(mockSettings.get("listView")).toBe("true"));

    screen.unmount();
    const reopened = await renderPreference();
    expect(await reopened.findByText("List")).toBeOnTheScreen();

    await fireEvent.press(reopened.getByText("Change view"));
    await waitFor(() => expect(mockSettings.get("listView")).toBe("false"));
  });
});
