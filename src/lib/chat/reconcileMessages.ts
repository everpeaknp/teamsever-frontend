import type { ChatMessage } from '@/hooks/useChat';

const MAX_ECHO_TIME_DIFFERENCE_MS = 2 * 60 * 1000;
const ALLOWED_CLOCK_SKEW_MS = 5 * 1000;

const entityId = (value: unknown): string | undefined => {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object') {
    const entity = value as { _id?: unknown; id?: unknown };
    if (typeof entity._id === 'string') return entity._id;
    if (typeof entity.id === 'string') return entity.id;
  }
  return undefined;
};

/** Replaces optimistic bubbles with matching server echoes without hiding rapid repeats. */
export function reconcileChatMessages(
  serverMessages: ChatMessage[],
  optimisticMessages: ChatMessage[],
): ChatMessage[] {
  const matchedServerIds = new Set<string>();
  const pendingOptimistic: ChatMessage[] = [];

  for (const optimistic of optimisticMessages) {
    // A successful HTTP/socket send can complete before the server echo reaches
    // this client. Keep its optimistic bubble until a matching persisted echo
    // arrives, otherwise it briefly disappears from the conversation.
    if (!optimistic.tempId) continue;

    const optimisticTime = new Date(optimistic.createdAt).getTime();
    const matchingEcho = serverMessages
      .filter((server) => {
        if (matchedServerIds.has(server._id) || server.tempId) return false;
        if (server.content !== optimistic.content) return false;

        const senderId = typeof server.sender === 'string' ? server.sender : server.sender?._id;
        const optimisticSenderId = typeof optimistic.sender === 'string' ? optimistic.sender : optimistic.sender?._id;
        if (!senderId || senderId !== optimisticSenderId) return false;

        if (optimistic.conversation && entityId(server.conversation) !== entityId(optimistic.conversation)) return false;
        if (optimistic.channel && server.channel && entityId(server.channel) !== entityId(optimistic.channel)) return false;

        const timeDifference = new Date(server.createdAt).getTime() - optimisticTime;
        return timeDifference >= -ALLOWED_CLOCK_SKEW_MS && timeDifference <= MAX_ECHO_TIME_DIFFERENCE_MS;
      })
      .sort((a, b) =>
        Math.abs(new Date(a.createdAt).getTime() - optimisticTime) -
        Math.abs(new Date(b.createdAt).getTime() - optimisticTime)
      )[0];

    if (matchingEcho) matchedServerIds.add(matchingEcho._id);
    else pendingOptimistic.push(optimistic);
  }

  return [...serverMessages, ...pendingOptimistic].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}
