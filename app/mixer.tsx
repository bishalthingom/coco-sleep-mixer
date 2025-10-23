import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import { useRouter } from "expo-router";
import { useAtom } from "jotai";
import * as React from "react";
import { Pressable, Switch, Text, View } from "react-native";
import { catalogAtom, masterGainAtom, mixStateAtom } from "./state/mix";

export default function MixerScreen() {
  const [catalog] = useAtom(catalogAtom);
  const [mix, setMix] = useAtom(mixStateAtom);
  const [master, setMaster] = useAtom(masterGainAtom);
  const router = useRouter();

  return (
    <View style={{ flex: 1, backgroundColor: "black", padding: 16 }}>
      <Pressable
        onPress={() => router.back()}
        hitSlop={12}
        style={{ alignSelf: "flex-end", padding: 8 }}
        accessibilityLabel="Close mixer"
      >
        <Ionicons name="close" size={22} />
      </Pressable>
      <Text
        style={{
          color: "white",
          fontSize: 22,
          fontWeight: "700",
          marginBottom: 12,
        }}
      >
        Mixer
      </Text>

      {/* Master */}
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

      {/* Tracks */}
      {catalog.map((t) => {
        const s = mix[t.id];
        return (
          <View
            key={t.id}
            style={{
              backgroundColor: "#181818",
              padding: 12,
              borderRadius: 12,
              marginBottom: 12,
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
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <Text style={{ color: "white" }}>On</Text>
                <Switch
                  value={s?.isOn ?? false}
                  onValueChange={(v) =>
                    setMix((prev) => ({
                      ...prev,
                      [t.id]: { ...(prev[t.id] ?? { gain: 0.6 }), isOn: v },
                    }))
                  }
                />
              </View>
            </View>

            <Text style={{ color: "white", marginTop: 8 }}>Volume</Text>
            <Slider
              value={s?.gain ?? 0.6}
              minimumValue={0}
              maximumValue={1}
              onValueChange={(v) =>
                setMix((prev) => ({
                  ...prev,
                  [t.id]: { ...(prev[t.id] ?? { isOn: false }), gain: v },
                }))
              }
            />
          </View>
        );
      })}
    </View>
  );
}
