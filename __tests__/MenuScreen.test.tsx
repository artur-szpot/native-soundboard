import { fireEvent, render } from "@testing-library/react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import MenuScreen from "../app/menu";
import { ThemeProvider } from "../src/theme/ThemeProvider";

const mockBack = jest.fn();
const mockPush = jest.fn();
let mockButtonSize: 64 | 80 | 96 | 112 | 132 | 184 = 132;
const mockPreferences = {
  decreaseButtonSize: jest.fn(),
  increaseButtonSize: jest.fn(),
  setThemePreference: jest.fn(),
  themePreference: "system" as const,
};

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ collectionId: "main" }),
  useRouter: () => ({ back: mockBack, push: mockPush }),
}));
jest.mock("../src/settings/PreferencesProvider", () => ({
  BUTTON_SIZES: [64, 80, 96, 112, 132, 184],
  usePreferences: () => ({ ...mockPreferences, buttonSize: mockButtonSize }),
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
        <MenuScreen />
      </ThemeProvider>
    </SafeAreaProvider>,
  );
}

describe("MenuScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockButtonSize = 132;
  });

  it("shows size and theme controls with a live-size example", async () => {
    const screen = await renderScreen();

    expect(screen.getByLabelText("Button size 5 of 6")).toHaveTextContent("5");
    expect(
      screen.getByRole("image", { name: "Example square button, size 5" }),
    ).toHaveStyle({
      width: 132,
      height: 132,
    });
    await fireEvent.press(
      screen.getByRole("button", { name: "Increase button size" }),
    );
    await fireEvent.press(screen.getByRole("radio", { name: "dark theme" }));

    expect(mockPreferences.increaseButtonSize).toHaveBeenCalledTimes(1);
    expect(mockPreferences.setThemePreference).toHaveBeenCalledWith("dark");

    mockButtonSize = 184;
    await screen.rerender(
      <SafeAreaProvider>
        <ThemeProvider>
          <MenuScreen />
        </ThemeProvider>
      </SafeAreaProvider>,
    );
    expect(
      screen.getByRole("image", { name: "Example square button, size 6" }),
    ).toHaveStyle({
      width: 184,
      height: 184,
    });
  });

  it("closes from the top-right close button", async () => {
    const screen = await renderScreen();

    await fireEvent.press(screen.getByRole("button", { name: "Close menu" }));

    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it("creates a collection beneath the active directory", async () => {
    const screen = await renderScreen();

    await fireEvent.press(
      screen.getByRole("button", { name: "CREATE COLLECTION" }),
    );

    expect(mockPush).toHaveBeenCalledWith({
      pathname: "/collections/create",
      params: { parentId: "main" },
    });
  });
});
