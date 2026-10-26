"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/axios";
import {
  replaceBellNotifications,
  useNotificationStore,
  Notification,
} from "@/store/useNotificationStore";
import { toast } from "sonner";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Loader2,
  UserPlus,
  MessageSquare,
  Calendar,
  Mail,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function NotificationBell() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    bellNotifications,
    unreadCount,
    isLoading,
    setUnreadCount,
    setLoading,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [accepting, setAccepting] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const lastNetworkWarningAt = useRef(0);
  const scopeGeneration = useRef(0);
  const notificationRequestId = useRef(0);
  const countRequestId = useRef(0);
  const pollInFlight = useRef(false);
  const isOpenRef = useRef(isOpen);
  useEffect(() => { isOpenRef.current = isOpen; }, [isOpen]);
  const workspaceMatch = pathname?.match(/\/workspace\/([^/]+)/);
  const scopedWorkspaceId = workspaceMatch?.[1];

  const reportNotificationRequestError = (message: string, error: any) => {
    // Polling continues every 10 seconds, so a temporary backend outage should
    // not fill the console with the same Axios stack trace on every retry.
    if (
      !error?.response &&
      (error?.code === "ERR_NETWORK" || error?.message === "Network Error")
    ) {
      const now = Date.now();
      if (now - lastNetworkWarningAt.current >= 60_000) {
        lastNetworkWarningAt.current = now;
      }
      return;
    }
  };

  // Fetch notifications on mount and poll periodically
  useEffect(() => {
    if (typeof window !== "undefined") {
      const token =
        localStorage.getItem("token") || localStorage.getItem("authToken");
      if (!token || token === "undefined" || token === "null") return;
    }

    ++scopeGeneration.current;
    setPage(1);
    setHasMore(false);
    replaceBellNotifications([]);
    const refresh = async () => {
      if (pollInFlight.current || document.visibilityState !== 'visible' || isOpenRef.current) return;
      const generation = scopeGeneration.current;
      pollInFlight.current = true;
      try {
        await Promise.all([fetchNotifications(), fetchUnreadCount()]);
      } finally {
        if (generation === scopeGeneration.current) pollInFlight.current = false;
      }
    };
    void refresh();
    const interval = setInterval(() => void refresh(), 10000);

    return () => {
      clearInterval(interval);
      ++scopeGeneration.current;
      ++notificationRequestId.current;
      ++countRequestId.current;
      pollInFlight.current = false;
    };
  }, [scopedWorkspaceId]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const fetchNotifications = async (requestedPage = 1, append = false) => {
    const generation = scopeGeneration.current;
    const requestId = ++notificationRequestId.current;
    try {
      // Check if user is authenticated
      if (typeof window !== "undefined") {
        const token =
          localStorage.getItem("token") || localStorage.getItem("authToken");
        if (!token || token === "undefined" || token === "null") {
          return;
        }
      }

      if (append) setLoadingMore(true);
      else setLoading(true);

      // If we have a workspace context, fetch workspace-specific notifications
      // Otherwise fetch all notifications without workspace filter
      let url;
      if (scopedWorkspaceId) {
        url = `/notifications?limit=20&page=${requestedPage}&workspaceId=${scopedWorkspaceId}&t=${Date.now()}`;
      } else {
        // Fetch all unread notifications across all workspaces
        url = `/notifications?limit=20&page=${requestedPage}&t=${Date.now()}`;
      }

      const response = await api.get(url);
      if (generation !== scopeGeneration.current || requestId !== notificationRequestId.current) return;
      const notifications = response.data.data || [];
      const current = useNotificationStore.getState().bellNotifications;
      const merged = append
        ? [
            ...current,
            ...notifications.filter(
              (item: Notification) =>
                !current.some((old) => old._id === item._id)
            ),
          ]
        : notifications;
      replaceBellNotifications(merged);
      setHasMore(response.data.pagination?.hasMore === true);
      if (append) setPage(requestedPage);
      else setPage(1);
    } catch (error: any) {
      reportNotificationRequestError("Failed to fetch notifications:", error);
    } finally {
      if (generation === scopeGeneration.current && requestId === notificationRequestId.current) {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    }
  };

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    void fetchNotifications(page + 1, true);
  };

  const fetchUnreadCount = async () => {
    const generation = scopeGeneration.current;
    const requestId = ++countRequestId.current;
    try {
      // Check if user is authenticated
      if (typeof window !== "undefined") {
        const token =
          localStorage.getItem("token") || localStorage.getItem("authToken");
        if (!token || token === "undefined" || token === "null") {
          return;
        }
      }

      // If we have a workspace context, fetch workspace-specific unread count
      // Otherwise fetch all unread notifications across all workspaces
      let url;
      if (scopedWorkspaceId) {
        url = `/notifications/unread-count?workspaceId=${scopedWorkspaceId}&t=${Date.now()}`;
      } else {
        // Fetch all unread notifications count across all workspaces
        url = `/notifications/unread-count?t=${Date.now()}`;
      }

      const response = await api.get(url);
      if (generation !== scopeGeneration.current || requestId !== countRequestId.current) return;
      setUnreadCount(response.data.data.unreadCount || 0);
    } catch (error: any) {
      reportNotificationRequestError("Failed to fetch unread count:", error);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    void fetchNotifications();
    void fetchUnreadCount();
  }, [isOpen, scopedWorkspaceId]);

  const handleMarkAsRead = async (
    notificationId: string,
    notificationType: string
  ) => {
    try {
      // Call backend API
      await api.patch(`/notifications/${notificationId}/read`);

      // Keep read notifications visible in recent history.
      useNotificationStore.getState().markAsRead(notificationId);

      // Refresh unread count from server
      await fetchUnreadCount();
    } catch (error) {}
  };

  const handleAcceptInvitation = async (notification: Notification) => {
    if (!notification.data?.token) {
      toast.error("Invalid invitation");
      return;
    }

    try {
      setAccepting(notification._id);

      const response = await api.post(
        `/invites/accept/${notification.data.token}`
      );
      const data = response.data.data;

      // Mark notification as read
      await handleMarkAsRead(notification._id, notification.type);

      // Show success message
      toast.success(`Successfully joined ${data.workspace.name}!`);

      // Refresh the page to update sidebar with new workspace
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      toast.error(
        error.response?.data?.message || "Failed to accept invitation"
      );
    } finally {
      setAccepting(null);
    }
  };

  const handleDeclineInvitation = async (notification: Notification) => {
    // Just mark as read
    await handleMarkAsRead(notification._id, notification.type);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "INVITATION":
        return <Mail className="w-5 h-5 text-purple-500" />;
      case "INVITE_ACCEPTED":
      case "MEMBER_JOINED":
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case "TASK_ASSIGNED":
      case "QA_RUN_ASSIGNED":
      case "TASK_UPDATED":
        return <CheckCheck className="w-5 h-5 text-green-500" />;
      case "COMMENT_ADDED":
      case "MENTION":
        return <MessageSquare className="w-5 h-5 text-purple-500" />;
      case "DUE_DATE_REMINDER":
        return <Calendar className="w-5 h-5 text-orange-500" />;
      default:
        return <Bell className="w-5 h-5 text-gray-500" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative grid h-11 w-11 place-items-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-[#262626] dark:hover:text-white"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          role="region"
          aria-label="Notification panel"
          className="fixed inset-x-2 top-[calc(env(safe-area-inset-top)+3.5rem)] bottom-[calc(env(safe-area-inset-bottom)+5rem)] z-50 flex w-auto flex-col rounded-lg border border-border bg-card shadow-2xl sm:absolute sm:inset-x-auto sm:top-auto sm:bottom-auto sm:right-0 sm:mt-2 sm:max-h-[calc(100dvh-5rem)] sm:w-96 sm:max-w-[calc(100vw-1rem)]"
        >
          {/* Header */}
          <div className="p-4 border-b border-border flex items-center justify-between">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={async () => {
                  try {
                    // Call backend API to mark all as read
                    if (!scopedWorkspaceId) return;
                    await api.patch(
                      `/notifications/read-all?workspaceId=${scopedWorkspaceId}`
                    );

                    // Keep recent history visible after marking it read.
                    useNotificationStore
                      .getState()
                      .markAllAsRead(scopedWorkspaceId);

                    // Refresh unread count (should be 0)
                    await fetchUnreadCount();
                  } catch (error) {}
                }}
                className="text-xs text-primary hover:text-primary/80 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            {isLoading && bellNotifications.length === 0 ? (
              <div
                className="flex justify-center p-8"
                role="status"
                aria-label="Loading notifications"
              >
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : bellNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {bellNotifications.map((notification) => (
                  <div
                    key={notification._id}
                    onClick={() => {
                      const runId =
                        notification.data?.runId ||
                        notification.data?.resourceId;
                      if (
                        notification.type !== "QA_RUN_ASSIGNED" ||
                        !notification.data?.workspaceId ||
                        !runId
                      )
                        return;
                      if (!notification.read)
                        void handleMarkAsRead(
                          notification._id,
                          notification.type
                        );
                      setIsOpen(false);
                      router.push(
                        `/workspace/${notification.data.workspaceId}/quality/runs/${runId}`
                      );
                    }}
                    className={`p-3 transition-colors hover:bg-accent sm:p-4 ${
                      !notification.read ? "bg-primary/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h4 className="text-sm font-medium text-foreground">
                            {notification.title}
                          </h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="mb-2 text-sm text-muted-foreground line-clamp-4 sm:line-clamp-none">
                          {notification.body}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {formatDistanceToNow(
                            new Date(notification.createdAt),
                            {
                              addSuffix: true,
                            }
                          )}
                        </p>

                        {/* Invitation Actions */}
                        {notification.type === "INVITATION" &&
                          !notification.read && (
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() =>
                                  handleAcceptInvitation(notification)
                                }
                                disabled={accepting === notification._id}
                                className="flex-1 px-3 py-1.5 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center gap-1"
                              >
                                {accepting === notification._id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    Accepting...
                                  </>
                                ) : (
                                  <>
                                    <Check className="w-3 h-3" />
                                    Accept
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() =>
                                  handleDeclineInvitation(notification)
                                }
                                disabled={accepting === notification._id}
                                className="px-3 py-1.5 border border-border text-muted-foreground text-sm font-medium rounded-lg hover:bg-accent transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                <X className="w-3 h-3" />
                                Decline
                              </button>
                            </div>
                          )}

                        {/* Standard Mark as Read */}
                        {notification.type !== "INVITATION" &&
                          !notification.read && (
                            <button
                              onClick={() =>
                                handleMarkAsRead(
                                  notification._id,
                                  notification.type
                                )
                              }
                              className="text-xs text-primary hover:text-primary/80 font-medium"
                            >
                              Mark as read
                            </button>
                          )}
                      </div>
                    </div>
                  </div>
                ))}
                {hasMore && (
                  <div className="flex justify-center p-3">
                    <button
                      type="button"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="inline-flex min-h-9 items-center gap-2 rounded-md px-3 text-sm font-medium text-primary hover:bg-accent disabled:opacity-60"
                    >
                      {loadingMore && (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      )}
                      {loadingMore ? "Loading…" : "Load more"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-3 border-t border-border">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/notifications");
              }}
              className="w-full text-center text-sm text-primary hover:text-primary/80 font-medium"
            >
              View all notifications
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
