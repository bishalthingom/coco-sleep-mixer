import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from "expo-av";
import { Audio } from "expo-av";
import { useAtom } from "jotai";
import * as React from "react";
import {
  Platform,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { catalogAtom, masterGainAtom, mixStateAtom } from "../../app/state/mix";

export default function TestScreen() {
  const soundRefs = React.useRef<Record<string, Audio.Sound | null>>({});
  // screen size → button size
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const diameter = Math.max(120, Math.min(minSide * 0.5, 320));
  const radius = diameter / 2;

  // local play/pause state for the mix
  const [isPlaying, setIsPlaying] = React.useState(false);

  // atoms: catalog (list of tracks), user selections, and master gain
  const [catalog] = useAtom(catalogAtom);
  const [mix] = useAtom(mixStateAtom);
  const [master] = useAtom(masterGainAtom);

  // ensure a track is loaded and volume is set
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
    if (selected.length === 0) {
      // no tracks selected; later we can show a toast
      return;
    }

    if (!isPlaying) {
      // load + play selected tracks
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
      // pause every loaded track
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

      // start any newly-enabled tracks
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
          // turn off tracks no longer selected
          try {
            const st = await s.getStatusAsync();
            if (!cancelled && isSuccess(st) && st.isPlaying) {
              await s.pauseAsync();
            }
          } catch {}
        }
      }

      // update volume for all loaded tracks
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
        accessibilityLabel={isPlaying ? "Pause mix" : "Play mix"}
      >
        <FontAwesome
          name={isPlaying ? "pause" : "play"}
          size={Math.max(48, diameter * 0.28)}
          color="#ffffff"
        />
      </Pressable>

      <Text style={{ marginTop: 16, fontSize: 16, color: "#6b7280" }}>
        {isPlaying ? "Playing selected mix" : "Paused"}
      </Text>
    </View>
  );
}
