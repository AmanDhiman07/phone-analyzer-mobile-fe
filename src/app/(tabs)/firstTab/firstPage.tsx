import { View } from "react-native";
import { AppText } from "@/components/AppText";

export default function FirstPage() {
  return (
    <View className="justify-center flex-1 text-red-500 p-4">
      <AppText center bold className="text-2xl">First Page</AppText>
    </View>
  );
}
