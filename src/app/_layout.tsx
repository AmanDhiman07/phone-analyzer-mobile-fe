import { Stack } from "expo-router";
import "../../global.css";
import React from "react";
import { LogBox } from "react-native";
import { StatusBar } from "expo-status-bar";

LogBox.ignoreLogs([
  "SafeAreaView has been deprecated and will be removed in a future release.",
]);

export default function RootLayout() {
  return (
    <React.Fragment>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }} />
    </React.Fragment>
  );
}
