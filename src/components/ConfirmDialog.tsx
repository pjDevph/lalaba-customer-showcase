// src/components/ConfirmDialog.tsx
// Reusable confirm modal wired to dialogStore — the app-wide replacement for
// the platform's native alert dialog. Rendered once at the root.

import React from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Button } from "./Button";
import { useDialogStore } from "@/stores/dialogStore";
import { styles } from "./ConfirmDialog.styles";

export function ConfirmDialog() {
  const dialog = useDialogStore((s) => s.dialog);
  const close = useDialogStore((s) => s.close);
  const visible = dialog !== null;

  const onConfirm = () => {
    dialog?.onConfirm();
    close();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.overlay} onPress={close} accessibilityLabel="Dismiss dialog">
        {/* Inner press-catcher so taps on the card don't dismiss */}
        <Pressable style={styles.card} onPress={() => {}}>
          <Text style={styles.title}>{dialog?.title}</Text>
          {dialog?.message ? <Text style={styles.message}>{dialog.message}</Text> : null}
          <View style={styles.actions}>
            <View style={styles.action}>
              <Button
                label={dialog?.cancelLabel ?? "Cancel"}
                variant="outline"
                fullWidth
                onPress={close}
              />
            </View>
            <View style={styles.action}>
              <Button
                label={dialog?.confirmLabel ?? "Confirm"}
                variant={dialog?.destructive ? "destructive" : "primary"}
                fullWidth
                onPress={onConfirm}
              />
            </View>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
