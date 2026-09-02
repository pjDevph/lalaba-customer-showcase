// src/components/proof/PhotoProofCard.tsx
import React from "react";
import { Image, Pressable, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";
import { Camera } from "@/theme/icons";
import { ProofCardShell, type ProofStatus } from "./ProofCardShell";

export interface ProofPhoto {
  id: string;
  uri: string;
  caption?: string;
}

export interface PhotoProofCardProps {
  label?: string;
  photos: ProofPhoto[];
  /** Fired when a thumbnail is tapped (open lightbox). */
  onPressPhoto?: (photo: ProofPhoto) => void;
  capturedAt?: string;
  status?: ProofStatus;
  style?: ViewStyle;
}

export function PhotoProofCard({
  label = "Photo proof",
  photos,
  onPressPhoto,
  capturedAt,
  status = "verified",
  style,
}: Readonly<PhotoProofCardProps>) {
  return (
    <ProofCardShell label={label} icon="camera" status={status} style={style}>
      {photos.length === 0 ? (
        <View style={{ alignItems: "center", paddingVertical: SP.lg }}>
          <Camera size={24} color={C.textTertiary} />
          <Text style={{ fontSize: 12, color: C.textMuted, marginTop: SP.sm }}>No photos yet</Text>
        </View>
      ) : (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: SP.sm }}>
          {photos.map((p) => (
            <Pressable
              key={p.id}
              accessibilityRole="imagebutton"
              accessibilityLabel={p.caption ?? "Proof photo"}
              onPress={onPressPhoto ? () => onPressPhoto(p) : undefined}
              disabled={!onPressPhoto}
              style={{ }}
            >
              <Image
                source={{ uri: p.uri }}
                style={{ width: 88, height: 88, borderRadius: RADIUS.md, backgroundColor: C.surfaceAlt }}
              />
            </Pressable>
          ))}
        </View>
      )}
      {capturedAt ? <Text style={{ fontSize: 11, color: C.textTertiary, marginTop: SP.md }}>Captured {capturedAt}</Text> : null}
    </ProofCardShell>
  );
}
