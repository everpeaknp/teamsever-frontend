interface ChatRoomMessage {
  channel?: string | { _id?: string };
  channelName?: string;
}

/** General uses a route alias in the client but a database ID on socket messages. */
export function isMessageForChatRoom(channelId: string | undefined, message: ChatRoomMessage): boolean {
  if (!channelId) return false;

  const messageChannelId = typeof message.channel === 'string'
    ? message.channel
    : message.channel?._id;

  return messageChannelId === channelId || (
    channelId.toLowerCase() === 'general' && message.channelName?.toLowerCase() === 'general'
  );
}
