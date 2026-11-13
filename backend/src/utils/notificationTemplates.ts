// The title and message of every notification type, in one place.

const MAX_MENTION_PREVIEW_LENGTH = 140;

export const notificationTemplates = {
  "stream-live": (streamerUsername: string, streamTitle: string) => ({
    title: `${streamerUsername} is live`,
    message: streamTitle,
  }),

  "chat-mention": (senderUsername: string, chatMessageContent: string) => ({
    title: `${senderUsername} mentioned you`,
    message: chatMessageContent.slice(0, MAX_MENTION_PREVIEW_LENGTH),
  }),

  "new-follower": (followerUsername: string) => ({
    title: "New follower",
    message: `${followerUsername} started following you`,
  }),
};
