import { humanizeCategory } from "../parts";

// The chip under a provider card. It read "wash and fold" on device: the first
// letter was never uppercased, so the `\bAnd\b` replacement — which is
// case-sensitive — could never match the string this function had just built,
// and both halves of the intended formatting silently did nothing.
describe("humanizeCategory", () => {
  it('renders "wash_and_fold" as "Wash & Fold"', () => {
    expect(humanizeCategory("wash_and_fold")).toBe("Wash & Fold");
  });

  it("title-cases a category with no conjunction", () => {
    expect(humanizeCategory("dry_clean")).toBe("Dry Clean");
  });

  it("normalises SHOUTING enum values from the wire", () => {
    expect(humanizeCategory("WASH_AND_IRON")).toBe("Wash & Iron");
    expect(humanizeCategory("IRON_ONLY")).toBe("Iron Only");
  });

  it("leaves a single word capitalised", () => {
    expect(humanizeCategory("express")).toBe("Express");
  });

  it("does not choke on empty segments", () => {
    expect(humanizeCategory("")).toBe("");
  });
});
