import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="firstTab" options={{ title: "First Tab" }} />
    </Tabs>
  );
}
