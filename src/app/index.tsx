import { Redirect } from "expo-router";
import { AppText } from "@/components/AppText";
import { View } from "react-native";

export default function IndexScreen() {
  return (
    <View className="justify-center flex-1 text-red-500 p-4">
      <AppText center>welcome, Phone Analyzer</AppText>
    </View>
  );
}
