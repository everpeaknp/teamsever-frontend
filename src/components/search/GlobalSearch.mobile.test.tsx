import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { GlobalSearch } from "./GlobalSearch";
import { useSearchStore } from "@/store/useSearchStore";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/useGlobalSearch", () => ({ useGlobalSearch: vi.fn() }));

describe("GlobalSearch mobile layout", () => {
  beforeEach(() => {
    useSearchStore.setState({ isOpen: true, query: "", results: [], selectedIndex: 0, isSearching: false });
  });

  it("keeps the search dialog within phone width and visible height", () => {
    render(<GlobalSearch />);
    const dialog = screen.getByRole("dialog", { name: "Global search" });
    expect(dialog.className).toContain("w-[calc(100vw-1rem)]");
    expect(screen.getByText("Start typing to search...")).toBeTruthy();
  });
});
