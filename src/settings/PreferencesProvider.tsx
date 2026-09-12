import { useSQLiteContext } from "expo-sqlite";
import {
    type PropsWithChildren,
    type ReactNode,
    createContext,
    useContext,
    useEffect,
    useState,
} from "react";

import type { ThemePreference } from "../domain/models";
import { SqliteSettingsRepository } from "../repositories/SqliteSettingsRepository";

export const BUTTON_SIZES = [64, 80, 96, 112, 132, 184] as const;
export type ButtonSize = (typeof BUTTON_SIZES)[number];

interface PreferencesContextValue {
  buttonSize: ButtonSize;
  decreaseButtonSize: () => void;
  hideAssignedSoundsInMain: boolean;
  increaseButtonSize: () => void;
  setHideAssignedSoundsInMain: (hide: boolean) => void;
  setThemePreference: (preference: ThemePreference) => void;
  themePreference: ThemePreference;
}

const DEFAULT_BUTTON_SIZE: ButtonSize = 132;
const DEFAULT_HIDE_ASSIGNED_SOUNDS_IN_MAIN = true;
const DEFAULT_THEME_PREFERENCE: ThemePreference = "system";
const PreferencesContext = createContext<PreferencesContextValue | null>(null);

function parseButtonSize(value: string | null): ButtonSize {
  const size = Number(value);
  return BUTTON_SIZES.includes(size as ButtonSize)
    ? (size as ButtonSize)
    : DEFAULT_BUTTON_SIZE;
}

function parseThemePreference(value: string | null): ThemePreference {
  return value === "light" || value === "dark" || value === "system"
    ? value
    : DEFAULT_THEME_PREFERENCE;
}

function parseBoolean(value: string | null, defaultValue: boolean): boolean {
  if (value === "true") return true;
  if (value === "false") return false;
  return defaultValue;
}

interface PreferencesProviderProps extends PropsWithChildren {
  fallback?: ReactNode;
}

export function PreferencesProvider({
  children,
  fallback = null,
}: PreferencesProviderProps) {
  const database = useSQLiteContext();
  const [repository] = useState(() => new SqliteSettingsRepository(database));
  const [buttonSize, setButtonSize] = useState<ButtonSize>(DEFAULT_BUTTON_SIZE);
  const [hideAssignedSoundsInMain, setHideAssignedSoundsInMainState] = useState(
    DEFAULT_HIDE_ASSIGNED_SOUNDS_IN_MAIN,
  );
  const [themePreference, setThemePreferenceState] = useState<ThemePreference>(
    DEFAULT_THEME_PREFERENCE,
  );
  const [isLoaded, setIsLoaded] = useState(false);
  const [loadError, setLoadError] = useState<Error | null>(null);

  useEffect(() => {
    Promise.all([
      repository.get("buttonSize"),
      repository.get("hideAssignedSoundsInMain"),
      repository.get("themePreference"),
    ])
      .then(
        ([
          storedButtonSize,
          storedHideAssignedSoundsInMain,
          storedThemePreference,
        ]) => {
          setButtonSize(parseButtonSize(storedButtonSize));
          setHideAssignedSoundsInMainState(
            parseBoolean(
              storedHideAssignedSoundsInMain,
              DEFAULT_HIDE_ASSIGNED_SOUNDS_IN_MAIN,
            ),
          );
          setThemePreferenceState(parseThemePreference(storedThemePreference));
          setIsLoaded(true);
        },
      )
      .catch((error: unknown) => {
        setLoadError(error instanceof Error ? error : new Error(String(error)));
      });
  }, [repository]);

  if (loadError) {
    throw loadError;
  }

  if (!isLoaded) {
    return fallback;
  }

  const updateButtonSize = (nextSize: ButtonSize) => {
    setButtonSize(nextSize);
    void repository.set("buttonSize", String(nextSize)).catch(setLoadError);
  };

  const changeButtonSize = (offset: number) => {
    const currentIndex = BUTTON_SIZES.indexOf(buttonSize);
    const nextIndex = Math.max(
      0,
      Math.min(BUTTON_SIZES.length - 1, currentIndex + offset),
    );
    updateButtonSize(BUTTON_SIZES[nextIndex]);
  };

  const setThemePreference = (preference: ThemePreference) => {
    setThemePreferenceState(preference);
    void repository.set("themePreference", preference).catch(setLoadError);
  };

  const setHideAssignedSoundsInMain = (hide: boolean) => {
    setHideAssignedSoundsInMainState(hide);
    void repository
      .set("hideAssignedSoundsInMain", String(hide))
      .catch(setLoadError);
  };

  return (
    <PreferencesContext
      value={{
        buttonSize,
        decreaseButtonSize: () => changeButtonSize(-1),
        hideAssignedSoundsInMain,
        increaseButtonSize: () => changeButtonSize(1),
        setHideAssignedSoundsInMain,
        setThemePreference,
        themePreference,
      }}
    >
      {children}
    </PreferencesContext>
  );
}

export function usePreferences(): PreferencesContextValue {
  const preferences = useContext(PreferencesContext);

  if (!preferences) {
    throw new Error("usePreferences must be used within PreferencesProvider.");
  }

  return preferences;
}
