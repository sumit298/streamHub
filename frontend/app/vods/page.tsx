"use client";
import { useState } from "react";
import { api } from "@/lib/AuthContext";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/ui/Navbar";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";

interface Vod {
  _id: string;
  title: string;
  thumbnail?: string;
  duration?: number;
  views?: number;
  createdAt: string;
  userId: {
    _id: string;
    username: string;
    avatar?: string | null;
  };
  category: string;
}

export default function VodsPage() {
  const [page, setPage] = useState(1);
  const limit = 8;

  const { data, isLoading } = useQuery<Vod[]>({
    queryKey: ["vods", page],
    queryFn: () =>
      api
        .get(`/api/vods?limit=${limit}&skip=${(page - 1) * limit}`)
        .then((res) => res.data.vods || []),
  });

  const vods = data || [];
  const hasMore = vods.length === limit;

  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Recorded Streams
            </h1>
            {!isLoading && vods.length > 0 && (
              <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-elevated transition text-sm sm:text-base"
                >
                  Prev
                </button>
                <span className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-white text-center text-sm sm:text-base">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-elevated transition text-sm sm:text-base"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {isLoading ? (
              Array.from({ length: limit }).map((_, i) => (
                <div
                  key={i}
                  className="bg-surface rounded-lg overflow-hidden animate-pulse"
                >
                  <div className="w-full h-48 bg-elevated" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-elevated rounded w-3/4" />
                    <div className="h-3 bg-elevated rounded w-1/2" />
                    <div className="h-3 bg-elevated rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : vods.length > 0 ? (
              vods.map((vod: any) => (
                <Link key={vod._id} href={`/vods/${vod._id}`}>
                  <div className="bg-surface rounded-xl overflow-hidden ring-1 ring-white/10 hover:ring-white/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer">
                    {/* Thumbnail */}
                    <div className="w-full h-44 bg-elevated flex items-center justify-center">
                      {vod.thumbnail ? (
                        <img
                          src={vod.thumbnail}
                          alt={vod.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg
                          className="w-16 h-16 text-gray-600"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      {/* Title + Duration */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-white text-lg font-semibold tracking-tight truncate flex-1">
                          {vod.title}
                        </h3>

                        <span className="flex items-center gap-1 text-sm text-gray-400 shrink-0">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>

                          {vod.duration
                            ? `${Math.floor(vod.duration / 60)}:${String(
                                vod.duration % 60,
                              ).padStart(2, "0")}`
                            : "N/A"}
                        </span>
                      </div>

                      {/* Author + Stats */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0">
                            <Image
                              src={vod.userId.avatar}
                              alt={vod.userId.username}
                              width={30}
                              height={30}
                              className="w-full h-full object-cover"
                              unoptimized
                            />
                          </div>

                          <p className="text-gray-400 -ml-2 text-sm truncate">
                            {vod.userId.username}
                          </p>
                        </div>

                        <div className="flex items-center gap-1 text-sm text-gray-400 shrink-0">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                            />
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                            />
                          </svg>

                          {vod.views || 0}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center text-gray-400 mt-12">
                <p>No recorded streams available yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
