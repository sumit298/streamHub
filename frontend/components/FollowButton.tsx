"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/AuthContext";

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowButton = ({ userId, onFollowChange }: FollowButtonProps) => {
  const queryClient = useQueryClient();

  const { data } = useQuery<{ isFollowing: boolean }>({
    queryKey: ['is-following', userId],
    queryFn: () => api.get(`/api/users/${userId}/is-following`).then(res => res.data),
  });

  const isFollowing = data?.isFollowing ?? false;

  const { mutate, isPending } = useMutation({
    mutationFn: () => isFollowing
      ? api.delete(`/api/users/${userId}/follow`)
      : api.post(`/api/users/${userId}/follow`),
    onSuccess: () => {
      const next = !isFollowing;
      queryClient.setQueryData(['is-following', userId], { isFollowing: next });
      onFollowChange?.(next);
    },
    onError: (error: any) => {
      alert(error.response?.data?.error || "Failed to update follow status");
    },
  });

  return (
    <button
      onClick={() => mutate()}
      disabled={isPending}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
        isFollowing
          ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
          : "bg-purple-600 hover:bg-purple-700 text-white"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isPending ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
};
