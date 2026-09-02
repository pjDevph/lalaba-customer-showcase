// app/booking/logistics.tsx — Step 2 of 3: pickup + return, adaptive.
// The "how do we receive it" choice drives what's shown: pickup reveals the
// address + schedule; drop-off hides them and shows the branch instead. Return
// method is chosen here too; self-pickup skips any return schedule.
import React from "react";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { C, SP } from "@/theme/tokens";
import { RadioSelectCard, DatePicker, InfoBanner, Button, SegmentedControl, type DateOption } from "@/components";
import { providerPickupDays } from "@/services/graphql/discovery";
import { useBookingStore } from "@/stores/bookingStore";
import { useAddressStore } from "@/stores/addressStore";
import type { PickupDay, DeliverySubMode } from "@/types/api";
import { WizardScreen, useProvider, SectionLabel, Card, MutedNote, EditLink, CenterLoader } from "@/features/booking/parts";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function buildDateOptions(days = 7): DateOption[] {
  const out: DateOption[] = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    out.push({ key: isoDay(d), weekday: i === 0 ? "Today" : WEEKDAYS[d.getDay()], day: `${MONTHS[d.getMonth()]} ${d.getDate()}` });
  }
  return out;
}

// Return is a two-level choice: first HOW (deliver vs self-pickup) via the
// segmented control, then — only for delivery — which delivery tier.
interface DeliveryOption {
  key: string;
  title: string;
  description: string;
  deliverySubMode: DeliverySubMode;
  free?: boolean;
}
// Paid-tier fees are server-authoritative (GAP-P0-005): selecting an option
// re-quotes, and the quote's returnFeeCentavos is shown on the selected tier —
// the FE hardcodes no fee amounts.
// Express is NOT here any more. Speed is a turnaround promise about when the
// laundry is DONE, not about how it travels — so it is chosen separately below
// and is available even to customers collecting their own laundry.
const DELIVERY_OPTIONS: DeliveryOption[] = [
  { key: "free-batch", title: "Batch delivery", description: "Delivered on the next batch route in your area", deliverySubMode: "FREE_BATCH", free: true },
  { key: "scheduled", title: "Scheduled delivery", description: "Pick your own return date and time window · fee added to your estimate", deliverySubMode: "SCHEDULED_PAID" },
];

export default function LogisticsStep() {
  const branchId = useBookingStore((s) => s.providerId);
  const providerType = useBookingStore((s) => s.providerType);
  const pickupMode = useBookingStore((s) => s.pickupMode);
  const returnMode = useBookingStore((s) => s.returnMode);
  const deliverySubMode = useBookingStore((s) => s.deliverySubMode);
  const pickupDate = useBookingStore((s) => s.pickupDate);
  const pickupTier = useBookingStore((s) => s.pickupTier);
  const quote = useBookingStore((s) => s.quote);
  const setFulfillment = useBookingStore((s) => s.setFulfillment);
  const turnaroundTier = useBookingStore((s) => s.turnaroundTier);
  const setSchedule = useBookingStore((s) => s.setSchedule);

  const { profile, name, areaLabel } = useProvider(branchId, providerType);
  // Free batch delivery is a per-provider policy, not a platform guarantee —
  // only offer the tier when this provider actually runs batch routes. While the
  // profile is still loading we leave the list untouched rather than flicker.
  const freeBatchOffered = profile ? profile.policies.freeBatchDelivery : true;
  // Express is a per-provider offer; asking for it from a provider who hasn't
  // enabled it is refused server-side, so don't show it as a choice.
  const expressOffered = profile?.policies.expressTurnaround?.enabled ?? false;
  const expressHours = profile?.policies.expressTurnaround?.slaHours ?? null;
  const deliveryOptions = React.useMemo(
    () => DELIVERY_OPTIONS.filter((o) => o.deliverySubMode !== "FREE_BATCH" || freeBatchOffered),
    [freeBatchOffered],
  );
  const addresses = useAddressStore((s) => s.addresses);
  const selectedAddressId = useAddressStore((s) => s.selectedAddressId);
  const address = addresses.find((a) => a._id === selectedAddressId) ?? null;
  const addressLine = address
    ? [address.address.streetAddress, address.address.barangayName, address.address.cityMunicipalityName].filter(Boolean).join(", ")
    : null;

  const isPickup = pickupMode === "PROVIDER_PICKUP";

  const dateOptions = React.useMemo(() => buildDateOptions(), []);
  const activeDate = pickupDate ?? dateOptions[0].key;
  const [days, setDays] = React.useState<PickupDay[] | null>(null);
  // Distinct from "no days came back": we could not ask, so we must not answer
  // on the provider's behalf.
  const [daysError, setDaysError] = React.useState(false);

  React.useEffect(() => {
    if (isPickup && !pickupDate) setSchedule(dateOptions[0].key, null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPickup]);

  // One fetch covers the whole range. The old per-day slot query refetched on
  // every date tap; days do not change while the customer is choosing.
  React.useEffect(() => {
    if (!branchId || !providerType || !isPickup) return;
    let alive = true;
    setDays(null);
    providerPickupDays(branchId, dateOptions[0].key, providerType, 7)
      .then((list: PickupDay[]) => { if (alive) { setDays(list); setDaysError(false); } })
      // A failed request is NOT an answer about the provider. This used to set
      // an empty list, which rendered as "this provider is not taking bookings
      // that day" for every day — telling the customer the shop was closed when
      // in truth we never found out.
      .catch(() => { if (alive) { setDays([]); setDaysError(true); } });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, providerType, isPickup]);

  const selectedDay = (days ?? []).find((d) => d.date === activeDate) ?? null;

  const onReceive = (mode: "PROVIDER_PICKUP" | "CUSTOMER_DROPOFF") => {
    setFulfillment({ pickupMode: mode });
    if (mode === "CUSTOMER_DROPOFF") setSchedule(null, null);
  };
  // Changing day keeps the tier — it is a preference about how the pickup
  // happens, not about which day it happens on.
  const onDate = (key: string) => setSchedule(key, pickupTier);
  const onTier = (tier: DeliverySubMode) => setSchedule(activeDate, tier);
  const isSelfPickup = returnMode === "CUSTOMER_SELF_PICKUP";
  const onReturnMode = (key: string) =>
    key === "pickup"
      ? setFulfillment({ returnMode: "CUSTOMER_SELF_PICKUP", deliverySubMode: null })
      : setFulfillment({
          returnMode: "PROVIDER_DELIVERY",
          // The store defaults to FREE_BATCH — don't resurrect it for a provider
          // that doesn't run batch routes; make them pick a tier instead.
          deliverySubMode: deliverySubMode ?? (freeBatchOffered ? "FREE_BATCH" : null),
        });
  const onDelivery = (o: DeliveryOption) => setFulfillment({ returnMode: "PROVIDER_DELIVERY", deliverySubMode: o.deliverySubMode });

  // Same guard for a selection carried in from the store's default.
  React.useEffect(() => {
    if (!freeBatchOffered && deliverySubMode === "FREE_BATCH") setFulfillment({ deliverySubMode: null });
  }, [freeBatchOffered, deliverySubMode, setFulfillment]);

  // Switching to a provider without express must not leave EXPRESS selected —
  // the order would be rejected at submit with no visible cause.
  React.useEffect(() => {
    if (!expressOffered && turnaroundTier === "EXPRESS") {
      setFulfillment({ turnaroundTier: "STANDARD" });
    }
  }, [expressOffered, turnaroundTier, setFulfillment]);

  const needsDeliveryTier = !isSelfPickup && !deliverySubMode;
  const canContinue =
    (isPickup ? !!address && !!selectedDay?.isBookable : true) && !needsDeliveryTier;
  const estimateHint = isPickup && !address
    ? "Add a pickup address to continue"
    : isPickup && !selectedDay?.isBookable
      ? "Choose a pickup day to continue"
      : needsDeliveryTier
        ? "Choose how your laundry comes back to continue"
        : undefined;

  return (
    <WizardScreen
      step={2}
      title="Pickup and return"
      subtitle="How should your laundry travel?"
      estimateCentavos={quote?.estimatedTotalCentavos}
      estimateLabel="Estimated"
      estimateHint={estimateHint}
      ctaLabel="Continue"
      ctaDisabled={!canContinue}
      onContinue={() => router.push("/booking/review")}
    >
      <SectionLabel>How will we receive your laundry?</SectionLabel>
      <View style={{ gap: SP.md }}>
        <RadioSelectCard title="Pick up from my address" description="Staff collects your laundry at your door" selected={isPickup} onPress={() => onReceive("PROVIDER_PICKUP")} />
        <RadioSelectCard title="I'll drop it off at the branch" description="Bring your laundry to the branch yourself" selected={!isPickup} onPress={() => onReceive("CUSTOMER_DROPOFF")} />
      </View>

      {isPickup ? (
        <>
          {/* Compact required-address card (no big alert unless they try to continue). */}
          {!address ? (
            <Card style={{ marginTop: SP.lg, borderColor: C.warning }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink }}>Pickup address</Text>
                  <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>No address selected</Text>
                </View>
                <Button label="Choose address" variant="secondary" size="sm" onPress={() => router.push("/address-select")} />
              </View>
            </Card>
          ) : (
            <Card style={{ marginTop: SP.lg }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: SP.md }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>Pickup address · {address.label}</Text>
                  <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }} numberOfLines={2}>{addressLine}</Text>
                </View>
                <EditLink onPress={() => router.push("/address-select")} />
              </View>
            </Card>
          )}

          {/* Schedule only appears once there's an address to route to. */}
          {address ? (
            <>
              <SectionLabel style={{ marginTop: SP.xl }}>Pickup schedule</SectionLabel>
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink, marginBottom: SP.md }}>Pickup day</Text>
              <DatePicker options={dateOptions} value={activeDate} onChange={onDate} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink, marginTop: SP.lg, marginBottom: SP.md }}>How should we collect it?</Text>
              {days === null ? (
                <CenterLoader />
              ) : daysError ? (
                <InfoBanner
                  tone="warning"
                  text="We couldn't load this provider's schedule. Check your connection and pull down to retry."
                />
              ) : !selectedDay?.isBookable ? (
                <InfoBanner
                  tone="warning"
                  text={selectedDay?.unavailableReason
                    ? `${selectedDay.unavailableReason} — try another day.`
                    : "This provider is not taking bookings that day. Try another day."}
                />
              ) : (
                <View style={{ gap: SP.md }}>
                  <RadioSelectCard
                    title="Batched pickup"
                    description="Collected along with nearby pickups that day"
                    free={selectedDay.freeBatchFeeCentavos === 0}
                    priceCentavos={selectedDay.freeBatchFeeCentavos}
                    selected={(pickupTier ?? "FREE_BATCH") === "FREE_BATCH"}
                    onPress={() => onTier("FREE_BATCH")}
                  />
                  <RadioSelectCard
                    title="Priority pickup"
                    description="We come for your laundry on its own"
                    priceCentavos={selectedDay.paidPickupFeeCentavos}
                    selected={pickupTier === "SCHEDULED_PAID"}
                    onPress={() => onTier("SCHEDULED_PAID")}
                  />
                </View>
              )}
              <MutedNote style={{ marginTop: SP.base }}>
                Your provider confirms the time after accepting — batched pickups go out with nearby collections.
              </MutedNote>
            </>
          ) : (
            <Text style={{ fontSize: 13, color: C.textMuted, marginTop: SP.lg }}>Add an address to view available pickup times.</Text>
          )}
        </>
      ) : (
        <Card style={{ marginTop: SP.lg }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>Drop-off details</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: C.ink, marginTop: SP.sm }}>{name}</Text>
          <Text style={{ fontSize: 13, color: C.textMuted, marginTop: 2 }}>{areaLabel}</Text>
          <Text style={{ fontSize: 12.5, color: C.textSecondary, marginTop: SP.sm, lineHeight: 18 }}>
            Bring your laundry to the branch during their open hours. No pickup fee.
          </Text>
        </Card>
      )}

      <SectionLabel style={{ marginTop: SP.xl }}>How should your laundry return?</SectionLabel>
      <SegmentedControl
        options={[{ key: "deliver", label: "Deliver to me" }, { key: "pickup", label: "Self-pickup" }]}
        value={isSelfPickup ? "pickup" : "deliver"}
        onChange={onReturnMode}
        scrollable={false}
      />
      {isSelfPickup ? (
        <InfoBanner tone="info" text="We'll notify you when your laundry is ready to collect — no return schedule needed." style={{ marginTop: SP.md }} />
      ) : (
        <>
          <View style={{ gap: SP.md, marginTop: SP.md }}>
            {deliveryOptions.map((o) => {
              const selected = o.deliverySubMode === deliverySubMode;
              // Server-quoted fee for the currently selected tier only.
              const quotedFee = selected && !o.free ? quote?.returnFeeCentavos ?? undefined : undefined;
              return (
                <RadioSelectCard
                  key={o.key}
                  title={o.title}
                  description={o.description}
                  selected={selected}
                  onPress={() => onDelivery(o)}
                  free={o.free}
                  priceCentavos={quotedFee}
                />
              );
            })}
          </View>
          {!freeBatchOffered ? (
            <MutedNote style={{ marginTop: SP.md }}>{name} doesn&apos;t run free batch routes — delivery from this provider is a paid tier.</MutedNote>
          ) : null}
          <MutedNote style={{ marginTop: SP.md }}>You can still change the return method until your laundry is ready.</MutedNote>
        </>
      )}

      {/* Speed is asked AFTER the travel choice and outside the self-pickup
          branch on purpose — it is a promise about when the laundry is done,
          so it applies whether it is delivered or collected. */}
      <SectionLabel style={{ marginTop: SP.xl }}>How fast do you need it?</SectionLabel>
      <View style={{ gap: SP.md }}>
        <RadioSelectCard
          title="Standard"
          description={`Ready in ${name}'s usual turnaround`}
          selected={turnaroundTier === "STANDARD"}
          onPress={() => setFulfillment({ turnaroundTier: "STANDARD" })}
          free
        />
        {expressOffered ? (
          <RadioSelectCard
            title="Express"
            description={
              expressHours
                ? `Ready within ${expressHours} hours of us receiving it · fee added to your estimate`
                : "Ready sooner once we receive it · fee added to your estimate"
            }
            selected={turnaroundTier === "EXPRESS"}
            onPress={() => setFulfillment({ turnaroundTier: "EXPRESS" })}
            priceCentavos={
              turnaroundTier === "EXPRESS"
                ? quote?.turnaroundFeeCentavos ?? undefined
                : undefined
            }
          />
        ) : (
          <MutedNote>{name} doesn&apos;t offer express turnaround.</MutedNote>
        )}
      </View>
    </WizardScreen>
  );
}
