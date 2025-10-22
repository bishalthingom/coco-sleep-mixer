import FontAwesome from "@expo/vector-icons/FontAwesome";
import { Audio } from "expo-av";
import * as React from "react";
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";

export default function TestScreen() {
  const soundRef = React.useRef<Audio.Sound | null>(null);
  const { width, height } = useWindowDimensions();
  const [isPlaying, setIsPlaying] = React.useState(false);

  const playOnce = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require("../../assets/sounds/dreaming-castle-soft-piano-music-259726.mp3"),
      { shouldPlay: true, isLooping: false, volume: 0.6 }
    );
    soundRef.current = sound;
  };

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      // preload the sound once, set to loop but don't play yet
      const { sound } = await Audio.Sound.createAsync(
        require("../../assets/sounds/dreaming-castle-soft-piano-music-259726.mp3"),
        { isLooping: true, shouldPlay: false, volume: 0.6 }
      );
      if (!mounted) return;
      soundRef.current = sound;
    })();

    return () => {
      mounted = false;
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const togglePlayPause = async () => {
    const s = soundRef.current;
    if (!s) return;
    try {
      const status = await s.getStatusAsync();
      if ("isLoaded" in status && status.isLoaded) {
        if (status.isPlaying) {
          await s.pauseAsync();
          setIsPlaying(false);
        } else {
          await s.playAsync();
          setIsPlaying(true);
        }
      }
    } catch {}
  };

  // Big button to play/pause the looping sound
  const minSide = Math.min(width, height);
  const diameter = Math.max(120, Math.min(minSide * 0.5, 320));
  const radius = diameter / 2;

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
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
          // soft shadow
          ...Platform.select({
            ios: {
              shadowColor: "#000",
              shadowOpacity: 0.25,
              shadowRadius: 16,
              shadowOffset: { width: 0, height: 12 },
            },
            android: { elevation: 8 },
          }),
        })}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? "Pause" : "Play"}
      >
        <FontAwesome
          name={isPlaying ? "pause" : "play"}
          size={Math.max(48, diameter * 0.28)}
          color="#ffffff"
        />
      </Pressable>

      <Text style={{ marginTop: 16, fontSize: 16, color: "#6b7280" }}>
        {isPlaying ? "Playing" : "Paused"}
      </Text>
    </View>
  );
}
