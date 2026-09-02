// src/services/graphql/supportTickets.ts
// GraphQL operations for the customer's OWN support ticket — the requester-
// scoped counterpart to the admin panel's ticket queue. Mirrors chat.ts's
// shape; a support "thread" is a SupportTicket + its CUSTOMER-visible notes,
// not a Conversation — see MySupportTicketsResolver on the backend for why.

import { graphqlRequest } from "../../config/graphql";
import type { SupportTicket, SupportTicketNote, TicketCategory } from "../../types/api";

const TICKET_FIELDS = `
  _id ticketNumber subject body status category assignedToName requesterLastReadAt createdAt updatedAt
`;

const NOTE_FIELDS = `
  _id authorUid authorName body imageUrl createdAt
`;

export async function myOpenSupportTicket(): Promise<SupportTicket | null> {
  const data = await graphqlRequest<{ myOpenSupportTicket: SupportTicket | null }>(
    `query MyOpenSupportTicket { myOpenSupportTicket { ${TICKET_FIELDS} } }`,
  );
  return data.myOpenSupportTicket;
}

export async function mySupportTicketNotes(ticketId: string): Promise<SupportTicketNote[]> {
  const data = await graphqlRequest<{ mySupportTicketNotes: SupportTicketNote[] }>(
    `query MySupportTicketNotes($ticketId: ID!) {
       mySupportTicketNotes(ticketId: $ticketId) { ${NOTE_FIELDS} }
     }`,
    { ticketId },
  );
  return data.mySupportTicketNotes;
}

export interface CreateMyTicketInput {
  subject: string;
  body: string;
  category: TicketCategory;
  orderId?: string;
}

export async function createMySupportTicket(
  input: CreateMyTicketInput,
): Promise<SupportTicket> {
  const data = await graphqlRequest<{ createMySupportTicket: SupportTicket }>(
    `mutation CreateMySupportTicket($input: CreateMyTicketInput!) {
       createMySupportTicket(input: $input) { ${TICKET_FIELDS} }
     }`,
    { input },
  );
  return data.createMySupportTicket;
}

export async function addMySupportTicketNote(
  ticketId: string,
  body: string,
  imageKey?: string,
): Promise<SupportTicketNote> {
  const data = await graphqlRequest<{ addMySupportTicketNote: SupportTicketNote }>(
    `mutation AddMySupportTicketNote($ticketId: ID!, $body: String!, $imageKey: String) {
       addMySupportTicketNote(ticketId: $ticketId, body: $body, imageKey: $imageKey) { ${NOTE_FIELDS} }
     }`,
    { ticketId, body, imageKey },
  );
  return data.addMySupportTicketNote;
}

// Upload-first-reference-next, same shape as chat's uploadChatImage: returns
// an opaque storage key to pass into addMySupportTicketNote's imageKey.
export async function uploadMySupportTicketImage(
  ticketId: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const data = await graphqlRequest<{ uploadMySupportTicketImage: string }>(
    `mutation UploadMySupportTicketImage($ticketId: ID!, $base64: String!, $mimeType: String!) {
       uploadMySupportTicketImage(ticketId: $ticketId, base64: $base64, mimeType: $mimeType)
     }`,
    { ticketId, base64, mimeType },
  );
  return data.uploadMySupportTicketImage;
}

export async function markMySupportTicketRead(ticketId: string): Promise<boolean> {
  const data = await graphqlRequest<{ markMySupportTicketRead: boolean }>(
    `mutation MarkMySupportTicketRead($ticketId: ID!) {
       markMySupportTicketRead(ticketId: $ticketId)
     }`,
    { ticketId },
  );
  return data.markMySupportTicketRead;
}

export async function closeMySupportTicket(ticketId: string): Promise<SupportTicket> {
  const data = await graphqlRequest<{ closeMySupportTicket: SupportTicket }>(
    `mutation CloseMySupportTicket($ticketId: ID!) {
       closeMySupportTicket(ticketId: $ticketId) { ${TICKET_FIELDS} }
     }`,
    { ticketId },
  );
  return data.closeMySupportTicket;
}
