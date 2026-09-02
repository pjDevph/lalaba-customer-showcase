import fs from "fs";
import path from "path";
import {
  routeForNotification,
  NOTIFICATIONS_ROUTE,
} from "../notificationRouting";

describe("routeForNotification", () => {
  it("HP: an order notification opens that order", () => {
    expect(routeForNotification({ type: "ORDER_STATUS", orderId: "o1" })).toBe(
      "/orders/o1",
    );
    expect(
      routeForNotification({ type: "ORDER_ACTION_NEEDED", orderId: "o1" }),
    ).toBe("/orders/o1");
  });

  // A customer tapping "your courier is on the way" wants to see where they
  // are, not to read the order again.
  it("HP: an en-route notification opens live tracking", () => {
    for (const status of ["pickup_en_route", "return_en_route"]) {
      expect(
        routeForNotification({ type: "ORDER_STATUS", orderId: "o1", status }),
      ).toBe("/orders/o1/tracking");
    }
  });

  it("HP: every other order status opens the order itself", () => {
    for (const status of ["accepted_by_provider", "pickup_weighed", "laundry_ready"]) {
      expect(
        routeForNotification({ type: "ORDER_STATUS", orderId: "o1", status }),
      ).toBe("/orders/o1");
    }
  });

  it("EC: an order notification with no id falls back to the order list", () => {
    expect(routeForNotification({ type: "ORDER_STATUS" })).toBe("/(tabs)/orders");
  });

  it("SEC: the order id is escaped rather than spliced into the path raw", () => {
    expect(
      routeForNotification({ type: "ORDER_STATUS", orderId: "a/b?c" }),
    ).toBe("/orders/a%2Fb%3Fc");
  });

  it("HP: a chat notification opens the conversation", () => {
    expect(routeForNotification({ type: "BROADCAST", conversationId: "c1" })).toBe(
      "/chat/c1",
    );
  });

  // Provider-only types should never reach a customer, but if one does it must
  // land somewhere real rather than dead-ending the way the merchant app did.
  it("SEC: an unknown or provider-only type lands in the inbox", () => {
    for (const type of [
      "KYC_APPROVED",
      "DEVICE_REGISTRATION",
      "STAFF_LOGIN",
      "SOMETHING_A_NEWER_BACKEND_SENDS",
      "",
    ]) {
      expect(routeForNotification({ type })).toBe(NOTIFICATIONS_ROUTE);
    }
  });
});

// The merchant app shipped two dead-ends from routing strings that named
// screens which did not exist — both looked entirely plausible in review. So
// the table is checked against the filesystem instead of by eye.
describe("every routed destination exists", () => {
  const appDir = path.join(__dirname, "..", "..", "..", "app");

  const routeExists = (route: string): boolean => {
    const clean = route.split("?")[0].replace(/^\//, "");
    // A dynamic segment (/orders/o1) resolves to its [id] file.
    const asDynamic = clean.replace(/\/[^/]+$/, "/[id]");
    return (
      fs.existsSync(path.join(appDir, `${clean}.tsx`)) ||
      fs.existsSync(path.join(appDir, clean, "index.tsx")) ||
      fs.existsSync(path.join(appDir, `${asDynamic}.tsx`))
    );
  };

  it("HP: for every type, with and without an order id", () => {
    const broken: string[] = [];
    for (const type of [
      "ORDER_STATUS",
      "ORDER_ACTION_NEEDED",
      "BROADCAST",
      "UNKNOWN_FUTURE_TYPE",
    ]) {
      for (const data of [{ type }, { type, orderId: "o1" }]) {
        const route = routeForNotification(data);
        if (!routeExists(route)) broken.push(`${type} -> ${route}`);
      }
    }
    expect(broken).toEqual([]);
  });

  it("HP: the inbox itself exists", () => {
    expect(routeExists(NOTIFICATIONS_ROUTE)).toBe(true);
  });
});
