// src/stores/supportTicketStore.ts
// The customer's own support ticket — mirrors chatStore.ts's shape, but there
// is exactly one thread (the requester's single ongoing report, per
// findMostRecentActiveForRequester), not a list.

import { create } from "zustand";
import { userErrorMessage } from "../utils/userError";
import {
  myOpenSupportTicket,
  mySupportTicketNotes,
  createMySupportTicket,
  addMySupportTicketNote,
  uploadMySupportTicketImage,
  markMySupportTicketRead,
  closeMySupportTicket,
  type CreateMyTicketInput,
} from "../services/graphql/supportTickets";
import type { SupportTicket, SupportTicketNote } from "../types/api";

interface SupportTicketState {
  ticket: SupportTicket | null;
  notes: SupportTicketNote[];
  loading: boolean;
  sending: boolean;
  uploading: boolean;
  error: string | null;

  loadTicket: () => Promise<void>;
  loadNotes: (ticketId: string) => Promise<void>;
  create: (input: CreateMyTicketInput) => Promise<SupportTicket | null>;
  send: (ticketId: string, body: string, imageKey?: string) => Promise<void>;
  sendImage: (ticketId: string, base64: string, mimeType: string) => Promise<void>;
  markRead: (ticketId: string) => Promise<void>;
  endSession: (ticketId: string) => Promise<boolean>;
  reset: () => void;
}

function errMsg(err: unknown, fallback: string): string {
  return userErrorMessage(err, fallback);
}

export const useSupportTicketStore = create<SupportTicketState>()((set, get) => ({
  ticket: null,
  notes: [],
  loading: false,
  sending: false,
  uploading: false,
  error: null,

  loadTicket: async () => {
    set({ loading: true, error: null });
    try {
      const ticket = await myOpenSupportTicket();
      set({ ticket, loading: false });
    } catch (err) {
      set({ error: errMsg(err, "Could not load your support ticket."), loading: false });
    }
  },

  loadNotes: async (ticketId) => {
    set({ error: null });
    try {
      set({ notes: await mySupportTicketNotes(ticketId) });
    } catch (err) {
      set({ error: errMsg(err, "Could not load this conversation.") });
    }
  },

  create: async (input) => {
    set({ sending: true, error: null });
    try {
      const ticket = await createMySupportTicket(input);
      set({ ticket, sending: false });
      return ticket;
    } catch (err) {
      set({ error: errMsg(err, "Could not send your report."), sending: false });
      return null;
    }
  },

  send: async (ticketId, body, imageKey) => {
    set({ sending: true, error: null });
    try {
      const note = await addMySupportTicketNote(ticketId, body, imageKey);
      set({ notes: [...get().notes, note], sending: false });
    } catch (err) {
      set({ error: errMsg(err, "Could not send your message."), sending: false });
    }
  },

  sendImage: async (ticketId, base64, mimeType) => {
    set({ uploading: true, error: null });
    try {
      const key = await uploadMySupportTicketImage(ticketId, base64, mimeType);
      const note = await addMySupportTicketNote(ticketId, "", key);
      set({ notes: [...get().notes, note], uploading: false });
    } catch (err) {
      set({ error: errMsg(err, "Could not send your photo."), uploading: false });
    }
  },

  endSession: async (ticketId) => {
    try {
      await closeMySupportTicket(ticketId);
      const ticket = get().ticket;
      if (ticket && ticket._id === ticketId) {
        set({ ticket: { ...ticket, status: "CLOSED" } });
      }
      return true;
    } catch (err) {
      set({ error: errMsg(err, "Could not end this session.") });
      return false;
    }
  },

  markRead: async (ticketId) => {
    try {
      await markMySupportTicketRead(ticketId);
      const ticket = get().ticket;
      if (ticket && ticket._id === ticketId) {
        set({ ticket: { ...ticket, requesterLastReadAt: new Date().toISOString() } });
      }
    } catch {
      // Read-state is a nice-to-have — a failed stamp just leaves the badge
      // showing unread a little longer, never worth surfacing an error for.
    }
  },

  reset: () => set({ ticket: null, notes: [], loading: false, sending: false, uploading: false, error: null }),
}));
