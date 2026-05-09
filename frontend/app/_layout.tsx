import "../global.css";

import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import "react-native-reanimated";

import { AuthProvider } from "@/contexts/AuthContext";
import { UserPreferencesProvider } from "@/contexts/UserPreferencesContext";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) SplashScreen.hideAsync();
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <UserPreferencesProvider>
        <Stack>
          <Stack.Screen name="(tabs)"    options={{ headerShown: false }} />
          <Stack.Screen name="(auth)"    options={{ headerShown: false }} />
          <Stack.Screen name="thread/[id]"        options={{ headerShown: false }} />
          <Stack.Screen name="bill/[id]"          options={{ headerShown: false }} />
          <Stack.Screen name="profile/activities" options={{ headerShown: false }} />
          <Stack.Screen name="+not-found" />
        </Stack>
      </UserPreferencesProvider>
    </AuthProvider>
  );
}
