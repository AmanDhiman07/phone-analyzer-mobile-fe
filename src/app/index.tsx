import { useEffect } from "react";
import { View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SplashScreen() {
  const router = useRouter();

  useEffect(() => {
    const t = setTimeout(() => router.replace("/home"), 2500);
    return () => clearTimeout(t);
  }, [router]);

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]" edges={["top", "bottom"]}>
      <View className="flex-1 justify-between items-center pt-12 pb-8 px-6">
        <View className="items-center flex-1 justify-center">
          <View className="w-24 h-24 rounded-2xl bg-[#1e3a5f] items-center justify-center mb-6">
            <Ionicons name="shield-checkmark" size={48} color="#38bdf8" />
          </View>
          <Text className="text-white text-3xl font-bold tracking-tight mb-2">
            DataGuard
          </Text>
          <Text className="text-[#7dd3fc] text-sm tracking-widest uppercase">
            Secure Backup
          </Text>
        </View>
        <View className="w-full items-center">
          <View className="h-1 w-20 bg-[#2563eb] rounded-full mb-4" />
          <Text className="text-white/70 text-xs">
            Powered by Your Organization
          </Text>
        </View>
        <Pressable
          onPress={() => router.replace("/home")}
          className="w-full py-3 rounded-lg bg-[#1e40af] active:opacity-80"
        >
          <Text className="text-white text-center font-semibold">
            Get Started
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
