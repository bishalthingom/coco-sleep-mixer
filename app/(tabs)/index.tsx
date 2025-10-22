import { Audio } from "expo-av";
import * as React from "react";
import { Button, Text, View } from "react-native";

export default function TestScreen() {
  const soundRef = React.useRef<Audio.Sound | null>(null);

  const playOnce = async () => {
    const { sound } = await Audio.Sound.createAsync(
      require("../../assets/sounds/mixkit-arcade-game-jump-coin-216.wav"),
      { shouldPlay: true, isLooping: false, volume: 0.6 }
    );
    soundRef.current = sound;
  };

  React.useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        gap: 12,
        padding: 24,
      }}
    >
      <Text style={{ fontSize: 18 }}>Audio sanity check</Text>
      <Button title="Play test sound" onPress={playOnce} />
    </View>
  );
}
