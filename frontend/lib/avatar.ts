export const getAvatarUrl = (username: string, storedAvatar?: string | null) => {
  return storedAvatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username)}`;
};
