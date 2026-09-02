import { promoBasisCentavos } from "../promoBasis";

// The picker prices vouchers against this. Getting it wrong is invisible until
// someone swaps one voucher for another and a minimum-spend rule starts
// failing — which reads as a broken voucher, not as broken arithmetic.
describe("promoBasisCentavos", () => {
  it("is the total when nothing is applied", () => {
    expect(
      promoBasisCentavos({ estimatedTotalCentavos: 50_000, discountCentavos: null }),
    ).toBe(50_000);
  });

  it("adds back a discount already applied", () => {
    // ₱500 order with ₱100 off shows ₱400 — but the voucher rules are judged
    // against ₱500, which is what the server does.
    expect(
      promoBasisCentavos({ estimatedTotalCentavos: 40_000, discountCentavos: 10_000 }),
    ).toBe(50_000);
  });

  it("keeps the basis stable while swapping vouchers", () => {
    // The case that matters: two different vouchers must be judged against the
    // same order, not against whatever the previous one had reduced it to.
    const withA = promoBasisCentavos({
      estimatedTotalCentavos: 40_000,
      discountCentavos: 10_000,
    });
    const withB = promoBasisCentavos({
      estimatedTotalCentavos: 30_000,
      discountCentavos: 20_000,
    });
    expect(withA).toBe(withB);
  });

  it("handles a missing quote without inventing a total", () => {
    expect(promoBasisCentavos(null)).toBe(0);
    expect(promoBasisCentavos(undefined)).toBe(0);
    expect(promoBasisCentavos({})).toBe(0);
  });

  it("never returns a negative basis", () => {
    expect(
      promoBasisCentavos({ estimatedTotalCentavos: -100, discountCentavos: -50 }),
    ).toBe(0);
  });
});
