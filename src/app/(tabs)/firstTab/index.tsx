import { Button, View } from "react-native";
import { AppText } from "@/components/AppText";
import { router } from "expo-router";

export default function FirstTab() {
  return (
    <View>
      <AppText>First Tab</AppText>
      <Button
        title="Go to Second Tab"
        onPress={() => router.push("/(tabs)/secondTab")}
      />
      <Button
        title="Go to Third Tab"
        onPress={() => router.push("/(tabs)/thirdTab")}
      />
      <Button
        title="Go to First Page"
        onPress={() => router.push("/(tabs)/firstTab/firstPage")}
      />
    </View>
  );
}
