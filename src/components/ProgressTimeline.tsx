// src/components/ProgressTimeline.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, SP } from "@/theme/tokens";
import { Check } from "@/theme/icons";

export type TimelineState = "done" | "current" | "upcoming";

export interface TimelineStep {
  key: string;
  title: string;
  description?: string;
  timestamp?: string;
  state: TimelineState;
}

export interface ProgressTimelineProps {
  steps: TimelineStep[];
  style?: ViewStyle;
}

export function ProgressTimeline({ steps, style }: Readonly<ProgressTimelineProps>) {
  return (
    <View style={style}>
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const done = s.state === "done";
        const current = s.state === "current";
        const dotColor = done ? C.success : current ? C.primary : C.border;
        const lineColor = done ? C.success : C.borderSubtle;
        return (
          <View key={s.key} style={{ flexDirection: "row", gap: SP.md }}>
            <View style={{ alignItems: "center", width: 24 }}>
              <View
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 12,
                  backgroundColor: done ? C.success : current ? C.primaryTint : C.surface,
                  borderWidth: current ? 2 : done ? 0 : 1.5,
                  borderColor: current ? C.primary : C.border,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {done ? (
                  <Check size={14} color={C.textInverse} strokeWidth={3} />
                ) : (
                  <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: current ? C.primary : dotColor }} />
                )}
              </View>
              {!isLast ? <View style={{ flex: 1, width: 2, backgroundColor: lineColor, marginVertical: 2 }} /> : null}
            </View>

            <View style={{ flex: 1, paddingBottom: isLast ? 0 : SP.lg }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "baseline", gap: SP.sm }}>
                <Text
                  style={{
                    flex: 1,
                    fontSize: 15,
                    fontWeight: current ? "700" : "600",
                    color: s.state === "upcoming" ? C.textMuted : C.ink,
                  }}
                >
                  {s.title}
                </Text>
                {s.timestamp ? <Text style={{ fontSize: 12, color: C.textMuted }}>{s.timestamp}</Text> : null}
              </View>
              {s.description ? (
                <Text style={{ fontSize: 13, color: C.textSecondary, marginTop: 2, lineHeight: 18 }}>
                  {s.description}
                </Text>
              ) : null}
            </View>
          </View>
        );
      })}
    </View>
  );
}
