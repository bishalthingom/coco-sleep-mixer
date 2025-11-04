import FontAwesome from "@expo/vector-icons/FontAwesome";
import type { AVPlaybackStatus, AVPlaybackStatusSuccess } from "expo-av";
import { Audio } from "expo-av";
import { useRouter } from "expo-router";
import { useAtom } from "jotai";
import * as React from "react";
import {
  Animated,
  Easing,
  ImageBackground,
  Pressable, // ⬅️ added
  StyleSheet,
  Text,
  Alert,
  useWindowDimensions,
  View,
  PanResponder,
  Modal,
  TouchableOpacity,
  SafeAreaView,
  Platform,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { catalogAtom, masterGainAtom, mixStateAtom } from "./state/mix";

export default function HomeScreen() {
  const soundRefs = React.useRef<Record<string, Audio.Sound | null>>({});
  const { width, height } = useWindowDimensions();
  const minSide = Math.min(width, height);
  const diameter = Math.max(120, Math.min(minSide * 0.5, 320));
  const radius = diameter / 2;
  const smallDiameter = Math.max(96, Math.min(minSide * 0.35, 220));
  const smallRadius = smallDiameter / 2;

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
  // Scheduler state & helpers
  const [scheduledAt, setScheduledAt] = React.useState<Date | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [countdownText, setCountdownText] = React.useState<string | null>(null);
  const [showScheduleModal, setShowScheduleModal] = React.useState(false);
  const [selectedTime, setSelectedTime] = React.useState<Date>(() => new Date());

  const formatTime = (d: Date) => {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };

  const clearExistingTimers = () => {
    try {
      if (timerRef.current) {
        clearTimeout(timerRef.current as any);
        timerRef.current = null;
      }
    } catch {}
    try {
      if (intervalRef.current) {
        clearInterval(intervalRef.current as any);
        intervalRef.current = null;
      }
    } catch {}
  };

  const cancelSchedule = React.useCallback(() => {
    clearExistingTimers();
    setScheduledAt(null);
    setCountdownText(null);
  }, []);

  

  const scheduleInternal = (target: Date) => {
    cancelSchedule();
    setScheduledAt(target);
    const ms = Math.max(0, target.getTime() - Date.now());

    timerRef.current = setTimeout(() => {
      // when timer fires, check if any tracks are enabled
      const selected = catalog.filter((t) => mix[t.id]?.isOn);
      if (selected.length === 0) {
        setCountdownText("No tracks selected");
        cancelSchedule();
        return;
      }
      (async () => {
        // start playback if not already playing
        if (!isPlaying) {
          await togglePlayPause();
        }
        cancelSchedule();
      })();
    }, ms) as any;

    // update countdown every second
    intervalRef.current = setInterval(() => {
      const diff = Math.max(0, target.getTime() - Date.now());
      if (diff <= 0) {
        setCountdownText("Starting…");
        clearExistingTimers();
        return;
      }
      const mins = Math.floor(diff / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      if (mins > 0) setCountdownText(`Starting in ${mins}m ${secs}s…`);
      else setCountdownText(`Starting in ${secs}s…`);
    }, 1000) as any;
  };

  const scheduleIn = (minutes: number) => {
    const d = new Date(Date.now() + minutes * 60 * 1000);
    scheduleInternal(d);
  };
 

  const scheduleAt = (date: Date) => {
    // if time has already passed today, schedule for tomorrow
    const now = Date.now();
    let target = date;
    if (date.getTime() - now < 0) {
      target = new Date(date.getTime() + 24 * 60 * 60 * 1000);
    }
    scheduleInternal(target);
  };


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
      // If a schedule existed, clear it since user started playback manually
      cancelSchedule();
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

  // clean up scheduler timers on unmount
  React.useEffect(() => {
    return () => {
      cancelSchedule();
    };
  }, [cancelSchedule]);

  const glow = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const router = useRouter();

  // Pan/drag for schedule modal (mirror Mixer behavior)
  const pan = React.useRef(new Animated.Value(0)).current;
  const backdropOpacity = pan.interpolate({
    inputRange: [0, 300],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });
  const containerHeightRef = React.useRef<number>(0);
  const containerWidthRef = React.useRef<number>(0);
  const TOP_AREA = 72;
  const BOTTOM_AREA = 72;
  const HANDLE_HALF_WIDTH = 110;

  const panResponder = React.useRef(
    PanResponder.create({
  onStartShouldSetPanResponder: (evt: any, gs: any) => {
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
  onMoveShouldSetPanResponder: (evt: any, gs: any) => {
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
      onPanResponderMove: (_: any, gs: any) => {
        if (gs.dy > 0) pan.setValue(gs.dy);
      },
      onPanResponderRelease: (_: any, gs: any) => {
        const shouldClose = gs.dy > 120 || gs.vy > 0.9;
        if (shouldClose) {
          Animated.timing(pan, {
            toValue: 500,
            duration: 180,
            useNativeDriver: true,
          }).start(() => {
            // hide the modal after the animation; pan will be reset when modal re-opens
            setShowScheduleModal(false);
          });
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

  React.useEffect(() => {
    if (showScheduleModal) {
      pan.setValue(0);
    }
  }, [showScheduleModal]);

  // animate the schedule sheet closed then hide modal
  const closeScheduleAnimated = React.useCallback(() => {
    Animated.timing(pan, {
      toValue: 500,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setShowScheduleModal(false);
    });
  }, [pan]);

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
      {/* Floating settings cog (top-right) */}
      <Pressable
        onPress={() => router.push("/settings")}
        hitSlop={8}
        accessibilityLabel="Open settings"
        style={{
          position: "absolute",
          top: Math.max(insets.top, height * 0.08),
          right: Math.max(12, width * 0.05),
          padding: 4,
          zIndex: 100,
        }}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: "rgba(255,255,255,0.06)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <FontAwesome name="cog" size={25} color="#fff" />
        </View>
      </Pressable>
      <View style={styles.content}>
        {/* Large central play control (restored) */}
        <Animated.View
          style={{
            shadowColor: "#8ab8ff",
            shadowOpacity,
            shadowRadius,
            shadowOffset: { width: 0, height: 0 },
            elevation: 12,
            borderRadius: radius,
            marginBottom: 16,
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
              size={Math.max(52, diameter * 0.28)}
              color="#ffffff"
            />
          </Pressable>
        </Animated.View>

        {/* Scheduler row: quick chips + schedule sheet */}
        {!scheduledAt ? (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            {[10, 20, 30].map((m) => (
              <TouchableOpacity
                key={m}
                onPress={() => scheduleIn(m)}
                style={{
                  paddingVertical: 8,
                  paddingHorizontal: 12,
                  borderRadius: 20,
                  backgroundColor: "rgba(255,255,255,0.06)",
                  marginRight: 10,
                }}
              >
                <Text style={{ color: "white", fontWeight: "600" }}>{`${m}m`}</Text>
              </TouchableOpacity>
            ))}

            <Pressable
              onPress={() => {
                setShowScheduleModal(true);
              }}
              style={({ pressed }) => ({
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: pressed ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                flexDirection: "row",
                alignItems: "center",
              })}
            >
              <FontAwesome name="clock-o" size={16} color="#fff" style={{ marginRight: 8 }} />
              <Text style={{ color: "white", fontWeight: "600" }}>Schedule</Text>
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: "row", alignItems: "center", marginTop: 12 }}>
            <Text style={{ color: "white", marginRight: 12 }}>{countdownText ?? "Scheduled"}</Text>
            <TouchableOpacity
              onPress={cancelSchedule}
              style={{
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 20,
                backgroundColor: "rgba(255,255,255,0.06)",
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.status}>{isPlaying ? "Playing selected mix" : "Paused"}</Text>
        <MiniMixerBar />

        {/* Schedule modal: simple HH:MM input */}
        <Modal visible={showScheduleModal} transparent animationType="slide">
          <View style={{ flex: 1, backgroundColor: "transparent" }}>
            {/* backdrop similar to mixer (opacity driven by pan) */}
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

            <SafeAreaView style={{ flex: 1, padding: 16, justifyContent: "flex-end" }}>
              <Animated.View
                {...panResponder.panHandlers}
                onLayout={(e: any) => {
                  containerHeightRef.current = e.nativeEvent.layout.height;
                  containerWidthRef.current = e.nativeEvent.layout.width;
                }}
                style={{
                  transform: [{ translateY: pan }],
                }}
              >
                <BlurView
                  tint="dark"
                  intensity={60}
                  style={{
                    borderRadius: 24,
                    overflow: "hidden",
                    paddingHorizontal: 16,
                    paddingTop: 8,
                    paddingBottom: 16,
                  }}
                >
                <View {...panResponder.panHandlers} style={{ alignItems: "center", justifyContent: "center", paddingTop: 8, paddingBottom: 4 }}>
                  <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.35)", marginBottom: 6 }} />
                  <Pressable
                    onPress={() => setShowScheduleModal(false)}
                    hitSlop={12}
                    style={{ position: "absolute", right: 6, top: 0, padding: 8 }}
                    accessibilityLabel="Close schedule"
                  >
                    <Ionicons name="close" size={22} color="#fff" />
                  </Pressable>
                </View>

                <Text style={{ color: "white", fontSize: 22, fontWeight: "700", marginTop: 4, marginBottom: 12, textAlign: "center" }}>Schedule</Text>

                <Text style={{ color: "white", opacity: 0.8, marginBottom: 8 }}>Pick a time to start playback</Text>
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <Text style={{ color: "white" }}>Selected: {formatTime(selectedTime)}</Text>
                </View>

                <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                  <Pressable onPress={() => { closeScheduleAnimated(); }} style={({ pressed }) => ({ padding: 10, marginRight: 8 })}>
                    <Text style={{ color: "white", opacity: 0.8 }}>Close</Text>
                  </Pressable>

                  <Pressable
                    onPress={() => {
                      const now = new Date();
                      const target = new Date(now.getFullYear(), now.getMonth(), now.getDate(), selectedTime.getHours(), selectedTime.getMinutes(), 0, 0);
                      scheduleAt(target);
                      closeScheduleAnimated();
                      
                    }}
                    style={({ pressed }) => ({ padding: 10 })}
                  >
                      <Text style={{ color: "white", fontWeight: "600" }}>Schedule</Text>
                  </Pressable>
                </View>
                  {/* show DateTimePicker immediately when modal opens */}
                  {showScheduleModal ? (
                    <DateTimePicker
                      value={selectedTime}
                      mode="time"
                      is24Hour={true}
                      display={Platform.OS === "ios" ? "spinner" : "clock"}
                      onChange={(event: any, date?: Date) => {
                        if (date) {
                          setSelectedTime(date);
                        }
                        // on Android the picker is a dialog and should be hidden after selection
                      
                      }}
                    />
                  ) : null}
                </BlurView>
              </Animated.View>
            </SafeAreaView>
          </View>
        </Modal>
      </View>
    </ImageBackground>
  );
}

function MiniMixerBar() {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push("/mixer")}
      accessibilityRole="button"
      accessibilityLabel="Open mixer"
      style={{
        position: "absolute",
        left: 12,
        right: 12,
        bottom: Math.max(insets.bottom, 12),
        borderRadius: 16,
        backgroundColor: "rgba(20,20,22,0.75)", // translucent, over bg image
        paddingVertical: 12,
        paddingHorizontal: 16,
        shadowColor: "#000",
        shadowOpacity: 0.25,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.08)",
        backdropFilter: "blur(10px)" as any, // iOS only; harmless elsewhere
      }}
    >
      {/* little grab-handle */}
      <View
        style={{
          alignSelf: "center",
          width: 36,
          height: 4,
          borderRadius: 2,
          backgroundColor: "rgba(255,255,255,0.35)",
          marginBottom: 10,
        }}
      />

      {/* placeholder content (wire to real mix later) */}
      <Text
        style={{
          color: "white",
          fontSize: 14,
          opacity: 0.8,
          marginBottom: 2,
        }}
      >
        Mixer
      </Text>
      <Text
        style={{
          color: "white",
          fontSize: 16,
          fontWeight: "600",
        }}
      >
        Placeholder — tap to open
      </Text>
    </Pressable>
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
