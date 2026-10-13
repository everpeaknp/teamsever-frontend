import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PlansSkeleton } from "./page";

describe("PlansSkeleton mobile layout", () => {
  it("constrains the header description skeleton to its available width", () => {
    render(<PlansSkeleton />);
    expect(screen.getByTestId("plans-description-skeleton").className).toContain("max-w-96");
  });
});
