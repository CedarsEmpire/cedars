import { describe, expect, it } from "vitest";
import { canonicalGridLayerCounts, gridCatalog } from "../src/features/grid-catalog.js";

describe("canonical CEDARS Grid catalogue", () => {
  it("contains exactly 53 uniquely identified Grids", () => {
    expect(gridCatalog).toHaveLength(53);
    expect(new Set(gridCatalog.map((grid) => grid.id)).size).toBe(53);
  });

  it("assigns every Grid to exactly one canonical parent layer", () => {
    const counts = Object.fromEntries(
      Object.entries(canonicalGridLayerCounts).map(([layer]) => [
        layer,
        gridCatalog.filter((grid) => grid.layer === layer).length
      ])
    );
    expect(counts).toEqual(canonicalGridLayerCounts);
    expect(gridCatalog.every((grid) => Object.hasOwn(canonicalGridLayerCounts, grid.layer))).toBe(true);
  });

  it("includes the required Bitcoin research hierarchy and CEDARS Coin Grid", () => {
    const ids = new Set(gridCatalog.map((grid) => grid.id));
    for (const id of [
      "bitcoin", "bitcoin-trust", "monetary-network", "scarcity-model",
      "security-history", "adoption-intelligence", "cedars-coin"
    ]) expect(ids.has(id)).toBe(true);
  });
});
