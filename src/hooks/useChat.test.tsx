import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useChat } from './useChat';
import { api } from '@/lib/axios';

const socketContext = vi.hoisted(() => ({ socket: null as any }));
const socketFns = vi.hoisted(() => ({ joinDM: vi.fn(), leaveDM: vi.fn() }));

vi.mock('@/contexts/SocketContext', () => ({
  useSocket: () => ({ socket: socketContext.socket }),
}));
vi.mock('@/lib/socket', () => socketFns);
vi.mock('@/lib/axios', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
}));
vi.mock('@/store/useChatStore', () => ({
  useChatStore: Object.assign(() => ({ addMessage: vi.fn(), updateMessage: vi.fn() }), {
    getState: () => ({ getRoom: () => undefined }),
  }),
  generateDMRoomId: () => 'dm-room',
}));

function fakeSocket() {
  const handlers = new Map<string, (data: any) => void>();
  return {
    handlers,
    on: vi.fn((event: string, handler: (data: any) => void) => handlers.set(event, handler)),
    off: vi.fn((event: string) => handlers.delete(event)),
    emit: vi.fn(),
  };
}

describe('useChat live DM updates', () => {
  beforeEach(() => {
    socketContext.socket = null;
    vi.mocked(api.get).mockResolvedValue({ data: { success: true, data: [{
      _id: 'request-message', conversation: 'conversation', content: 'Leave request',
      sender: { _id: 'requester', name: 'Requester' }, createdAt: new Date().toISOString(),
      metadata: { status: 'pending' },
    }] } } as any);
    localStorage.setItem('authToken', 'test-token');
    localStorage.setItem('userId', 'requester');
  });


  it('sends reply targets through both direct and channel transports', async () => {
    const direct = renderHook(() => useChat({ type: 'direct', workspaceId: 'workspace', conversationId: 'conversation', userId: 'manager' }));
    await act(async () => { await direct.result.current.sendMessage('direct reply', [], 'dm-target'); });
    expect(api.post).toHaveBeenCalledWith('/dm/manager/message', expect.objectContaining({ replyToMessageId: 'dm-target' }));

    const socket = fakeSocket();
    socketContext.socket = socket;
    const channel = renderHook(() => useChat({ type: 'workspace', workspaceId: 'workspace', channelId: 'channel' }));
    await act(async () => { await channel.result.current.sendMessage('group reply', [], 'channel-target'); });
    expect(socket.emit).toHaveBeenCalledWith('chat:send', expect.objectContaining({ replyToMessageId: 'channel-target' }));
  });

  it('attaches to the socket when it becomes available after the chat first renders', async () => {
    const { result, rerender } = renderHook(() => useChat({
      type: 'direct', workspaceId: 'workspace', conversationId: 'conversation', userId: 'manager',
    }));
    const socket = fakeSocket();
    socketContext.socket = socket;
    rerender();

    await waitFor(() => expect(socket.on).toHaveBeenCalledWith('dm:updated', expect.any(Function)));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));
    act(() => socket.handlers.get('dm:updated')?.({ message: {
      _id: 'request-message', conversation: 'conversation', metadata: { status: 'approved' },
    } }));
    expect(result.current.messages[0].metadata?.status).toBe('approved');
  });

  it('ignores typing events from the current user on another group-chat device', async () => {
    const socket = fakeSocket();
    socketContext.socket = socket;
    const { result, unmount } = renderHook(() => useChat({
      type: 'workspace', workspaceId: 'workspace', channelId: 'channel',
    }));
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => socket.handlers.get('chat:user_typing')?.({
      channelId: 'channel', userId: 'requester', userName: 'R.a.mon',
    }));

    expect(result.current.typingUsers).toEqual([]);
    unmount();
  });

  it('expires a typing indicator when a stop event is lost', async () => {
    const socket = fakeSocket();
    socketContext.socket = socket;
    const { result, unmount } = renderHook(() => useChat({
      type: 'workspace', workspaceId: 'workspace', channelId: 'channel',
    }));

    act(() => socket.handlers.get('chat:user_typing')?.({
      channelId: 'channel', userId: 'member-2', userName: 'Namrata',
    }));
    expect(result.current.typingUsers).toEqual(['Namrata']);

    await act(async () => new Promise(resolve => setTimeout(resolve, 5_100)));
    expect(result.current.typingUsers).toEqual([]);
    unmount();
  }, 7_000);

  it('keeps an incoming DM that arrives while the first history request is loading', async () => {
    let resolveHistory!: (value: any) => void;
    vi.mocked(api.get).mockReturnValueOnce(new Promise(resolve => { resolveHistory = resolve; }) as any);
    const socket = fakeSocket();
    socketContext.socket = socket;
    const { result } = renderHook(() => useChat({
      type: 'direct', workspaceId: 'workspace', conversationId: 'conversation', userId: 'manager',
    }));

    await waitFor(() => expect(socket.on).toHaveBeenCalledWith('dm:new', expect.any(Function)));
    act(() => socket.handlers.get('dm:new')?.({ message: {
      _id: 'arrived-live', conversation: 'conversation', content: 'Leave request',
      sender: { _id: 'requester', name: 'Requester' }, createdAt: new Date().toISOString(),
      type: 'leave_request', metadata: { status: 'pending' },
    } }));
    await act(async () => {
      resolveHistory({ data: { success: true, data: [] } });
    });

    expect(result.current.messages.map(message => message._id)).toContain('arrived-live');
  });

  it('keeps a live approval when the initial history response contains the older pending card', async () => {
    let resolveHistory!: (value: any) => void;
    vi.mocked(api.get).mockReturnValueOnce(new Promise(resolve => { resolveHistory = resolve; }) as any);
    const socket = fakeSocket();
    socketContext.socket = socket;
    const { result } = renderHook(() => useChat({
      type: 'direct', workspaceId: 'workspace', conversationId: 'conversation', userId: 'manager',
    }));

    await waitFor(() => expect(socket.on).toHaveBeenCalledWith('dm:updated', expect.any(Function)));
    act(() => socket.handlers.get('dm:updated')?.({ message: {
      _id: 'request-message', conversation: 'conversation', type: 'leave_request',
      metadata: { status: 'approved' },
    } }));
    await act(async () => {
      resolveHistory({ data: { success: true, data: [{
        _id: 'request-message', conversation: 'conversation', content: 'Leave request',
        sender: { _id: 'requester', name: 'Requester' }, createdAt: new Date().toISOString(),
        type: 'leave_request', metadata: { status: 'pending' },
      }] } });
    });

    expect(result.current.messages[0].metadata?.status).toBe('approved');
  });

  it('retains a live deletion update as a tombstone in the active DM', async () => {
    const socket = fakeSocket();
    socketContext.socket = socket;
    const { result } = renderHook(() => useChat({
      type: 'direct', workspaceId: 'workspace', conversationId: 'conversation', userId: 'manager',
    }));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => socket.handlers.get('dm:updated')?.({ message: {
      _id: 'request-message', conversation: 'conversation', content: 'This message was deleted',
      isDeleted: true, deletedBy: 'requester', metadata: null,
    } }));

    expect(result.current.messages[0].isDeleted).toBe(true);
    expect(result.current.messages[0].content).toBe('This message was deleted');
  });

  it('calls the DM delete endpoint and updates the sender copy', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true, data: {
      _id: 'request-message', conversation: 'conversation', content: 'This message was deleted',
      isDeleted: true, deletedBy: 'requester',
    } } } as any);
    const { result } = renderHook(() => useChat({
      type: 'direct', workspaceId: 'workspace', conversationId: 'conversation', userId: 'manager',
    }));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    await act(async () => result.current.deleteMessage('request-message'));

    expect(api.delete).toHaveBeenCalledWith('/dm/messages/request-message');
    expect(result.current.messages[0].isDeleted).toBe(true);
  });

  it('updates reaction state immediately from the API response for direct messages', async () => {
    const { result } = renderHook(() => useChat({
      type: 'direct', workspaceId: 'workspace', conversationId: 'conversation', userId: 'manager',
    }));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => result.current.updateMessageReactions('request-message', [
      { emoji: '🔥', users: ['requester'], count: 1 },
    ]));

    expect(result.current.messages[0].reactions).toEqual([
      { emoji: '🔥', users: ['requester'], count: 1 },
    ]);
  });

  it('applies a group read receipt to the messages named by the server', async () => {
    const socket = fakeSocket();
    socketContext.socket = socket;
    vi.mocked(api.get).mockResolvedValueOnce({ data: { success: true, data: [{
      _id: 'group-message', channel: 'channel', content: 'Hello', readBy: [],
      sender: { _id: 'requester', name: 'Requester' }, createdAt: new Date().toISOString(),
    }] } } as any);
    const { result } = renderHook(() => useChat({
      type: 'workspace', workspaceId: 'workspace', channelId: 'channel',
    }));
    await waitFor(() => expect(result.current.messages).toHaveLength(1));

    act(() => socket.handlers.get('chat:read')?.({
      channelId: 'channel', messageIds: ['group-message'],
      reader: { _id: 'reader', name: 'Ramon', avatar: 'avatar.png' },
    }));

    expect(result.current.messages[0].readBy).toEqual([
      { _id: 'reader', name: 'Ramon', avatar: 'avatar.png' },
    ]);
  });

  it('unsends group messages through the shared chat endpoint', async () => {
    vi.mocked(api.delete).mockResolvedValueOnce({ data: { success: true, message: 'Message unsent' } } as any);
    const { result } = renderHook(() => useChat({
      type: 'workspace', workspaceId: 'workspace', channelId: 'channel',
    }));
    await act(async () => result.current.deleteMessage('group-message'));

    expect(api.delete).toHaveBeenCalledWith('/chat/group-message');
    expect(result.current.messages.find(message => message._id === 'group-message'))
      .toMatchObject({ isDeleted: true, content: 'This message was deleted' });
  });
});
