// src/services/graphql/orders.ts
// GraphQL operations for the customer's online orders: list, detail, timeline,
// and the customer-side action mutations (approve provider change, cancel,
// reschedule pickup, respond to a quality hold, choose a return option, etc.).

import { graphqlRequest } from "../../config/graphql";
import type {
  OnlineOrder,
  OrderEvent,
  FulfillmentReturnMode,
} from "../../types/api";

// ─── Fragments ────────────────────────────────────────────────────────────────
const BRANCH_ADDRESS_FIELDS = `
  unit streetAddress barangayName cityMunicipalityName
  provinceName regionName zipCode
`;

const LEG_ASSIGNMENT_FIELDS = `
  assignedStaffUid assignedAt enRouteAt arrivedAt completedAt
  locationLat locationLng locationAt locationAccuracy locationSpeed locationHeading locationSequence
`;

const ATTEMPT_FIELDS = `
  attemptNumber actorUid responsibility reason photoUrls gpsLat gpsLng timestamp
`;

// Rich fragment covering every field the order screens render.
export const ONLINE_ORDER_FIELDS = `
  _id
  orderNumber
  status
  version
  customer {
    uid displayName maskedPhone
    address { ${BRANCH_ADDRESS_FIELDS} }
    mapLocation { latitude longitude }
  }
  provider { providerUid branchId providerName providerType }
  providerVerified
  serviceLines {
    serviceRefId serviceName pricingType price baseKilos excessRate
    estimatedLineTotalCentavos actualLineTotalCentavos productSurchargeCentavos
  }
  fulfillment { pickupMode pickupSubMode returnMode deliverySubMode }
  instructions {
    pickupInstructions returnInstructions accessInstructions
    laundryCareInstructions customerGeneralNotes providerNotes
  }
  pricing {
    estimatedWeightKg estimatedTotalCentavos actualWeightKg actualPieceCount
    actualServiceTotalCentavos customerTotalCentavos
    platformFeePercent platformFeeCentavos
    serviceSubtotalCentavos pickupFeeCentavos returnFeeCentavos pricingRuleVersion
    promoCode discountCentavos
  }
  paymentSummary {
    method amountCollectedCentavos collectedAt lastCollectedAt collectedByUid referenceId
  }
  paymentTiming
  paymentStatus
  amountDueCentavos
  pickupProofUrls
  returnProofUrls
  pickupAssignment { ${LEG_ASSIGNMENT_FIELDS} }
  returnAssignment { ${LEG_ASSIGNMENT_FIELDS} }
  pickupAttempts { ${ATTEMPT_FIELDS} }
  deliveryAttempts { ${ATTEMPT_FIELDS} }
  activeQualityHold {
    serviceLineIndex category reason photoUrls additionalChargeCentavos
    blocksOrder customerResponse raisedAt respondTimeoutAt resolvedAt
  }
  cancellationReason
  rejectionReason
  completedAt
  createdAt
  updatedAt
`;

// ─── Queries ──────────────────────────────────────────────────────────────────
export async function myOnlineOrders(): Promise<OnlineOrder[]> {
  const data = await graphqlRequest<{ myOnlineOrders: OnlineOrder[] }>(
    `query MyOnlineOrders { myOnlineOrders { ${ONLINE_ORDER_FIELDS} } }`,
  );
  return data.myOnlineOrders;
}

export async function onlineOrder(id: string): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ onlineOrder: OnlineOrder }>(
    `query OnlineOrder($id: ID!) { onlineOrder(id: $id) { ${ONLINE_ORDER_FIELDS} } }`,
    { id },
  );
  return data.onlineOrder;
}

export async function onlineOrderTimeline(orderId: string): Promise<OrderEvent[]> {
  const data = await graphqlRequest<{ onlineOrderTimeline: OrderEvent[] }>(
    `query OnlineOrderTimeline($orderId: ID!) {
       onlineOrderTimeline(orderId: $orderId) {
         _id orderId sequence fromStatus toStatus actorUid actorRole note createdAt
       }
     }`,
    { orderId },
  );
  return data.onlineOrderTimeline;
}

// ─── Customer action mutations ────────────────────────────────────────────────
// Provider proposed a change (e.g. adjusted pricing) — approve or reject it.
export async function respondToProviderChange(
  orderId: string,
  approve: boolean,
): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ respondToProviderChange: OnlineOrder }>(
    `mutation RespondToProviderChange($orderId: ID!, $approve: Boolean!) {
       respondToProviderChange(orderId: $orderId, approve: $approve) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { orderId, approve },
  );
  return data.respondToProviderChange;
}

// cancelOnlineOrder takes a CancelOrderInput { reason } alongside orderId.
export async function cancelOnlineOrder(
  orderId: string,
  reason: string,
): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ cancelOnlineOrder: OnlineOrder }>(
    `mutation CancelOnlineOrder($orderId: ID!, $input: CancelOrderInput!) {
       cancelOnlineOrder(orderId: $orderId, input: $input) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { orderId, input: { reason } },
  );
  return data.cancelOnlineOrder;
}

export async function reschedulePickup(orderId: string): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ reschedulePickup: OnlineOrder }>(
    `mutation ReschedulePickup($orderId: ID!) {
       reschedulePickup(orderId: $orderId) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { orderId },
  );
  return data.reschedulePickup;
}

export async function cancelAfterFailedPickup(orderId: string): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ cancelAfterFailedPickup: OnlineOrder }>(
    `mutation CancelAfterFailedPickup($orderId: ID!) {
       cancelAfterFailedPickup(orderId: $orderId) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { orderId },
  );
  return data.cancelAfterFailedPickup;
}

// respondToQualityHold takes a RespondToQualityHoldInput { approve }.
export async function respondToQualityHold(
  orderId: string,
  approve: boolean,
): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ respondToQualityHold: OnlineOrder }>(
    `mutation RespondToQualityHold($orderId: ID!, $input: RespondToQualityHoldInput!) {
       respondToQualityHold(orderId: $orderId, input: $input) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { orderId, input: { approve } },
  );
  return data.respondToQualityHold;
}

export async function chooseReturnOption(
  orderId: string,
  returnMode: FulfillmentReturnMode,
): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ chooseReturnOption: OnlineOrder }>(
    `mutation ChooseReturnOption($orderId: ID!, $returnMode: FulfillmentReturnMode!) {
       chooseReturnOption(orderId: $orderId, returnMode: $returnMode) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { orderId, returnMode },
  );
  return data.chooseReturnOption;
}

export async function scheduleRedelivery(orderId: string): Promise<OnlineOrder> {
  const data = await graphqlRequest<{ scheduleRedelivery: OnlineOrder }>(
    `mutation ScheduleRedelivery($orderId: ID!) {
       scheduleRedelivery(orderId: $orderId) { ${ONLINE_ORDER_FIELDS} }
     }`,
    { orderId },
  );
  return data.scheduleRedelivery;
}
