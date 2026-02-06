'use client';
import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { api } from '@/lib/AuthContext';

interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  username: string;
  avatar?: string;
}

interface Viewer {
  id: string;
  username: string;
}

// Generate consistent color for username
const getUsernameColor = (username: string) => {
  const colors = [
    'text-red-400',
    'text-blue-400',
    'text-green-400',
    'text-yellow-400',
    'text-purple-400',
    'text-pink-400',
    'text-indigo-400',
    'text-cyan-400',
    'text-orange-400',
    'text-teal-400',
  ];
  
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
};

// Format timestamp
const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
};

export default function ChatPanel({ 
  socket, 
  streamId, 
  username 
}: { 
  socket: Socket | null;
  streamId: string;
  username: string;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    api.get(`/api/streams/${streamId}/viewers`)
      .then(({ data }) => setViewers(data.viewers))
      .catch(console.error);
  }, [streamId]);

  useEffect(() => {
    if (!socket) return;
    
    socket.emit('join-chat', { streamId });
    
    const handleNewMessage = (msg: Message) => {
      setMessages(prev => [...prev, msg]);
    };
    
    socket.on('new-message', handleNewMessage);
    
    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, streamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;
    
    socket.emit('send-message', { 
      roomId: streamId, 
      content: input 
    }, (response: any) => {
      if (response?.error) console.error(response.error);
    });
    
    setInput('');
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInput(value);

    const lastAtIndex = value.lastIndexOf('@');
    if (lastAtIndex !== -1) {
      const query = value.slice(lastAtIndex + 1);
      if (!query.includes(' ')) {
        setMentionQuery(query);
        setShowSuggestions(true);
        setSelectedIndex(0);
        return;
      }
    }
    setShowSuggestions(false);
  };

  const selectMention = (username: string) => {
    const lastAtIndex = input.lastIndexOf('@');
    const newInput = input.slice(0, lastAtIndex) + '@' + username + ' ';
    setInput(newInput);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) {
      if (e.key === 'Enter') sendMessage();
      return;
    }

    const filtered = viewers.filter(v => 
      v.username.toLowerCase().includes(mentionQuery.toLowerCase())
    );

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => (i + 1) % filtered.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => (i - 1 + filtered.length) % filtered.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filtered[selectedIndex]) {
        selectMention(filtered[selectedIndex].username);
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const filteredViewers = viewers.filter(v => 
    v.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-900/50 backdrop-blur-sm rounded-2xl">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">Live Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {messages.map((msg) => (
          <div key={msg.id} className="flex items-center py-1 gap-1 hover:bg-gray-800/50 rounded">
            <span className="text-xs text-gray-500 flex-shrink-0 w-12 text-right">
              {formatTime(msg.timestamp)}
            </span>
            <img
              src={msg.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(msg.username || 'Anonymous')}`}
              alt={msg.username}
              className="w-6 h-6 rounded-full flex-shrink-0"
            />
            <span className={`text-sm font-bold flex-shrink-0 ${getUsernameColor(msg.username || 'Anonymous')}`}>
              {msg.username || 'Anonymous'}:
            </span>
            <p className="text-sm text-white break-words flex-1">{msg.content}</p>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-gray-700 relative">
        {showSuggestions && filteredViewers.length > 0 && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 rounded-lg border border-gray-700 shadow-xl max-h-48 overflow-y-auto">
            {filteredViewers.map((viewer, idx) => (
              <button
                key={viewer.id}
                onClick={() => selectMention(viewer.username)}
                className={`w-full px-4 py-2 text-left hover:bg-gray-700 transition flex items-center gap-2 ${
                  idx === selectedIndex ? 'bg-gray-700' : ''
                }`}
              >
                <span className="text-sm text-white font-medium">@{viewer.username}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Write your message"
            className="flex-1 bg-gray-650 text-white px-4 py-3 rounded-xl border border-gray-600 focus:outline-none focus:border-purple-350 text-sm"
            maxLength={500}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="bg-purple-350 hover:bg-purple-350/80 text-white px-4 py-3 rounded-xl text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5 rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
