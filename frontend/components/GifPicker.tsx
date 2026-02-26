'use client';
import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

interface GiphyGif {
  id: string;
  title: string;
  images: {
    original: { url: string };
    fixed_height_small: { url: string };
  };
}

interface GifPickerProps {
  onSelect: (url: string) => void;
  onClose: () => void;
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<GiphyGif[]>([]);
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GIPHY_API_KEY;

  const fetchGifs = async (searchQuery: string) => {
    if (!apiKey) return;
    setLoading(true);
    try {
      const endpoint = searchQuery.trim()
        ? `https://api.giphy.com/v1/gifs/search?api_key=${apiKey}&q=${encodeURIComponent(searchQuery)}&limit=12&rating=g`
        : `https://api.giphy.com/v1/gifs/trending?api_key=${apiKey}&limit=12&rating=g`;
      const res = await fetch(endpoint);
      const data = await res.json();
      setGifs(data.data || []);
    } catch (err) {
      console.error('Giphy fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGifs('');
  }, []);

  const handleQueryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchGifs(val), 300);
  };

  return (
    <div className="bg-gray-800 rounded-xl border border-gray-700 shadow-2xl w-72 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 p-2 border-b border-gray-700">
        <div className="flex-1 flex items-center gap-2 bg-gray-700 rounded-lg px-2 py-1">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={handleQueryChange}
            placeholder="Search GIFs..."
            className="bg-transparent text-white text-xs flex-1 outline-none placeholder-gray-500"
          />
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1 rounded transition">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* GIF Grid */}
      <div className="h-56 overflow-y-auto p-1.5">
        {!apiKey ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs text-center px-4">
            Add NEXT_PUBLIC_GIPHY_API_KEY to .env to enable GIFs
          </div>
        ) : loading ? (
          <div className="grid grid-cols-3 gap-1">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="bg-gray-700 rounded animate-pulse aspect-square" />
            ))}
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-400 text-xs">
            No GIFs found
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {gifs.map((gif) => (
              <button
                key={gif.id}
                onClick={() => onSelect(gif.images.original.url)}
                className="rounded overflow-hidden hover:opacity-80 transition aspect-square bg-gray-700"
                title={gif.title}
              >
                <img
                  src={gif.images.fixed_height_small.url}
                  alt={gif.title}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="px-2 py-1 border-t border-gray-700 text-right">
        <span className="text-gray-500 text-[10px]">Powered by GIPHY</span>
      </div>
    </div>
  );
}
