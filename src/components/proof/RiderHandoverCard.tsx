// src/components/proof/RiderHandoverCard.tsx
import React from "react";
import { Pressable, Text, View, type ViewStyle } from "react-native";
import { C, FONT, RADIUS, SP, formatPhone } from "@/theme/tokens";
import { Phone, MessageCircle } from "@/theme/icons";
import { Avatar } from "../Avatar";
import { ProofCardShell, ProofDivider, type ProofStatus } from "./ProofCardShell";

export interface RiderHandoverCardProps {
  /** Rider / staff name doing the handover. */
  staffName: string;
  /** Role/label, e.g. "Pickup rider". */
  role?: string;
  /** Local phone "09XXXXXXXXX" (formatted for display). */
  phone?: string;
  /** Handoff OTP code (mono) shown for confirmation. */
  handoverCode?: string;
  handedAt?: string;
  onCall?: () => void;
  onMessage?: () => void;
  status?: ProofStatus;
  style?: ViewStyle;
}

export function RiderHandoverCard({
  staffName,
  role = "Rider",
  phone,
  handoverCode,
  handedAt,
  onCall,
  onMessage,
  status = "complete",
  style,
}: Readonly<RiderHandoverCardProps>) {
  return (
    <ProofCardShell label="Rider handover" icon="truck" status={status} style={style}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
        <Avatar name={staffName} size="md" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 15, fontWeight: "700", color: C.ink }}>{staffName}</Text>
          <Text style={{ fontSize: 12, color: C.textMuted }}>
            {role}
            {phone ? ` · ${formatPhone(phone)}` : ""}
          </Text>
        </View>
        {onCall ? <ContactButton icon="phone" onPress={onCall} /> : null}
        {onMessage ? <ContactButton icon="message" onPress={onMessage} /> : null}
      </View>

      {handoverCode ? (
        <>
          <ProofDivider />
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 13, color: C.textSecondary }}>Handover code</Text>
            <Text style={{ fontFamily: FONT.mono, fontSize: 18, fontWeight: "700", color: C.primaryText, letterSpacing: 2 }}>
              {handoverCode}
            </Text>
          </View>
        </>
      ) : null}
      {handedAt ? <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: SP.sm }}>Handed over {handedAt}</Text> : null}
    </ProofCardShell>
  );
}

function ContactButton({ icon, onPress }: Readonly<{ icon: "phone" | "message"; onPress: () => void }>) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={icon === "phone" ? "Call" : "Message"}
      onPress={onPress}
      style={{
        width: 40,
        height: 40,
        borderRadius: RADIUS.md,
        borderWidth: 1,
        borderColor: C.border,
        backgroundColor: C.surface,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {icon === "phone" ? <Phone size={18} color={C.primaryText} /> : <MessageCircle size={18} color={C.primaryText} />}
    </Pressable>
  );
}
