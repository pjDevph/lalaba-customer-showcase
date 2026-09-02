// src/components/ReviewRow.tsx
import React from "react";
import { Text, View, type ViewStyle } from "react-native";
import { C, SP } from "@/theme/tokens";
import { Avatar } from "./Avatar";
import { StarRating } from "./StarRating";

export interface ReviewRowProps {
  authorName: string;
  rating: number;
  comment?: string;
  /** Preformatted date/meta, e.g. "2 weeks ago". */
  meta?: string;
  style?: ViewStyle;
}

export function ReviewRow({ authorName, rating, comment, meta, style }: Readonly<ReviewRowProps>) {
  return (
    <View style={[{ flexDirection: "row", gap: SP.md }, style]}>
      <Avatar name={authorName} size="sm" />
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: SP.sm }}>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>{authorName}</Text>
          {meta ? <Text style={{ fontSize: 12, color: C.textMuted }}>{meta}</Text> : null}
        </View>
        <View style={{ marginTop: 3 }}>
          <StarRating value={rating} size={14} />
        </View>
        {comment ? (
          <Text style={{ fontSize: 14, color: C.textSecondary, marginTop: 6, lineHeight: 20 }}>{comment}</Text>
        ) : null}
      </View>
    </View>
  );
}
