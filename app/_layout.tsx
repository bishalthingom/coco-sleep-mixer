import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from "expo-av";
import { Stack, useRouter } from "expo-router";
import { useEffect } from "react";

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
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="index"
        options={
          {
            // header hidden globally
          }
        }
      />
      Use 'modal' if you want Mixer to slide up; or remove 'presentation' for a
      normal push
      <Stack.Screen
        name="mixer"
        options={{
          presentation: "transparentModal", // overlays Home
          animation: "slide_from_bottom",
          contentStyle: { backgroundColor: "transparent" }, // no opaque card
        }}
      />
    </Stack>
  );
}
