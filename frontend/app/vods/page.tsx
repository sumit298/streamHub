"use client";
import { useState } from "react";
import { api } from "@/lib/AuthContext";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/ui/Navbar";
import { useQuery } from "@tanstack/react-query";
import Image from "next/image";
import { Clock } from "lucide-react";

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

  function formatViewers(n: number): string {
    if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    return String(n);
  }
  return (
    <div className="flex flex-col h-screen bg-background">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-text-primary">
              Recorded Streams
            </h1>
            {!isLoading && vods.length > 0 && (
              <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface border border-border text-text-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-border-hover hover:bg-elevated transition text-sm sm:text-base"
                >
                  Prev
                </button>
                <span className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface border border-border text-text-primary text-center text-sm sm:text-base rounded-lg font-semibold">
                  Page {page}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={!hasMore}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-surface border border-border text-text-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:border-border-hover hover:bg-elevated transition text-sm sm:text-base"
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
                  className="bg-surface rounded-xl border border-border overflow-hidden"
                >
                  <div className="w-full h-48 shimmer" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 rounded w-3/4 shimmer" />
                    <div className="h-3 rounded w-1/2 shimmer" />
                    <div className="h-3 rounded w-1/4 shimmer" />
                  </div>
                </div>
              ))
            ) : vods.length > 0 ? (
              vods.map((vod: any) => (
                <Link
                  key={vod._id}
                  href={`/vods/${vod._id}`}
                  className="group block overflow-hidden rounded-xl bg-surface border border-border card-hover"
                >
                  <div className="relative aspect-video overflow-hidden bg-elevated">
                    {vod.thumbnail ? (
                      <img
                        src={vod.thumbnail}
                        alt={vod.title}
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg
                          className="w-16 h-16 text-text-muted"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                        </svg>
                      </div>
                    )}

                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/0 to-transparent" />

                    {/* Category */}
                    <span className="absolute top-3 right-3 rounded-full bg-ring/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-accent-hover backdrop-blur-md border border-ring/20">
                      {vod.category}
                    </span>

                    {/* Duration */}
                    <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white backdrop-blur-md">
                      <Clock className="h-3 w-3" />
                      {vod.duration
                        ? `${Math.floor(vod.duration / 60)}:${String(
                            vod.duration % 60,
                          ).padStart(2, "0")}`
                        : "0:00"}
                    </span>

                  
                  </div>

                  <div className="p-4">
                    <h3 className="line-clamp-2 text-md font-semibold text-text-primary leading-snug min-h-10">
                      {vod.title}
                    </h3>

                    <div className="mt-2 flex items-center gap-2.5">
                      <Image
                        src={vod.userId.avatar}
                        alt={vod.userId.username}
                        width={28}
                        height={28}
                        unoptimized
                        className="h-7 w-7 rounded-full ring-1 ring-border object-cover"
                      />

                      <div className="min-w-0">
                        <div className="truncate text-xs font-medium text-text-secondary">
                          {vod.userId.username}
                        </div>

                        <div className="text-[11px] text-text-muted">
                          {formatViewers(vod.views || 0)} views
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full text-center text-text-tertiary mt-12">
                <p>No recorded streams available yet</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
