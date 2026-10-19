import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotificationBell } from "./NotificationBell";
import { useNotificationStore } from "@/store/useNotificationStore";

const mocks = vi.hoisted(() => ({
  pathname: "/workspace/ws1/analytics",
  get: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  usePathname: () => mocks.pathname,
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock("@/lib/axios", () => ({
  api: { get: mocks.get, patch: vi.fn(), post: vi.fn() },
}));

const notification = {
  _id: "notice-1",
  type: "TASK_ASSIGNED",
  title: "A task was assigned to you",
  body: "Review the release checklist",
  read: false,
  createdAt: "2026-10-13T00:00:00.000Z",
  data: { workspaceId: "ws1" },
};

describe("NotificationBell", () => {
  beforeEach(() => {
    localStorage.clear();
    useNotificationStore.getState().clearNotifications();
    useNotificationStore.getState().setLoading(false);
    mocks.pathname = "/workspace/ws1/analytics";
    mocks.get.mockReset();
    mocks.get.mockImplementation((url: string) => {
      if (url.startsWith("/notifications?")) {
        return Promise.resolve({ data: { data: [notification] } });
      }
      if (url.startsWith("/notifications/unread-count")) {
        return Promise.resolve({ data: { data: { unreadCount: 1 } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });
  });

  it("renders the notifications fetched for the bell without requiring the full notifications page", async () => {
    localStorage.setItem("authToken", "valid-token");
    render(<NotificationBell />);

    await waitFor(() =>
      expect(mocks.get).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\/notifications\?limit=20&page=1&workspaceId=ws1/
        )
      )
    );
    await waitFor(() =>
      expect(useNotificationStore.getState().bellNotifications).toHaveLength(1)
    );
    fireEvent.click(screen.getByTitle("Notifications"));
    expect(
      await screen.findByText("A task was assigned to you")
    ).toBeInTheDocument();
  });

  it("keeps the mobile notification panel between the app header and bottom navigation", async () => {
    localStorage.setItem("authToken", "valid-token");
    render(<NotificationBell />);
    await waitFor(() =>
      expect(useNotificationStore.getState().bellNotifications).toHaveLength(1)
    );

    fireEvent.click(screen.getByTitle("Notifications"));

    const panel = screen.getByRole("region", { name: "Notification panel" });
    expect(panel).toHaveClass("fixed", "inset-x-2", "sm:absolute");
    expect(panel.className).toContain(
      "bottom-[calc(env(safe-area-inset-bottom)+5rem)]"
    );
  });

  it("loads and appends later notification pages from the bell panel", async () => {
    localStorage.setItem("authToken", "valid-token");
    const olderNotification = {
      ...notification,
      _id: "notice-2",
      title: "An older notification",
    };
    mocks.get.mockImplementation((url: string) => {
      if (url.startsWith("/notifications?")) {
        if (url.includes("page=2")) {
          return Promise.resolve({
            data: { data: [olderNotification], pagination: { hasMore: false } },
          });
        }
        return Promise.resolve({
          data: { data: [notification], pagination: { hasMore: true } },
        });
      }
      if (url.startsWith("/notifications/unread-count")) {
        return Promise.resolve({ data: { data: { unreadCount: 1 } } });
      }
      return Promise.resolve({ data: { data: {} } });
    });

    render(<NotificationBell />);
    await waitFor(() =>
      expect(useNotificationStore.getState().bellNotifications).toHaveLength(1)
    );
    fireEvent.click(screen.getByTitle("Notifications"));
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));

    expect(
      await screen.findByText("An older notification")
    ).toBeInTheDocument();
    await waitFor(() =>
      expect(
        useNotificationStore.getState().bellNotifications.map(({ _id }) => _id)
      ).toEqual(["notice-1", "notice-2"])
    );
    expect(mocks.get).toHaveBeenCalledWith(expect.stringMatching(/page=2/));
  });
});
