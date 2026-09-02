// src/components/ConfirmDialog.styles.ts
import { StyleSheet } from "react-native";
import { C, RADIUS, SP, SHADOW } from "@/theme/tokens";

export const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: C.overlay,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SP.xl,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: C.surface,
    borderRadius: RADIUS["2xl"],
    padding: SP.xl,
    gap: SP.sm,
    ...SHADOW.lg,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: C.ink,
  },
  message: {
    fontSize: 14,
    color: C.textMuted,
    lineHeight: 21,
  },
  actions: {
    flexDirection: "row",
    gap: SP.md,
    marginTop: SP.base,
  },
  action: {
    flex: 1,
  },
});
