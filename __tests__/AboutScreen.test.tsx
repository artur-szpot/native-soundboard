import { fireEvent, render } from "@testing-library/react-native";
import { Linking } from "react-native";

import AboutScreen from "../app/about";

const mockBack = jest.fn();

jest.mock("@expo/vector-icons/MaterialIcons", () => "MaterialIcons");
jest.mock("expo-router", () => ({
  useRouter: () => ({ back: mockBack }),
}));
jest.mock("../src/theme/ThemeProvider", () => ({
  useTheme: () => ({
    colors: {
      background: "#fff",
      border: "#000",
      surface: "#fff",
      text: "#000",
    },
  }),
}));

describe("AboutScreen", () => {
  it("shows project information and working source links", async () => {
    const openUrl = jest.spyOn(Linking, "openURL").mockResolvedValue(undefined);
    const screen = await render(<AboutScreen />);

    expect(screen.getByText(/free and open source/i)).toBeOnTheScreen();
    expect(screen.getByText(/end user is responsible/i)).toBeOnTheScreen();
    expect(screen.getByText(/has no ads/i)).toBeOnTheScreen();
    expect(
      screen.getByRole("button", { name: "BUY ME A COFFEE" }),
    ).toBeDisabled();
    await fireEvent.press(screen.getByRole("link", { name: "GitHub page" }));

    expect(openUrl).toHaveBeenCalledWith(
      "https://github.com/artur-szpot/native-soundboard",
    );
    await fireEvent.press(screen.getByRole("link", { name: "MIT license" }));
    expect(openUrl).toHaveBeenLastCalledWith(
      "https://github.com/artur-szpot/native-soundboard/blob/master/LICENSE",
    );
    openUrl.mockRestore();
  });
});
