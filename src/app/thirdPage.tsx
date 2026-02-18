import { Button, View } from "react-native";
import { AppText } from "@/components/AppText";
import { Link, router } from "expo-router";

export default function ThirdPage() {
  return (
    <View className="justify-center flex-1 text-red-500 p-4">
      <AppText center bold className="text-2xl">Third Page</AppText>
   
     
    </View>
  );
}