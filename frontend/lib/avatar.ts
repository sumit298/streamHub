export const getAvatarUrl = (storedAvatar?: string | null, username?: string) => {
  if (storedAvatar && storedAvatar.startsWith('http')) {
    return storedAvatar;
  }
  return `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(username || 'user')}`;
};
