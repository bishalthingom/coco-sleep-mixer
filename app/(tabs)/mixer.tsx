import Slider from "@react-native-community/slider";
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from "expo-av";
import { Audio } from "expo-av";
import { atom, useAtom } from "jotai";
import * as React from "react";
import { Text, View } from "react-native";

// simple atoms for this tab
const masterGainAtom = atom(0.8);
const isOnAtom = atom(false);

// type guard to narrow AVPlaybackStatus
function isSuccess(s: AVPlaybackStatus): s is AVPlaybackStatusSuccess {
  return "isLoaded" in s && s.isLoaded === true;
}

export default function MixerScreen() {
  const [master, setMaster] = useAtom(masterGainAtom);
  const [isOn, setOn] = useAtom(isOnAtom);
  const soundRef = React.useRef<Audio.Sound | null>(null);

  React.useEffect(() => {
    let mounted = true;

    (async () => {
      // lazy load the sound once
      if (!soundRef.current) {
        const { sound } = await Audio.Sound.createAsync(
          require("../../assets/sounds/mixkit-arcade-game-jump-coin-216.wav"),
          { isLooping: true, shouldPlay: false, volume: master }
        );
        if (!mounted) return;
        soundRef.current = sound;
      }

      const s = soundRef.current;
      if (!s) return;

      await s.setVolumeAsync(master);

      const status = await s.getStatusAsync();
      if (!isSuccess(status)) return;

      if (isOn && !status.isPlaying) {
        await s.playAsync();
      } else if (!isOn && status.isPlaying) {
        await s.pauseAsync();
      }
    })();

    return () => {
      mounted = false;
    };
  }, [master, isOn]);

  React.useEffect(() => {
    return () => {
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: "black", padding: 16 }}>
      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 16,
        }}
      >
        Sleep Mixer (prototype)
      </Text>

      <View
        style={{
          backgroundColor: "#181818",
          padding: 12,
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <Text style={{ color: "white", marginBottom: 8 }}>Master Volume</Text>
        <Slider
          value={master}
          minimumValue={0}
          maximumValue={1}
          onValueChange={setMaster}
        />
      </View>

      <View
        style={{ backgroundColor: "#181818", padding: 12, borderRadius: 12 }}
      >
        <Text style={{ color: "white", marginBottom: 8 }}>
          Single track toggle
        </Text>
        <Text
          onPress={() => setOn((v) => !v)}
          style={{
            color: "white",
            paddingVertical: 10,
            textAlign: "center",
            borderRadius: 8,
            backgroundColor: isOn ? "#2e7d32" : "#6d1b1b",
          }}
        >
          {isOn ? "On (tap to stop)" : "Off (tap to play)"}
        </Text>
      </View>
    </View>
  );
}
