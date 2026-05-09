import AsyncStorage from "@react-native-async-storage/async-storage";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const STORAGE_KEY_CATS    = "@aingthon_pinned_categories";
const STORAGE_KEY_THEME   = "@aingthon_theme";
const STORAGE_KEY_WIDGETS = "@aingthon_home_widgets";

const DEFAULT_CATEGORIES = ["청년", "교육"];

export type HomeWidgetKey = "elections" | "trending" | "bills" | "announcements";
export type HomeWidgets   = Record<HomeWidgetKey, boolean>;

const DEFAULT_WIDGETS: HomeWidgets = {
  elections:     true,
  trending:      true,
  bills:         true,
  announcements: true,
};

interface UserPreferencesContextValue {
  pinnedCategories: string[];
  toggleCategory: (cat: string) => void;
  isDark: boolean;
  toggleTheme: () => void;
  homeWidgets: HomeWidgets;
  toggleHomeWidget: (key: HomeWidgetKey) => void;
  isLoaded: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextValue>({
  pinnedCategories: DEFAULT_CATEGORIES,
  toggleCategory: () => {},
  isDark: false,
  toggleTheme: () => {},
  homeWidgets: DEFAULT_WIDGETS,
  toggleHomeWidget: () => {},
  isLoaded: false,
});

export function UserPreferencesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [pinnedCategories, setPinnedCategories] = useState<string[]>(DEFAULT_CATEGORIES);
  const [isDark, setIsDark] = useState(false);
  const [homeWidgets, setHomeWidgets] = useState<HomeWidgets>(DEFAULT_WIDGETS);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    Promise.all([
      AsyncStorage.getItem(STORAGE_KEY_CATS),
      AsyncStorage.getItem(STORAGE_KEY_THEME),
      AsyncStorage.getItem(STORAGE_KEY_WIDGETS),
    ])
      .then(([rawCats, rawTheme, rawWidgets]) => {
        if (rawCats)    setPinnedCategories(JSON.parse(rawCats));
        if (rawTheme)   setIsDark(JSON.parse(rawTheme));
        if (rawWidgets) setHomeWidgets({ ...DEFAULT_WIDGETS, ...JSON.parse(rawWidgets) });
      })
      .catch(() => {})
      .finally(() => setIsLoaded(true));
  }, []);

  const toggleCategory = useCallback((cat: string) => {
    setPinnedCategories((prev) => {
      const next = prev.includes(cat)
        ? prev.filter((c) => c !== cat)
        : [...prev, cat];
      AsyncStorage.setItem(STORAGE_KEY_CATS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      AsyncStorage.setItem(STORAGE_KEY_THEME, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const toggleHomeWidget = useCallback((key: HomeWidgetKey) => {
    setHomeWidgets((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      AsyncStorage.setItem(STORAGE_KEY_WIDGETS, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  return (
    <UserPreferencesContext.Provider
      value={{
        pinnedCategories, toggleCategory,
        isDark, toggleTheme,
        homeWidgets, toggleHomeWidget,
        isLoaded,
      }}
    >
      {children}
    </UserPreferencesContext.Provider>
  );
}

export function useUserPreferences() {
  return useContext(UserPreferencesContext);
}
