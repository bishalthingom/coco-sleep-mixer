import { Ionicons } from "@expo/vector-icons";
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";
import { Pressable } from "react-native";

export default function RootLayout() {
  const router = useRouter();

  useEffect(() => {
    Audio.setAudioModeAsync({
      playsInSilentModeIOS: true,
      allowsRecordingIOS: false,
      staysActiveInBackground: false,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
    }).catch(() => {});
  }, []);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Sleepy Coco",
          headerRight: () => (
            <Pressable
              onPress={() => router.push("/mixer")}
              hitSlop={12}
              style={{ paddingHorizontal: 8 }}
              accessibilityLabel="Open mixer settings"
            >
              <Ionicons name="settings-outline" size={22} />
            </Pressable>
          ),
        }}
      />
      Use 'modal' if you want Mixer to slide up; or remove 'presentation' for a
      normal push
      <Stack.Screen
        name="mixer"
        options={{
          title: "Mixer",
          presentation: "modal", // ⬅️ this makes it slide up as a modal
        }}
      />
    </Stack>
  );
}
