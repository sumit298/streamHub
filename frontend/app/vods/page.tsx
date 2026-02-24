"use client";
import { useState, useEffect } from "react";
import { api } from "@/lib/AuthContext";
import Link from "next/link";
import { Sidebar } from "@/components/Sidebar";
import { Navbar } from "@/components/ui/Navbar";


export default function VodsPage() {
  const [vods, setVods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const limit = 8;

  useEffect(() => {
    setLoading(true);
    api.get(`/api/vods?limit=${limit}&skip=${(page - 1) * limit}`)
      .then(res => {
        const data = res.data || [];
        setVods(data);
        setHasMore(data.length === limit);
      })
      .catch(err => {
        console.error(err);
        setVods([]);
      })
      .finally(() => setLoading(false));
  }, [page])
  return (
    <div className="flex flex-col h-screen bg-gray-900">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="hidden lg:block">
          <Sidebar />
        </div>
        <div className="flex-1 overflow-y-auto p-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Recorded Streams</h1>
            {!loading && vods.length > 0 && (
              <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition text-sm sm:text-base"
                >
                  Prev
                </button>
                <span className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-white text-center text-sm sm:text-base">Page {page}</span>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore}
                  className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-800 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-700 transition text-sm sm:text-base"
                >
                  Next
                </button>
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {loading ? (
              Array.from({ length: limit }).map((_, i) => (
                <div key={i} className="bg-gray-800 rounded-lg overflow-hidden animate-pulse">
                  <div className="w-full h-48 bg-gray-700" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-gray-700 rounded w-3/4" />
                    <div className="h-3 bg-gray-700 rounded w-1/2" />
                    <div className="h-3 bg-gray-700 rounded w-1/4" />
                  </div>
                </div>
              ))
            ) : vods.length > 0 ? (
              vods.map((vod: any) => (
          <Link key={vod._id} href={`/vods/${vod._id}`}>
            <div className="bg-gray-800 rounded-lg overflow-hidden hover:ring-2 ring-emerald-500 transition cursor-pointer">
              <div className="w-full h-48 bg-gray-700 flex items-center justify-center">
                {vod.thumbnail ? (
                  <img src={vod.thumbnail} alt={vod.title} className="w-full h-full object-cover" />
                ) : (
                  <svg className="w-16 h-16 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                  </svg>
                )}
              </div>
              <div className="p-4">
                <h3 className="text-white font-semibold truncate">{vod.title}</h3>
                <p className="text-gray-400 text-sm">{vod.duration ? `${Math.floor(vod.duration / 60)}m ${vod.duration % 60}s` : 'N/A'}</p>
                <p className="text-gray-500 text-xs">{vod.views || 0} views</p>
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
