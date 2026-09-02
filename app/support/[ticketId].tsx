// app/support/[ticketId].tsx
// ─────────────────────────────────────────────────────────────────────────────
// SUPPORT THREAD — the customer's own ticket, rendered with the same
// MessageBubble the order/courier chat uses. A header block states what the
// report is about, its ticket number, and who's handling it — "Waiting for
// an agent" until one picks it up, then their name — plus a way to end the
// session herself (distinct from an agent resolving it: see
// closeMySupportTicket vs. the staff-only resolveSupportTicket). Polls every
// 4s, matching app/chat/[id].tsx's convention.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Linking, KeyboardAvoidingView, Platform, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { confirm } from "@/stores/dialogStore";
import { router, useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { C, RADIUS, SP } from "@/theme/tokens";
import { TopBar, SupportBadge, MessageBubble, BottomSheet, SystemMessage } from "@/components";
import { Camera as CameraIcon, Images as ImagesIcon } from "@/theme/icons";
import { useSupportTicketStore } from "@/stores/supportTicketStore";
import { useAuthStore } from "@/stores/authStore";
import { useDialogStore } from "@/stores/dialogStore";
import { notify } from "@/stores/notificationStore";
import type { Message, SupportTicketNote } from "@/types/api";
import { usePoll } from "../../src/hooks/usePoll";

const POLL_MS = 4000;
const EMPTY_NOTES: SupportTicketNote[] = [];

const CATEGORY_LABELS: Record<string, string> = {
  ORDER_LATE: "Order is late",
  ORDER_DAMAGED: "Item was damaged",
  ORDER_MISSING_ITEMS: "Item is missing",
  PAYMENT_DISPUTE: "Payment issue",
  REFUND_REQUEST: "Refund request",
  PROVIDER_CONDUCT: "Problem with a provider",
  COURIER_CONDUCT: "Problem with a courier",
  ACCOUNT_ACCESS: "Account access",
  APP_BUG: "Something's broken",
  OTHER: "Something else",
};

// The FE-only bridge from ticket notes into MessageBubble's real Message
// shape — see the ChatSenderRole comment in types/api.ts. Never sent to the
// server; purely a local presentation adapter.
function noteToMessage(note: SupportTicketNote, myUid: string | undefined): Message {
  return {
    _id: note._id,
    conversationId: "",
    senderUid: note.authorUid,
    senderRole: note.authorUid === myUid ? "CUSTOMER" : "SUPPORT",
    text: note.body || null,
    imageUrl: note.imageUrl,
    createdAt: note.createdAt,
  };
}

export default function SupportThreadScreen() {
  const params = useLocalSearchParams<{ ticketId: string }>();
  const ticketId = params.ticketId;
  const insets = useSafeAreaInsets();
  const myUid = useAuthStore((s) => s.profile?._id);

  const ticket = useSupportTicketStore((s) => s.ticket);
  const notes = useSupportTicketStore((s) => (s.ticket?._id === ticketId ? s.notes : undefined)) ?? EMPTY_NOTES;
  const loadTicket = useSupportTicketStore((s) => s.loadTicket);
  const loadNotes = useSupportTicketStore((s) => s.loadNotes);
  const markRead = useSupportTicketStore((s) => s.markRead);
  const sendNote = useSupportTicketStore((s) => s.send);
  const sendImage = useSupportTicketStore((s) => s.sendImage);
  const endSession = useSupportTicketStore((s) => s.endSession);
  const sending = useSupportTicketStore((s) => s.sending);
  const uploading = useSupportTicketStore((s) => s.uploading);

  const [text, setText] = useState("");
  const [attachOpen, setAttachOpen] = useState(false);
  const listRef = useRef<FlatList<SupportTicketNote>>(null);

  // Load on mount + poll, matching app/chat/[id].tsx's convention so agent
  // replies surface without the customer needing to pull-to-refresh.
  useEffect(() => {
    if (!ticketId) return;
    void loadTicket();
    void loadNotes(ticketId);
    void markRead(ticketId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  // Agent replies surface without a pull-to-refresh, but only while this
  // thread is actually on screen and the app is foregrounded.
  usePoll(() => loadNotes(ticketId), POLL_MS, !!ticketId);

  const messages = useMemo(
    () => notes.map((n) => noteToMessage(n, myUid)),
    [notes, myUid],
  );

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);
  useEffect(() => {
    if (messages.length > 0) scrollToEnd();
  }, [messages.length, scrollToEnd]);

  const isClosed = ticket?.status === "RESOLVED" || ticket?.status === "CLOSED";
  const canSend = text.trim().length > 0 && !sending && !isClosed;
  // Nobody but her has written anything yet — no agent has replied to THIS
  // thread. Purely a display cue (never persisted as a real note an agent
  // has to scroll past), so it disappears the instant a real reply lands.
  const waitingForAgent = !isClosed && notes.length > 0 && notes.every((n) => n.authorUid === myUid);

  async function onSend() {
    const body = text.trim();
    if (!body || !ticketId) return;
    setText("");
    await sendNote(ticketId, body);
  }

  async function sendPickedImage(asset: ImagePicker.ImagePickerAsset) {
    if (!ticketId || !asset.base64) return;
    const mimeType =
      asset.mimeType ?? (asset.uri.endsWith(".png") ? "image/png" : asset.uri.endsWith(".webp") ? "image/webp" : "image/jpeg");
    await sendImage(ticketId, asset.base64, mimeType);
    const err = useSupportTicketStore.getState().error;
    if (err) notify.error("Couldn't send photo", err);
  }

  async function pickFromLibrary() {
    setAttachOpen(false);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      confirm({
        title: "Photo library access needed",
        message: "Enable photo access in Settings to attach a photo.",
        confirmLabel: "Open settings",
        cancelLabel: "Not now",
        onConfirm: () => { void Linking.openSettings(); },
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.6, base64: true, allowsEditing: false });
    if (!result.canceled && result.assets[0]) await sendPickedImage(result.assets[0]);
  }

  async function pickFromCamera() {
    setAttachOpen(false);
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      confirm({
        title: "Camera access needed",
        message: "Enable camera access in Settings to take a photo.",
        confirmLabel: "Open settings",
        cancelLabel: "Not now",
        onConfirm: () => { void Linking.openSettings(); },
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.6, base64: true, allowsEditing: false });
    if (!result.canceled && result.assets[0]) await sendPickedImage(result.assets[0]);
  }

  function onEndSession() {
    if (!ticketId) return;
    useDialogStore.getState().confirm({
      title: "End this session?",
      message: "You can always start a new report from Help & Support if you need us again.",
      confirmLabel: "End session",
      destructive: true,
      onConfirm: () => {
        void endSession(ticketId).then((ok) => {
          if (!ok) {
            const err = useSupportTicketStore.getState().error;
            notify.error("Couldn't end this session", err ?? "Please try again.");
          }
        });
      },
    });
  }

  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)/chat");
  };

  const agentLine = ticket?.assignedToName ? `Talking to ${ticket.assignedToName}` : "Waiting for an agent";

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar
        title="Lalaba Support"
        subtitleNode={<SupportBadge style={{ alignSelf: "flex-start" }} />}
        showBack
        onBack={goBack}
      />

      {ticket ? (
        <View
          style={{
            paddingHorizontal: SP.screen,
            paddingVertical: SP.sm,
            borderBottomWidth: 1,
            borderBottomColor: C.borderSubtle,
            backgroundColor: C.surfaceAlt,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }} numberOfLines={1}>
            {CATEGORY_LABELS[ticket.category] ?? ticket.subject}
          </Text>
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 2 }}>
            <Text style={{ fontSize: 12, color: C.textMuted, flex: 1 }} numberOfLines={1}>
              {ticket.ticketNumber} · {agentLine}
            </Text>
            {!isClosed ? (
              <Pressable accessibilityRole="button" onPress={onEndSession} hitSlop={8}>
                <Text style={{ fontSize: 12, fontWeight: "700", color: C.error }}>End session</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={0}>
        <FlatList
          ref={listRef}
          data={notes}
          keyExtractor={(n) => n._id}
          renderItem={({ item, index }) => {
            const next = notes[index + 1];
            const showTime = !next || next.authorUid !== item.authorUid;
            return <MessageBubble message={noteToMessage(item, myUid)} showTime={showTime} />;
          }}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SP.screen, gap: SP.sm, flexGrow: 1, justifyContent: "flex-end" }}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListFooterComponent={
            waitingForAgent ? (
              <SystemMessage text="Waiting for an agent to reply…" />
            ) : null
          }
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: SP.sm }}>
              <Text style={{ fontSize: 14, color: C.textMuted, textAlign: "center" }}>
                {ticket?.body ?? "Loading your report…"}
              </Text>
            </View>
          }
        />

        {isClosed ? (
          <View
            style={{
              paddingHorizontal: SP.screen,
              paddingTop: SP.md,
              paddingBottom: SP.md + insets.bottom,
              borderTopWidth: 1,
              borderTopColor: C.borderSubtle,
              backgroundColor: C.surface,
              alignItems: "center",
              gap: 2,
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.textSecondary }}>This session has ended</Text>
            <Text style={{ fontSize: 12, color: C.textTertiary, textAlign: "center" }}>
              Need help with something else? Start a new report from Help &amp; Support.
            </Text>
          </View>
        ) : (
          <View
            style={{
              flexDirection: "row",
              alignItems: "flex-end",
              gap: SP.sm,
              paddingHorizontal: SP.screen,
              paddingTop: SP.sm,
              paddingBottom: SP.sm + insets.bottom,
              borderTopWidth: 1,
              borderTopColor: C.borderSubtle,
              backgroundColor: C.surface,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Attach a photo"
              onPress={() => setAttachOpen(true)}
              disabled={uploading}
              style={{
                width: SP.touch,
                height: SP.touch,
                borderRadius: RADIUS.pill,
                backgroundColor: C.surfaceAlt,
                alignItems: "center",
                justifyContent: "center",
                opacity: uploading ? 0.5 : 1,
              }}
            >
              {uploading ? <ActivityIndicator size="small" color={C.textTertiary} /> : <CameraIcon size={20} color={C.textSecondary} strokeWidth={2} />}
            </Pressable>

            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={C.textTertiary}
              // Matches the server cap on addMySupportTicketNote.
              maxLength={5000}
              multiline
              style={{
                flex: 1,
                maxHeight: 120,
                minHeight: SP.touch,
                backgroundColor: C.surfaceAlt,
                borderRadius: RADIUS.lg,
                paddingHorizontal: SP.base,
                paddingTop: SP.md,
                paddingBottom: SP.md,
                fontSize: 15,
                color: C.ink,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send message"
              onPress={() => void onSend()}
              disabled={!canSend}
              style={{
                width: SP.touch,
                height: SP.touch,
                borderRadius: RADIUS.pill,
                backgroundColor: canSend ? C.primary : C.borderStrong,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Send size={20} color={C.textInverse} strokeWidth={2} />
            </Pressable>
          </View>
        )}
      </KeyboardAvoidingView>

      <BottomSheet visible={attachOpen} onClose={() => setAttachOpen(false)} title="Add a photo" safeBottom={insets.bottom}>
        <Pressable
          accessibilityRole="button"
          onPress={() => void pickFromCamera()}
          style={{ flexDirection: "row", alignItems: "center", gap: SP.base, paddingVertical: SP.base }}
        >
          <CameraIcon size={20} color={C.ink} strokeWidth={2} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink }}>Take Photo</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          onPress={() => void pickFromLibrary()}
          style={{ flexDirection: "row", alignItems: "center", gap: SP.base, paddingVertical: SP.base }}
        >
          <ImagesIcon size={20} color={C.ink} strokeWidth={2} />
          <Text style={{ fontSize: 15, fontWeight: "600", color: C.ink }}>Choose from Library</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}
