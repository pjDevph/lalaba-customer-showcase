// app/orders/[id]/rate.tsx
// ─────────────────────────────────────────────────────────────────────────────
// RATE PROVIDER — five star rows (Quality, Speed, Value, Delivery,
// Communication) + a comment. Submits a new rating, or prefills + edits an
// existing one while it's inside the 48h edit window (read-only after).
// ─────────────────────────────────────────────────────────────────────────────

import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";

import { C, SP, RADIUS, TYPE, COMP } from "@/theme/tokens";
import { TopBar, StarRating, Button, InfoBanner } from "@/components";
import { notify } from "@/stores/notificationStore";
import { backOr } from "@/lib/nav";
import { submitRating, updateRating, myRatingForOrder } from "@/services/graphql/ratings";
import type { Rating } from "@/types/api";

type ScoreKey = "quality" | "speed" | "valueForMoney" | "delivery" | "communication";

// Display labels only — keys stay aligned with the BE's RatingScores fields
// (quality/speed/valueForMoney/delivery/communication); see §ratings in
// LALABA_BE_DEV/src/ratings/schemas/rating.schema.ts for why the dimensions
// themselves (all five, required together) aren't changing.
//
// NOTE: "delivery" is intentionally labeled "Care of Items" here even though
// it still submits to the BE's `scores.delivery` field (documented there as
// the shop's delivery experience). This is a deliberate label/data mismatch,
// not a bug — anything reading scores.delivery back (merchant dashboards,
// shopRatings, histograms) will see it as delivery, not item care.
const ROWS: { key: ScoreKey; label: string }[] = [
  { key: "quality", label: "Cleaning Quality" },
  { key: "speed", label: "Turnaround Time" },
  { key: "valueForMoney", label: "Value for Money" },
  { key: "delivery", label: "Care of Items" },
  { key: "communication", label: "Service & Communication" },
];

export default function RateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const orderId = String(id);

  const [loading, setLoading] = useState(true);
  const [existing, setExisting] = useState<Rating | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [scores, setScores] = useState<Record<ScoreKey, number>>({
    quality: 0,
    speed: 0,
    valueForMoney: 0,
    delivery: 0,
    communication: 0,
  });
  const [comment, setComment] = useState("");

  useEffect(() => {
    let cancelled = false;
    myRatingForOrder(orderId)
      .then((r) => {
        if (cancelled || !r) return;
        setExisting(r);
        setScores({
          quality: r.scores.quality,
          speed: r.scores.speed,
          valueForMoney: r.scores.valueForMoney,
          delivery: r.scores.delivery,
          communication: r.scores.communication,
        });
        setComment(r.comment ?? "");
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  const readOnly = useMemo(() => {
    if (!existing) return false;
    const until = new Date(existing.editableUntil).getTime();
    return Number.isNaN(until) ? true : Date.now() > until;
  }, [existing]);

  const allRated = ROWS.every((r) => scores[r.key] > 0);

  async function onSubmit() {
    if (!allRated) {
      notify.warning("Add your ratings", "Please tap a star for every category.");
      return;
    }
    setSubmitting(true);
    try {
      const input = {
        quality: scores.quality,
        speed: scores.speed,
        valueForMoney: scores.valueForMoney,
        delivery: scores.delivery,
        communication: scores.communication,
        comment: comment.trim() || undefined,
      };
      if (existing) {
        await updateRating(orderId, input);
        notify.success("Rating updated", "Thanks for the update!");
      } else {
        await submitRating(orderId, input);
        notify.success("Thanks for rating!", "Your feedback helps other customers.");
      }
      if (router.canGoBack()) router.back();
      else router.replace("/(tabs)/orders");
    } catch (err) {
      notify.error("Couldn't save your rating", err instanceof Error ? err.message : undefined);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
        <TopBar title="Rate provider" showBack onBack={() => backOr(`/orders/${orderId}`)} />
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={C.primaryText} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar title={existing ? "Edit rating" : "Rate provider"} showBack onBack={() => backOr(`/orders/${orderId}`)} />

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: SP.screen, paddingBottom: SP["3xl"], gap: SP.base }}
        showsVerticalScrollIndicator={false}
      >
        {readOnly ? (
          <InfoBanner
            tone="info"
            title="Rating locked"
            text="The 48-hour window to edit this rating has passed. You can still see what you submitted."
          />
        ) : (
          <Text style={{ ...TYPE.meta }}>
            How was your experience? Tap the stars for each category.
          </Text>
        )}

        <View style={{ backgroundColor: C.surface, borderRadius: RADIUS.xl, borderWidth: 1, borderColor: C.border, padding: SP.lg, gap: SP.xs }}>
          {ROWS.map((row) => (
            <View
              key={row.key}
              style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: SP.sm, gap: SP.md }}
            >
              <Text style={{ ...TYPE.bodyStrong, flexShrink: 1 }}>{row.label}</Text>
              <StarRating
                style={{ flexShrink: 0 }}
                value={scores[row.key]}
                size={28}
                onChange={readOnly ? undefined : (v) => setScores((s) => ({ ...s, [row.key]: v }))}
              />
            </View>
          ))}
        </View>

        <View style={{ gap: SP.sm }}>
          <Text style={{ ...TYPE.label }}>Comment (optional)</Text>
          <TextInput
            value={comment}
            onChangeText={setComment}
            editable={!readOnly}
            placeholder="Share more about your experience…"
            placeholderTextColor={C.textTertiary}
            multiline
            style={{ ...COMP.input, minHeight: 110, textAlignVertical: "top" }}
          />
        </View>

        {!readOnly ? (
          <Button
            label={existing ? "Update rating" : "Submit rating"}
            variant="primary"
            loading={submitting}
            onPress={onSubmit}
            fullWidth
          />
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
