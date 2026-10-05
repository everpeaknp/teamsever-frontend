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
  api: { get: vi.fn().mockResolvedValue({ data: { success: true, data: [] } }), patch: vi.fn() },
}));
vi.mock('@/store/useChatStore', () => ({
  useChatStore: () => ({ addMessage: vi.fn() }),
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
});
