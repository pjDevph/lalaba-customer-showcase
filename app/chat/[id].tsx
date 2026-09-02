// app/chat/[id].tsx
// ─────────────────────────────────────────────────────────────────────────────
// CHAT THREAD — messages for one conversation. Loads on mount and polls every
// 4s so seeded provider replies appear. Auto-scrolls to the newest message.
// A keyboard-avoiding input row (with quick-reply chips) sends via the store.
//
// Enhancements: a pinned order-context header (when the conversation is linked
// to an order), day separators, centered system messages, and a Sent/Seen
// read-receipt under the customer's last message.
// ─────────────────────────────────────────────────────────────────────────────

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { notify } from "@/stores/notificationStore";
import { confirm } from "@/stores/dialogStore";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { Send } from "lucide-react-native";
import * as ImagePicker from "expo-image-picker";

import { C, RADIUS, SP } from "@/theme/tokens";
import { TopBar, MessageBubble, QuickReplies, SystemMessage, ConversationTypeBadge, roleOf, VerifiedBadge, Avatar, BottomSheet } from "@/components";
import { ChevronRight, Camera as CameraIcon, Images as ImagesIcon } from "@/theme/icons";
import { useChatStore } from "@/stores/chatStore";
import { onlineOrder } from "@/services/graphql/orders";
import { pingPresence, getPresence } from "@/services/graphql/presence";
import { uploadChatImage } from "@/services/graphql/chat";
import type { Message, OnlineOrder } from "@/types/api";
import { orderNumber, statusLabel, serviceSummary } from "@/features/orders/status";
import { quickRepliesFor } from "@/data/customerQuickReplies";
import { usePoll } from "../../src/hooks/usePoll";

const POLL_MS = 4000;
const PRESENCE_MS = 25_000;

// Stable empty reference so the messages selector doesn't yield a fresh array
// each render (which would re-run the render-list useMemo every time).
const EMPTY_MESSAGES: Message[] = [];

// ─── Date / time helpers ───────────────────────────────────────────────────────
function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function dayLabel(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(now) - startOf(d)) / 86_400_000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  return d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function timeLabel(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" });
}

// ─── Render-list model ──────────────────────────────────────────────────────────
type RenderItem =
  | { type: "date"; key: string; label: string }
  | { type: "system"; key: string; message: Message }
  | { type: "message"; key: string; message: Message; showReceipt: boolean; showTime: boolean };

// Minute-precision bucket, so consecutive messages in the same minute group.
function minuteKey(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : String(Math.floor(d.getTime() / 60_000));
}

function buildRenderItems(messages: Message[]): RenderItem[] {
  const items: RenderItem[] = [];
  let lastDay: string | null = null;

  // Index of the last message authored by the customer (for the read receipt).
  let lastCustomerIdx = -1;
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].senderRole === "CUSTOMER") {
      lastCustomerIdx = i;
      break;
    }
  }

  messages.forEach((message, i) => {
    if (message.createdAt) {
      const key = dayKey(message.createdAt);
      if (key !== lastDay) {
        lastDay = key;
        items.push({ type: "date", key: `date-${key}`, label: dayLabel(message.createdAt) });
      }
    }
    if (message.senderRole === "SYSTEM") {
      items.push({ type: "system", key: message._id, message });
    } else {
      // Show the timestamp only on the last message of a same-sender, same-minute
      // run — otherwise it's redundant on every bubble.
      const next = messages[i + 1];
      const showTime =
        !next ||
        next.senderRole !== message.senderRole ||
        minuteKey(next.createdAt) !== minuteKey(message.createdAt);
      items.push({ type: "message", key: message._id, message, showReceipt: i === lastCustomerIdx, showTime });
    }
  });

  return items;
}

export default function ChatThreadScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const id = params.id;
  const insets = useSafeAreaInsets();

  const conversation = useChatStore((s) => s.conversations.find((c) => c._id === id));
  const messages = useChatStore((s) => (id ? s.messages[id] : undefined)) ?? EMPTY_MESSAGES;
  const loadMessages = useChatStore((s) => s.loadMessages);
  const loadConversations = useChatStore((s) => s.loadConversations);
  const send = useChatStore((s) => s.send);

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [order, setOrder] = useState<OnlineOrder | null>(null);
  const [counterpartyOnline, setCounterpartyOnline] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const listRef = useRef<FlatList<RenderItem>>(null);

  const orderId = conversation?.orderId ?? null;
  const providerUnread = conversation?.providerUnread ?? 0;
  // Once the order is concluded the chat session is closed to new messages;
  // history stays readable.
  const ended = conversation?.ended ?? false;
  const role = conversation ? roleOf(conversation) : "merchant";

  // Load on mount + poll while mounted so seeded replies surface. The
  // conversation summary (for the header/order-card) is (re)loaded until it
  // appears — a single mount-time call can miss on a cold deep-link where auth
  // isn't ready yet, leaving the header stuck on the generic "Chat".
  useEffect(() => {
    if (!id) return;
    void loadConversations();
    void loadMessages(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Message poll. Single-flight matters most here: this is the fastest
  // interval in the app and the one most likely to outrun a slow response.
  usePoll(
    async () => {
      await loadMessages(id);
      if (!useChatStore.getState().conversations.some((c) => c._id === id)) {
        await loadConversations();
      }
    },
    POLL_MS,
    !!id,
  );

  // Fetch the linked order for the context header (hide gracefully on failure).
  useEffect(() => {
    let cancelled = false;
    if (!orderId) {
      setOrder(null);
      return;
    }
    onlineOrder(orderId)
      .then((o) => {
        if (!cancelled) setOrder(o);
      })
      .catch(() => {
        if (!cancelled) setOrder(null);
      });
    return () => {
      cancelled = true;
    };
  }, [orderId]);

  // Real presence: heartbeat our own status and poll the counterparty's,
  // while this screen is mounted. No fabricated/default-on state — the dot
  // only shows when the server actually reports isOnline: true.
  const providerUid = conversation?.providerUid ?? null;

  // Presence heartbeat. Routing this through usePoll is not just tidiness:
  // pingPresence() is what marks THIS customer online, so a backgrounded app
  // that keeps ticking reports a person as available when their phone is in a
  // pocket. Stopping on blur/background is the correct behaviour, not merely
  // the cheaper one.
  usePoll(
    async () => {
      if (!providerUid) return;
      await pingPresence().catch(() => {});
      try {
        const status = await getPresence(providerUid);
        setCounterpartyOnline(status.isOnline);
      } catch {
        setCounterpartyOnline(false);
      }
    },
    PRESENCE_MS,
    !!providerUid,
  );

  // Dynamic quick-reply chips: re-rolled on mount and whenever the thread
  // gains a new message (not on every poll tick — only when the count
  // actually changes), so the suggestions stay fresh without being jarring.
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  useEffect(() => {
    if (!conversation) return;
    setQuickReplies(
      quickRepliesFor({ role, legType: conversation.legType, orderStatus: order?.status ?? null }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation?._id, conversation?.legType, role, order?.status, messages.length]);

  const renderItems = useMemo(() => buildRenderItems(messages), [messages]);

  const scrollToEnd = useCallback(() => {
    requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
  }, []);

  useEffect(() => {
    if (renderItems.length > 0) scrollToEnd();
  }, [renderItems.length, scrollToEnd]);

  const doSend = useCallback(
    async (body: string) => {
      const trimmed = body.trim();
      if (!trimmed || !id || sending) return;
      setSending(true);
      try {
        await send(id, { text: trimmed });
      } finally {
        setSending(false);
      }
    },
    [id, sending, send],
  );

  async function onSend() {
    const body = text.trim();
    if (!body) return;
    setText("");
    await doSend(body);
  }

  const canSend = text.trim().length > 0 && !sending && !uploading && !ended;

  // ─── Photo attach ───────────────────────────────────────────────────────
  async function sendImage(asset: ImagePicker.ImagePickerAsset) {
    if (!id || !asset.base64) return;
    const mimeType =
      asset.mimeType ?? (asset.uri.endsWith(".png") ? "image/png" : asset.uri.endsWith(".webp") ? "image/webp" : "image/jpeg");
    setUploading(true);
    try {
      const key = await uploadChatImage(id, asset.base64, mimeType);
      await send(id, { imageKey: key });
    } catch {
      notify.error("Couldn't send photo", "Please try again.");
    } finally {
      setUploading(false);
    }
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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.6,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) await sendImage(result.assets[0]);
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
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.6,
      base64: true,
      allowsEditing: false,
    });
    if (!result.canceled && result.assets[0]) await sendImage(result.assets[0]);
  }

  // Back must work even when this thread was deep-linked (no history to pop):
  // fall back to the linked order, else the chat list.
  const goBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace(orderId ? `/orders/${orderId}` : "/chat");
  };

  const renderRow = useCallback(
    ({ item }: { item: RenderItem }) => {
      if (item.type === "date") {
        return (
          <View style={{ alignItems: "center", paddingVertical: SP.xs }}>
            <Text style={{ fontSize: 12, fontWeight: "600", color: C.textTertiary }}>{item.label}</Text>
          </View>
        );
      }
      if (item.type === "system") {
        return <SystemMessage text={item.message.text ?? ""} time={timeLabel(item.message.createdAt)} />;
      }
      return (
        <View style={{ gap: 2 }}>
          <MessageBubble message={item.message} showTime={item.showTime} />
          {item.showReceipt ? (
            <Text style={{ fontSize: 11, color: C.textTertiary, alignSelf: "flex-end", paddingHorizontal: 4 }}>
              {providerUnread === 0 ? "Seen" : "Sent"}
            </Text>
          ) : null}
        </View>
      );
    },
    [providerUnread],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }} edges={["top"]}>
      <TopBar
        title={conversation?.providerName ?? "Chat"}
        avatar={
          conversation ? (
            <View style={{ marginRight: -2 }}>
              <Avatar name={conversation.providerName} type={role === "washer" ? "washer" : "merchant"} size="sm" />
              {counterpartyOnline ? (
                <View
                  style={{
                    position: "absolute",
                    right: -1,
                    bottom: -1,
                    width: 11,
                    height: 11,
                    borderRadius: 6,
                    backgroundColor: C.success,
                    borderWidth: 2,
                    borderColor: C.surface,
                  }}
                />
              ) : null}
            </View>
          ) : undefined
        }
        subtitleNode={
          conversation ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <ConversationTypeBadge role={role} />
              {conversation.kind === "COURIER" && conversation.legType ? (
                <Text style={{ fontSize: 12, color: C.textMuted }}>
                  {`• ${conversation.legType === "PICKUP" ? "Pickup" : "Return"}`}
                </Text>
              ) : null}
              {/* Only on provider threads — providerVerified is always false
                  for couriers, who have no verification concept. */}
              {conversation.providerVerified ? (
                <VerifiedBadge verified size={14} showLabel={false} />
              ) : null}
            </View>
          ) : undefined
        }
        showBack
        onBack={goBack}
      />

      {orderId && order ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View order ${orderNumber(orderId)}`}
          onPress={() => router.push(`/orders/${orderId}`)}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: SP.sm,
            marginHorizontal: SP.screen,
            marginTop: SP.sm,
            paddingHorizontal: SP.base,
            paddingVertical: SP.md,
            backgroundColor: C.surface,
            borderWidth: 1,
            borderColor: C.border,
            borderRadius: RADIUS.lg,
          }}
        >
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: SP.sm }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: C.ink }}>{`#${orderNumber(orderId)}`}</Text>
              <Text style={{ fontSize: 12, color: C.textSecondary }} numberOfLines={1}>
                {statusLabel(order.status)}
              </Text>
            </View>
            <Text style={{ fontSize: 12, color: C.textMuted }} numberOfLines={1}>
              {serviceSummary(order)}
            </Text>
          </View>
          <ChevronRight size={18} color={C.textTertiary} strokeWidth={2} />
        </Pressable>
      ) : null}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={listRef}
          data={renderItems}
          keyExtractor={(item) => item.key}
          renderItem={renderRow}
          style={{ flex: 1 }}
          contentContainerStyle={{ padding: SP.screen, gap: SP.sm, flexGrow: 1, justifyContent: "flex-end" }}
          onContentSizeChange={scrollToEnd}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        />

        {ended ? (
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
            <Text style={{ fontSize: 14, fontWeight: "700", color: C.textSecondary }}>
              This conversation has ended
            </Text>
            <Text style={{ fontSize: 12, color: C.textTertiary, textAlign: "center" }}>
              This order is complete. Your next order will start a new chat.
            </Text>
          </View>
        ) : (
          <>
            <QuickReplies replies={quickReplies} onSelect={(t) => void doSend(t)} />

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
                {uploading ? (
                  <ActivityIndicator size="small" color={C.textTertiary} />
                ) : (
                  <CameraIcon size={20} color={C.textSecondary} strokeWidth={2} />
                )}
              </Pressable>

              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Message"
                placeholderTextColor={C.textTertiary}
                // Matches SendMessageInput.text's @MaxLength(2000).
                maxLength={2000}
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
                onPress={onSend}
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
          </>
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
