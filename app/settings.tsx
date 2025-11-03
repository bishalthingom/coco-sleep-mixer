import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as React from "react";
import { Animated, PanResponder } from "react-native";
import { Pressable, SafeAreaView, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // gesture + animation for swipe-to-close
  const pan = React.useRef(new Animated.Value(0)).current;
  const containerHeightRef = React.useRef<number>(0);
  const containerWidthRef = React.useRef<number>(0);
  const TOP_AREA = 72;
  const BOTTOM_AREA = 72;
  const HANDLE_HALF_WIDTH = 110;

  const backdropOpacity = pan.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gs) => {
        const y = evt.nativeEvent.locationY ?? 0;
        const x = evt.nativeEvent.locationX ?? 0;
        const h = containerHeightRef.current || 0;
        const w = containerWidthRef.current || 0;
        const isTop = y < TOP_AREA;
        const isBottom = h ? y > h - BOTTOM_AREA : false;
        const centerX = w / 2;
        const isHandleArea = Math.abs(x - centerX) < HANDLE_HALF_WIDTH;
        return isTop || isBottom || isHandleArea;
      },
      onMoveShouldSetPanResponder: (evt, gs) => {
        const y = evt.nativeEvent.locationY ?? 0;
        const x = evt.nativeEvent.locationX ?? 0;
        const h = containerHeightRef.current || 0;
        const w = containerWidthRef.current || 0;
        const isTop = y < TOP_AREA;
        const isBottom = h ? y > h - BOTTOM_AREA : false;
        const centerX = w / 2;
        const isHandleArea = Math.abs(x - centerX) < HANDLE_HALF_WIDTH;
        return (
          (isTop || isBottom || isHandleArea) &&
          Math.abs(gs.dy) > 6 &&
          Math.abs(gs.dy) > Math.abs(gs.dx)
        );
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) pan.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        const shouldClose = gs.dy > 120 || gs.vy > 0.9;
        if (shouldClose) {
          Animated.timing(pan, {
            toValue: 1000,
            duration: 180,
            useNativeDriver: true,
          }).start(() => router.back());
        } else {
          Animated.spring(pan, { toValue: 0, useNativeDriver: true, bounciness: 6 }).start();
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      <Animated.View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 0,
          bottom: 0,
          backgroundColor: "rgba(10,10,12,0.25)",
          opacity: backdropOpacity,
        }}
      />

      <SafeAreaView style={{ flex: 1, padding: 16 }}>
        <Animated.View
          {...panResponder.panHandlers}
          onLayout={(e) => {
            containerHeightRef.current = e.nativeEvent.layout.height;
            containerWidthRef.current = e.nativeEvent.layout.width;
          }}
          style={{ flex: 1, transform: [{ translateY: pan }] }}
        >
          <BlurView
            tint="dark"
            intensity={60}
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: "hidden",
              paddingHorizontal: 16,
              paddingTop: 8 + Math.max(insets.top, 8),
              paddingBottom: 16,
            }}
          >
          {/* grab handle + close */}
          <View
            style={{
              alignItems: "center",
              justifyContent: "center",
              paddingTop: 8,
              paddingBottom: 4,
            }}
          >
            <View
              style={{
                width: 40,
                height: 4,
                borderRadius: 2,
                backgroundColor: "rgba(255,255,255,0.35)",
                marginBottom: 6,
              }}
            />
            <Pressable
              onPress={() => router.back()}
              hitSlop={12}
              style={{ position: "absolute", right: 6, top: 0, padding: 8 }}
              accessibilityLabel="Close settings"
            >
              <Ionicons name="close" size={22} color="#fff" />
            </Pressable>
          </View>

          <Text
            style={{
              color: "white",
              fontSize: 22,
              fontWeight: "700",
              marginTop: 8,
              marginBottom: 16,
              textAlign: "center",
            }}
          >
            Settings
          </Text>

          <View style={{ padding: 8 }}>
            <Text style={{ color: "#ddd", marginBottom: 8 }}>
              This settings screen matches the mixer modal style (blurred card,
              translucent backdrop). Add controls here for theme, audio prefs,
              or other app options.
            </Text>
            <Text style={{ color: "#bbb" }}>
              Example: master volume, theme toggle, logs, or export/import.
            </Text>
          </View>
          </BlurView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
