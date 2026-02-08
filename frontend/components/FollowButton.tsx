"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/AuthContext";

interface FollowButtonProps {
  userId: string;
  initialFollowing?: boolean;
  onFollowChange?: (isFollowing: boolean) => void;
}

export const FollowButton = ({
  userId,
  initialFollowing = false,
  onFollowChange,
}: FollowButtonProps) => {
  const [isFollowing, setIsFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkFollowStatus();
  }, [userId]);

  const checkFollowStatus = async () => {
    try {
      const { data } = await api.get(`/api/users/${userId}/is-following`);
      setIsFollowing(data.isFollowing);
    } catch (error) {
      console.error("Failed to check follow status:", error);
    }
  };

  const handleFollow = async () => {
    setLoading(true);
    try {
      if (isFollowing) {
        await api.delete(`/api/users/${userId}/follow`);
        setIsFollowing(false);
        onFollowChange?.(false);
      } else {
        await api.post(`/api/users/${userId}/follow`);
        setIsFollowing(true);
        onFollowChange?.(true);
      }
    } catch (error: any) {
      console.error("Follow action failed:", error);
      alert(error.response?.data?.error || "Failed to update follow status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleFollow}
      disabled={loading}
      className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
        isFollowing
          ? "bg-white/10 hover:bg-white/20 text-white border border-white/20"
          : "bg-purple-600 hover:bg-purple-700 text-white"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {loading ? "..." : isFollowing ? "Following" : "Follow"}
    </button>
  );
};
