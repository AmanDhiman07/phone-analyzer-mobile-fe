import { useEffect, useRef } from "react";
import { View, Text, Animated, Easing } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

export default function SplashScreen() {
  const router = useRouter();
  const fade = useRef(new Animated.Value(0)).current;
  const rise = useRef(new Animated.Value(18)).current;
  const logoScale = useRef(new Animated.Value(0.8)).current;
  const pulse = useRef(new Animated.Value(0)).current;
  const spin = useRef(new Animated.Value(0)).current;
  const progress = useRef(new Animated.Value(0)).current;
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const entrance = Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(rise, {
        toValue: 0,
        duration: 620,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 680,
        easing: Easing.out(Easing.back(1.45)),
        useNativeDriver: true,
      }),
    ]);

    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 0,
          duration: 760,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    const progressAnim = Animated.timing(progress, {
      toValue: 1,
      duration: 1850,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1,
        duration: 900,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );

    entrance.start();
    pulseLoop.start();
    spinLoop.start();
    progressAnim.start();
    shimmerLoop.start();

    const t = setTimeout(() => {
      router.replace("/home");
    }, 2000);

    return () => {
      clearTimeout(t);
      pulseLoop.stop();
      spinLoop.stop();
      shimmerLoop.stop();
      progress.stopAnimation();
      shimmer.stopAnimation();
      spin.stopAnimation();
      pulse.stopAnimation();
    };
  }, [fade, logoScale, progress, pulse, rise, router, shimmer, spin]);

  const spinRotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const pulseScale = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.12],
  });

  const pulseOpacity = pulse.interpolate({
    inputRange: [0, 1],
    outputRange: [0.24, 0.08],
  });

  const shimmerX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-120, 170],
  });

  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      <View className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-[#0d2a4d]/50" />
      <View className="absolute bottom-24 -right-24 w-72 h-72 rounded-full bg-[#0f3a37]/40" />

      <Animated.View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: 24,
          opacity: fade,
          transform: [{ translateY: rise }],
        }}
      >
        <View className="mb-6 items-center justify-center">
          <Animated.View
            style={{
              position: "absolute",
              width: 132,
              height: 132,
              borderRadius: 999,
              backgroundColor: "#0ea5e9",
              opacity: pulseOpacity,
              transform: [{ scale: pulseScale }],
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              width: 150,
              height: 150,
              borderRadius: 999,
              borderWidth: 1,
              borderColor: "#1f3b68",
              transform: [{ rotate: spinRotate }],
            }}
          />
          <Animated.View
            style={{ transform: [{ scale: logoScale }] }}
            className="w-28 h-28 rounded-3xl bg-[#0f1729] border border-[#1f2937] items-center justify-center"
          >
            <Ionicons name="shield-checkmark" size={52} color="#38bdf8" />
          </Animated.View>
        </View>
        <Text className="text-white text-4xl font-bold tracking-tight mb-1">
          DataGuard
        </Text>
        <Text className="text-[#94a3b8] text-sm mb-8">
          Secure Local Protection
        </Text>
        <View className="w-40 h-1.5 rounded-full bg-[#12253f] overflow-hidden">
          <Animated.View
            style={{
              width: "100%",
              height: "100%",
              backgroundColor: "#0ea5e9",
              transform: [{ scaleX: progress }],
            }}
          />
          <Animated.View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: 28,
              height: "100%",
              backgroundColor: "#7dd3fc",
              opacity: 0.7,
              transform: [{ translateX: shimmerX }],
            }}
          />
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}
