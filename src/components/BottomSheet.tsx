// src/components/BottomSheet.tsx
import React from "react";
import { Modal, Pressable, ScrollView, Text, View, type ViewStyle } from "react-native";
import { C, RADIUS, SP } from "@/theme/tokens";

export interface BottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Scroll the body when content overflows (default true). */
  scrollable?: boolean;
  /** Bottom safe-area inset to pad for (px). */
  safeBottom?: number;
  style?: ViewStyle;
}

export function BottomSheet({
  visible,
  onClose,
  title,
  children,
  scrollable = true,
  safeBottom = 0,
  style,
}: Readonly<BottomSheetProps>) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: C.overlay }}>
        <Pressable accessibilityLabel="Close" style={{ flex: 1 }} onPress={onClose} />
        <View
          style={[
            {
              backgroundColor: C.surface,
              borderTopLeftRadius: RADIUS["3xl"],
              borderTopRightRadius: RADIUS["3xl"],
              paddingTop: SP.md,
              maxHeight: "88%",
            },
            style,
          ]}
        >
          {/* Grabber */}
          <View style={{ alignItems: "center", paddingBottom: SP.sm }}>
            <View style={{ width: 40, height: 5, borderRadius: RADIUS.pill, backgroundColor: C.borderStrong }} />
          </View>

          {title ? (
            <Text style={{ fontSize: 18, fontWeight: "700", color: C.ink, paddingHorizontal: SP.lg, paddingBottom: SP.sm }}>
              {title}
            </Text>
          ) : null}

          {scrollable ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              style={{ paddingHorizontal: SP.lg }}
              contentContainerStyle={{ paddingBottom: SP.lg + safeBottom }}
            >
              {children}
            </ScrollView>
          ) : (
            <View style={{ paddingHorizontal: SP.lg, paddingBottom: SP.lg + safeBottom }}>{children}</View>
          )}
        </View>
      </View>
    </Modal>
  );
}
