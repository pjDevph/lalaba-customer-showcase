// src/services/graphql/presence.ts
// Lightweight online/last-seen presence for chat counterparties. The caller
// heartbeats their own presence (pingPresence) and polls a target uid's
// status (presence) — used by the chat thread header to show a live dot.

import { graphqlRequest } from "../../config/graphql";
import type { PresenceStatus } from "../../types/api";

export async function pingPresence(): Promise<boolean> {
  const data = await graphqlRequest<{ pingPresence: boolean }>(
    `mutation PingPresence { pingPresence }`,
  );
  return data.pingPresence;
}

export async function getPresence(uid: string): Promise<PresenceStatus> {
  const data = await graphqlRequest<{ presence: PresenceStatus }>(
    `query Presence($uid: ID!) {
       presence(uid: $uid) { uid isOnline lastSeenAt }
     }`,
    { uid },
  );
  return data.presence;
}
