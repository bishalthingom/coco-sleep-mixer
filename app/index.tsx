import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from "expo-av";
import { Audio } from "expo-av";
import { useAtom } from "jotai";
import * as React from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Pressable, // ⬅️ added
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { catalogAtom, masterGainAtom, mixStateAtom } from "./state/mix";

export default function HomeScreen() {
  const soundRefs = React.useRef<Record<string, Audio.Sound | null>>({});
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const diameter = Math.max(120, Math.min(minSide * 0.5, 320));
  const radius = diameter / 2;

  const [isPlaying, setIsPlaying] = React.useState(false);
  const [catalog] = useAtom(catalogAtom);
  const [mix] = useAtom(mixStateAtom);
  const [master] = useAtom(masterGainAtom);

  const ensureLoaded = React.useCallback(
    async (id: string, source: any, vol: number) => {
      if (!soundRefs.current[id]) {
        const { sound } = await Audio.Sound.createAsync(source, {
          isLooping: true,
          shouldPlay: false,
          volume: vol,
        });
        soundRefs.current[id] = sound;
      } else {
        await soundRefs.current[id]!.setVolumeAsync(vol);
      }
    },
    []
  );

  function isSuccess(s: AVPlaybackStatus): s is AVPlaybackStatusSuccess {
    return "isLoaded" in s && s.isLoaded === true;
  }

  const togglePlayPause = async () => {
    const selected = catalog.filter((t) => mix[t.id]?.isOn);
    if (selected.length === 0) return;

    if (!isPlaying) {
      for (const t of selected) {
        const vol = (mix[t.id]?.gain ?? 0.6) * master;
        await ensureLoaded(t.id, t.source, vol);
        try {
          const st = await soundRefs.current[t.id]!.getStatusAsync();
          if (isSuccess(st) && !st.isPlaying) {
            await soundRefs.current[t.id]!.playAsync();
          }
        } catch {}
      }
      setIsPlaying(true);
    } else {
      for (const id of Object.keys(soundRefs.current)) {
        try {
          const st = await soundRefs.current[id]!.getStatusAsync();
          if (isSuccess(st) && st.isPlaying) {
            await soundRefs.current[id]!.pauseAsync();
          }
        } catch {}
      }
      setIsPlaying(false);
    }
  };

  React.useEffect(() => {
    if (!isPlaying) return;
    let cancelled = false;

    (async () => {
      const selectedIds = new Set(
        catalog.filter((t) => mix[t.id]?.isOn).map((t) => t.id)
      );

      for (const t of catalog) {
        const wantOn = selectedIds.has(t.id);
        const s = soundRefs.current[t.id];

        if (wantOn) {
          const vol = (mix[t.id]?.gain ?? 0.6) * master;
          await ensureLoaded(t.id, t.source, vol);
          try {
            const st = await soundRefs.current[t.id]!.getStatusAsync();
            if (!cancelled && isSuccess(st) && !st.isPlaying) {
              await soundRefs.current[t.id]!.playAsync();
            }
          } catch {}
        } else if (s) {
          try {
            const st = await s.getStatusAsync();
            if (!cancelled && isSuccess(st) && st.isPlaying) {
              await s.pauseAsync();
            }
          } catch {}
        }
      }

      for (const t of catalog) {
        const s = soundRefs.current[t.id];
        if (!s) continue;
        const vol = (mix[t.id]?.gain ?? 0) * master;
        try {
          await s.setVolumeAsync(vol);
        } catch {}
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [mix, master, isPlaying, catalog, ensureLoaded]);

  React.useEffect(() => {
    return () => {
      const refs = soundRefs.current;
      soundRefs.current = {};
      Promise.all(
        Object.values(refs).map((s) => s?.unloadAsync().catch(() => {}))
      ).catch(() => {});
    };
  }, []);

  const glow = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (isPlaying) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false, // animates shadow props on iOS
          }),
          Animated.timing(glow, {
            toValue: 0,
            duration: 1500,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: false,
          }),
        ])
      ).start();
    } else {
      glow.stopAnimation(() => glow.setValue(0));
    }
  }, [isPlaying]);

  const shadowOpacity = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.35, 0.8],
  });

  const shadowRadius = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 36],
  });

  return (
    <ImageBackground
      source={require("../assets/images/cats-cute-night.jpg")}
      style={styles.bg}
      resizeMode="cover"
    >
      <View style={styles.content}>
        <Animated.View
          style={{
            // pulsing halo
            shadowColor: "#8ab8ff",
            shadowOpacity,
            shadowRadius,
            shadowOffset: { width: 0, height: 0 },
            // Android fallback: elevation cannot animate, but a fixed value still gives a soft aura
            elevation: 16,
            borderRadius: radius,
          }}
        >
          <Pressable
            onPress={togglePlayPause}
            android_ripple={{ color: "#00000022", radius }}
            style={({ pressed }) => ({
              width: diameter,
              height: diameter,
              borderRadius: radius,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: pressed ? "#1f2937" : "#111827",
            })}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? "Pause mix" : "Play mix"}
          >
            <FontAwesome
              name={isPlaying ? "pause" : "play"}
              size={Math.max(48, diameter * 0.28)}
              color="#ffffff"
            />
          </Pressable>
        </Animated.View>

        <Text style={styles.status}>
          {isPlaying ? "Playing selected mix" : "Paused"}
        </Text>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    color: "white",
    marginBottom: 12,
    fontSize: 18,
    fontWeight: "600",
  },
  status: {
    marginTop: 16,
    fontSize: 16,
    color: "white",
    opacity: 0.85,
  },
});
