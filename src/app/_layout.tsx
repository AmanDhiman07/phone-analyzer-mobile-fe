import { Stack } from "expo-router";
import "../../global.css";
import React from "react";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";

// Suppress SafeAreaView deprecation from react-native-css-interop (NativeWind);
// we use SafeAreaView from react-native-safe-area-context in our screens.
LogBox.ignoreLogs([
  "SafeAreaView has been deprecated",
]);

export default function RootLayout() {
  return (
    <React.Fragment>
      <StatusBar style="auto" />
      <Stack screenOptions={{ headerShown: false }} />
    </React.Fragment>
  );
}
