// src/services/graphql/chat.ts
// GraphQL operations for customer↔provider chat: list conversations, load a
// thread's messages, send a message, and find-or-create a conversation.

import { graphqlRequest } from "../../config/graphql";
import type { ChatLegType, Conversation, Message, ProviderType } from "../../types/api";

// ─── Fragments ────────────────────────────────────────────────────────────────
const CONVERSATION_FIELDS = `
  _id
  customerUid customerName
  providerUid branchId providerType providerName
  kind legType
  orderId
  ended providerVerified
  lastMessageText lastMessageAt
  customerUnread providerUnread
  createdAt updatedAt
`;

const MESSAGE_FIELDS = `
  _id conversationId senderUid senderRole text imageUrl createdAt
`;

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function myConversations(): Promise<Conversation[]> {
  const data = await graphqlRequest<{ myConversations: Conversation[] }>(
    `query MyConversations { myConversations { ${CONVERSATION_FIELDS} } }`,
  );
  return data.myConversations;
}

export async function conversationMessages(conversationId: string): Promise<Message[]> {
  const data = await graphqlRequest<{ conversationMessages: Message[] }>(
    `query ConversationMessages($conversationId: ID!) {
       conversationMessages(conversationId: $conversationId) { ${MESSAGE_FIELDS} }
     }`,
    { conversationId },
  );
  return data.conversationMessages;
}

// ─── Mutations ────────────────────────────────────────────────────────────────
export interface SendMessageBody {
  text?: string;
  imageKey?: string;
}

export async function sendMessage(conversationId: string, body: SendMessageBody): Promise<Message> {
  const data = await graphqlRequest<{ sendMessage: Message }>(
    `mutation SendMessage($input: SendMessageInput!) {
       sendMessage(input: $input) { ${MESSAGE_FIELDS} }
     }`,
    { input: { conversationId, text: body.text, imageKey: body.imageKey } },
  );
  return data.sendMessage;
}

// Upload a chat image ahead of sendMessage; returns an opaque storage key
// (not a URL) to pass as SendMessageBody.imageKey.
export async function uploadChatImage(
  conversationId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const data = await graphqlRequest<{ uploadChatImage: string }>(
    `mutation UploadChatImage($conversationId: ID!, $base64: String!, $mimeType: String!) {
       uploadChatImage(conversationId: $conversationId, base64: $base64, mimeType: $mimeType)
     }`,
    { conversationId, base64, mimeType },
  );
  return data.uploadChatImage;
}

// Each provider thread is scoped to one order — `orderId` is required, so a new
// order opens a fresh session instead of reviving the previous conversation.
export async function startConversation(
  branchId: string,
  providerType: ProviderType,
  orderId: string,
): Promise<Conversation> {
  const data = await graphqlRequest<{ startConversation: Conversation }>(
    `mutation StartConversation($input: StartConversationInput!) {
       startConversation(input: $input) { ${CONVERSATION_FIELDS} }
     }`,
    { input: { branchId, providerType, orderId } },
  );
  return data.startConversation;
}

// Open (or reuse) the thread with the rider assigned to one leg of an order.
// The courier is resolved server-side from the order's leg assignment, so the
// pickup rider and the return rider each get their own thread. Throws if no
// rider is assigned to that leg yet.
export async function startCourierConversation(
  orderId: string,
  leg: ChatLegType,
): Promise<Conversation> {
  const data = await graphqlRequest<{ startCourierConversation: Conversation }>(
    `mutation StartCourierConversation($input: StartCourierConversationInput!) {
       startCourierConversation(input: $input) { ${CONVERSATION_FIELDS} }
     }`,
    { input: { orderId, leg } },
  );
  return data.startCourierConversation;
}
