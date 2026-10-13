import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { TeamPerformanceTable } from "./TeamPerformanceTable";

describe("TeamPerformanceTable mobile layout", () => {
  it("shows the same member metrics in a narrow-screen card", () => {
    render(<TeamPerformanceTable members={[{ user: { _id: "u1", name: "Alex Longname" }, role: "QA", status: "active" }]} tasks={[]} searchQuery="" />);
    expect(screen.getByTestId("team-performance-mobile-cards")).toBeTruthy();
    const mobileCards = screen.getByTestId("team-performance-mobile-cards");
    expect(within(mobileCards).getByText("Alex Longname")).toBeTruthy();
    expect(within(mobileCards).getByText("CLOCKED IN")).toBeTruthy();
    expect(within(mobileCards).getByText("0 / 0")).toBeTruthy();
  });
});
