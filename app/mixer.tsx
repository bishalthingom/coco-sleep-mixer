import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { BlurView } from "expo-blur";
import { useRouter } from "expo-router";
import { useAtom } from "jotai";
import * as React from "react";
import {
  Animated,
  PanResponder,
  Pressable,
  SafeAreaView,
  Switch,
  Text,
  View,
} from "react-native";
import { catalogAtom, masterGainAtom, mixStateAtom } from "./state/mix";

export default function MixerScreen() {
  const [catalog] = useAtom(catalogAtom);
  const [mix, setMix] = useAtom(mixStateAtom);
  const [master, setMaster] = useAtom(masterGainAtom);
  const router = useRouter();
  // Animated drag to dismiss
  const pan = React.useRef(new Animated.Value(0)).current;
  const backdropOpacity = pan.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const containerHeightRef = React.useRef<number>(0);
  const containerWidthRef = React.useRef<number>(0);
  const TOP_AREA = 72; // px from top to accept drag
  const BOTTOM_AREA = 72; // px from bottom to accept drag
  const HANDLE_HALF_WIDTH = 110; // horizontal half-width around center handle to accept drags

  const panResponder = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt, gs) => {
        // Begin responder if gesture starts near top OR near bottom of the modal
        // or within a wider horizontal band around the grab handle center.
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
        // start responding when gesture starts near top/bottom/handle and it's a downward drag
        return (
          (isTop || isBottom || isHandleArea) &&
          Math.abs(gs.dy) > 6 &&
          Math.abs(gs.dy) > Math.abs(gs.dx)
        );
      },
      onPanResponderGrant: () => {
        // no-op
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) {
          pan.setValue(gs.dy);
        }
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
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 6,
          }).start();
        }
      },
    })
  ).current;

  return (
    <View style={{ flex: 1, backgroundColor: "transparent" }}>
      {/* subtle backdrop dim so text stays readable - animated during drag */}
      <Animated.View
        style={{
          ...({} as any as object), // TS appeasement for spread
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
          style={{
            flex: 1,
            transform: [{ translateY: pan }],
          }}
        >
          <BlurView
            tint="dark"
            intensity={60} // adjust 50–70 to taste
            style={{
              flex: 1,
              borderRadius: 24,
              overflow: "hidden",
              paddingHorizontal: 16,
              paddingTop: 8,
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
                accessibilityLabel="Close mixer"
              >
                <Ionicons name="close" size={22} color="#fff" />
              </Pressable>
            </View>

            <Text
              style={{
                color: "white",
                fontSize: 22,
                fontWeight: "700",
                marginBottom: 12,
                paddingHorizontal: 4,
              }}
            >
              Mixer
            </Text>

            {/* Master */}
            <View
              style={{
                backgroundColor: "rgba(255,255,255,0.05)",
                padding: 12,
                borderRadius: 14,
                marginBottom: 16,
                borderWidth: 1,
                borderColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Text style={{ color: "white", marginBottom: 8, opacity: 0.9 }}>
                Master Volume
              </Text>
              <Slider
                value={master}
                minimumValue={0}
                maximumValue={1}
                onValueChange={setMaster}
                minimumTrackTintColor="#7b6fb3" /* muted lavender */
                maximumTrackTintColor="rgba(255,255,255,0.12)"
                thumbTintColor="#efeafd"
              />
            </View>

            {/* Tracks */}
            {catalog.map((t) => {
              const s = mix[t.id];
              const isOn = s?.isOn ?? false;
              const gain = s?.gain ?? 0.6;
              return (
                <View
                  key={t.id}
                  style={{
                    backgroundColor: "rgba(255,255,255,0.05)",
                    padding: 12,
                    borderRadius: 14,
                    marginBottom: 12,
                    borderWidth: 1,
                    borderColor: "rgba(255,255,255,0.06)",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <Text style={{ color: "white", fontWeight: "600" }}>
                      {t.name}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                      }}
                    >
                      <Text style={{ color: "white", opacity: 0.9 }}>
                        {isOn ? "On" : "Off"}
                      </Text>
                      <Switch
                        value={isOn}
                        onValueChange={(v) =>
                          setMix((prev) => ({
                            ...prev,
                            [t.id]: {
                              ...(prev[t.id] ?? { gain: 0.6 }),
                              isOn: v,
                            },
                          }))
                        }
                        accessibilityLabel={`${t.name} on/off`}
                        trackColor={{
                          false: "rgba(255,255,255,0.06)",
                          true: "rgba(164,139,255,0.60)",
                        }}
                        thumbColor={isOn ? "#f6f0ff" : "#ffffff"}
                      />
                    </View>
                  </View>

                  <Text style={{ color: "white", marginTop: 8, opacity: 0.9 }}>
                    Volume
                  </Text>
                  <Slider
                    value={gain}
                    minimumValue={0}
                    maximumValue={1}
                    onValueChange={(v) =>
                      setMix((prev) => ({
                        ...prev,
                        [t.id]: { ...(prev[t.id] ?? { isOn: false }), gain: v },
                      }))
                    }
                    minimumTrackTintColor="#7b6fb3"
                    maximumTrackTintColor="rgba(255,255,255,0.12)"
                    thumbTintColor="#efeafd"
                  />
                </View>
              );
            })}
          </BlurView>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}
