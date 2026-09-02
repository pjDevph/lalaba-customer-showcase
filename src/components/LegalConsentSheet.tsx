// src/components/LegalConsentSheet.tsx
// Read-then-accept sheet for the sign-up consents, mirroring the partner app's
// register legal modal: the accept button stays disabled until the user has
// actually scrolled to the end of the document. Closing without accepting leaves
// the consent unchecked — agreement is never implied by dismissal.

import React, { useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { C, RADIUS, SP } from "@/theme/tokens";
import { X } from "@/theme/icons";
import { Button } from "./Button";
import { LegalBody, LEGAL_TITLES, type LegalKind } from "./LegalBody";

/** Px of slack at the bottom — a scroll never lands exactly on contentSize. */
const BOTTOM_EPSILON = 32;

export interface LegalConsentSheetProps {
  /** Which document to show; null closes the sheet. */
  kind: LegalKind | null;
  onClose: () => void;
  onAccept: (kind: LegalKind) => void;
  /** Already accepted — lets the user re-read without re-scrolling to confirm. */
  accepted?: boolean;
}

export function LegalConsentSheet({
  kind,
  onClose,
  onAccept,
  accepted = false,
}: Readonly<LegalConsentSheetProps>) {
  const [scrolledToEnd, setScrolledToEnd] = useState(false);
  // A document shorter than the viewport fires no scroll event; without this the
  // button would sit disabled forever with nothing left to scroll.
  const [fitsOnScreen, setFitsOnScreen] = useState(false);
  const [viewportH, setViewportH] = useState(0);
  const canAccept = scrolledToEnd || fitsOnScreen || accepted;

  const onScroll = ({ nativeEvent }: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - BOTTOM_EPSILON) {
      setScrolledToEnd(true);
    }
  };

  const acceptLabel = kind === "terms" ? "I have read and agree" : "I have read and acknowledge";

  return (
    <Modal
      visible={kind !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      // Remount on open so a previous document's scroll progress never carries
      // over and silently unlocks the next one.
      key={kind ?? "closed"}
      onRequestClose={onClose}
      onShow={() => {
        setScrolledToEnd(false);
        setFitsOnScreen(false);
      }}
    >
      <SafeAreaView style={{ flex: 1, backgroundColor: C.surface }} edges={["top", "bottom"]}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            paddingHorizontal: SP.xl,
            paddingVertical: SP.base,
            borderBottomWidth: 1,
            borderBottomColor: C.borderSubtle,
          }}
        >
          <Text style={{ fontSize: 18, fontWeight: "700", color: C.ink }}>
            {kind ? LEGAL_TITLES[kind] : ""}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={onClose}
            hitSlop={12}
            style={{
              width: 32,
              height: 32,
              borderRadius: RADIUS.pill,
              backgroundColor: C.surfaceAlt,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <X size={17} color={C.textSecondary} strokeWidth={2.5} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SP.xl, paddingBottom: SP["2xl"] }}
          showsVerticalScrollIndicator
          scrollEventThrottle={16}
          onScroll={onScroll}
          onLayout={(e) => setViewportH(e.nativeEvent.layout.height)}
          onContentSizeChange={(_w, contentH) => {
            if (viewportH > 0 && contentH <= viewportH + BOTTOM_EPSILON) setFitsOnScreen(true);
          }}
        >
          {kind ? <LegalBody kind={kind} /> : null}
        </ScrollView>

        <View
          style={{
            paddingHorizontal: SP.xl,
            paddingTop: SP.base,
            paddingBottom: SP.sm,
            borderTopWidth: 1,
            borderTopColor: C.borderSubtle,
          }}
        >
          <Button
            label={canAccept ? acceptLabel : "Scroll to read all"}
            fullWidth
            disabled={!canAccept}
            onPress={() => kind && onAccept(kind)}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}
