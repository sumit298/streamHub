'use client';
import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';
import { api } from '@/lib/AuthContext';
import dynamic from 'next/dynamic';
import GifPicker from './GifPicker';

const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false });

interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  username: string;
  avatar?: string;
  type?: string;
}

interface Viewer {
  id?: string;
  userId?: string;
  username: string;
  avatar?: string;
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
  username,
  isStreamer = false,
}: { 
  socket: Socket | null;
  streamId: string;
  username: string;
  isStreamer?: boolean; 
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [viewers, setViewers] = useState<Viewer[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [chatUsers, setChatUsers] = useState<Viewer[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const gifPickerRef = useRef<HTMLDivElement>(null);

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
      // track unique chat participants for mod suggestions
      if (msg.userId !== 'system' && msg.username) {
        setChatUsers(prev =>
          prev.find(u => u.username === msg.username)
            ? prev
            : [...prev, { userId: msg.userId, username: msg.username, avatar: msg.avatar }]
        );
      }
    };
    
    const handleDeleteMessage = ({ messageId }: { messageId: string }) => {
      setMessages(prev => prev.filter(m => m.id !== messageId));
    };

    socket.on('new-message', handleNewMessage);
    socket.on('message-deleted', handleDeleteMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
      socket.off('message-deleted', handleDeleteMessage);
    };
  }, [socket, streamId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Close pickers on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setShowEmojiPicker(false);
      }
      if (gifPickerRef.current && !gifPickerRef.current.contains(e.target as Node)) {
        setShowGifPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const sendMessage = () => {
    if (!input.trim() || !socket) return;

    // parse commands
    if(input.startsWith('/')){
      const [command, ...args] = input.trim().split(" ");
      switch(command.toLowerCase()){
        case '/clear':
          setMessages([]);
          setInput('');
          return;
        case '/timeout':
          if(isStreamer){
            socket.emit('mod-action', {
              streamId,
              action: 'timeout',
              target: args[0]?.replace('@', ''),
              duration: parseInt(args[1]) || 300
            });
          }
          setInput('');
          return;
        case '/ban':
        if (isStreamer) {
          socket.emit('mod-action', {
            streamId,
            action: 'ban',
            target: args[0]?.replace('@', '')
          });
        }
        setInput('');
        return;
      case '/slow':
        if (isStreamer) {
          socket.emit('slow-mode', { streamId, seconds: parseInt(args[0]) || 10 });
        }
        setInput('');
        return;
      case '/slowoff':
        if (isStreamer) {
          socket.emit('slow-mode', { streamId, seconds: 0 });
        }
        setInput('');
        return;
      case '/unban':
        if (isStreamer) {
          socket.emit('unban-user', {
            streamId,
            target: args[0]?.replace('@', ''),
          });
        }
        setInput('');
        return;
      case '/announce':
        if (isStreamer) {
          socket.emit('announce', {
            streamId,
            message: args.join(' '),
          });
        }
        setInput('');
        return;
      }
    }

    socket.emit('send-message', {
      roomId: streamId,
      content: input
    }, (response: { error?: string }) => {
      if (response?.error) {
        setChatError(response.error);
        setTimeout(() => setChatError(null), 4000);
      }
    });

    setInput('');
    setShowSuggestions(false);
  };

  const sendGif = (url: string) => {
    if (!socket) return;
    socket.emit('send-message', {
      roomId: streamId,
      content: url,
      type: 'gif',
    }, (response: { error?: string }) => {
      if (response?.error) {
        setChatError(response.error);
        setTimeout(() => setChatError(null), 4000);
      }
    });
    setShowGifPicker(false);
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

  const isModCommand = /^\/(timeout|ban|unban)\s/.test(input);
  const suggestionSource = isModCommand ? chatUsers.filter(u => u.username !== username) : viewers;
  const filteredViewers = suggestionSource.filter(v =>
    v.username.toLowerCase().includes(mentionQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-full bg-gray-900/50 backdrop-blur-sm rounded-2xl">
      
      
      <div className="flex-1 overflow-y-auto py-2 space-y-1">
        {messages.map((msg) => (
          <div key={msg.id} className={`group flex items-start py-1 gap-1 rounded ${msg.type === 'announce' ? 'bg-yellow-900/20 px-1' : 'hover:bg-gray-800/50'}`}>
            <span className="text-xs text-gray-500 shrink-0 w-12 text-right">
              {formatTime(msg.timestamp)}
            </span>
            {msg.type !== 'system' && msg.type !== 'announce' && (
              <img
                src={msg.avatar || `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(msg.username || 'Anonymous')}`}
                alt={msg.username}
                className="w-6 h-6 rounded-full shrink-0"
              />
            )}
            <span className={`text-sm font-bold shrink-0 ${
              msg.type === 'system' ? 'text-gray-400 italic'
              : msg.type === 'announce' ? 'text-yellow-400'
              : getUsernameColor(msg.username || 'Anonymous')
            }`}>
              {msg.username || 'Anonymous'}:
            </span>
            {msg.type === 'announce' ? (
              <p className="text-sm text-yellow-300 font-semibold flex-1">{msg.content}</p>
            ) : msg.type === 'gif' ? (
              <img
                src={msg.content}
                alt="GIF"
                className="max-w-[180px] max-h-[140px] rounded mt-0.5 object-contain"
              />
            ) : (
              <p className="text-sm text-white wrap-break-word flex-1">{msg.content}</p>
            )}
            {isStreamer && msg.userId !== 'system' && (
              <button
                onClick={() => socket?.emit('delete-message', { streamId, messageId: msg.id })}
                className="opacity-0 group-hover:opacity-100 shrink-0 p-1 text-gray-500 hover:text-red-400 transition"
                title="Delete message"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {chatError && (
        <div className="mx-4 mb-1 px-3 py-2 bg-red-900/60 border border-red-700 rounded-lg text-red-300 text-xs">
          {chatError}
        </div>
      )}
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
        {/* Command suggestions */}
        {isStreamer && input.startsWith('/') && !showSuggestions && (
          <div className="absolute bottom-full left-4 right-4 mb-2 bg-gray-800 rounded-lg border border-gray-700 shadow-xl overflow-hidden">
            {[
              { cmd: '/timeout', usage: '/timeout @user 60', desc: 'Timeout a user (seconds)' },
              { cmd: '/ban', usage: '/ban @user', desc: 'Ban user from chat' },
              { cmd: '/slow', usage: '/slow 10', desc: 'Enable slow mode (seconds)' },
              { cmd: '/slowoff', usage: '/slowoff', desc: 'Disable slow mode' },
              { cmd: '/clear', usage: '/clear', desc: 'Clear chat messages' },
              { cmd: '/unban', usage: '/unban @user', desc: 'Unban user from chat' },
              { cmd: '/announce', usage: '/announce message', desc: 'Send announcement' },
            ]
              .filter(c => c.cmd.startsWith(input.split(' ')[0].toLowerCase()))
              .map(c => (
                <button
                  key={c.cmd}
                  onClick={() => { setInput(c.usage + ' '); inputRef.current?.focus(); }}
                  className="w-full px-4 py-2 text-left hover:bg-gray-700 transition flex items-center justify-between"
                >
                  <span className="text-sm text-purple-400 font-mono">{c.usage}</span>
                  <span className="text-xs text-gray-400">{c.desc}</span>
                </button>
              ))}
          </div>
        )}
        {/* Emoji picker popup */}
        {showEmojiPicker && (
          <div ref={emojiPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
            <EmojiPicker
              onEmojiClick={(emojiData) => {
                setInput(prev => prev + emojiData.emoji);
                inputRef.current?.focus();
              }}
              theme={'dark' as any}
              height={350}
              width={300}
            />
          </div>
        )}

        {/* GIF picker popup */}
        {showGifPicker && (
          <div ref={gifPickerRef} className="absolute bottom-full left-0 mb-2 z-50">
            <GifPicker onSelect={sendGif} onClose={() => setShowGifPicker(false)} />
          </div>
        )}

        <div className="flex gap-2 items-center">
          {/* Input + inline buttons */}
          <div className="flex-1 flex items-center bg-gray-800 border border-gray-600 rounded-xl focus-within:border-purple-500 transition-colors px-3">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder="Write your message"
              className="flex-1 bg-transparent text-white py-2.5 text-sm outline-none placeholder-gray-500 min-w-0"
              maxLength={500}
            />
            {/* Emoji button */}
            <button
              onClick={() => { setShowEmojiPicker(v => !v); setShowGifPicker(false); }}
              className={`shrink-0 text-base leading-none p-1 rounded transition hover:bg-gray-700 ml-1 ${showEmojiPicker ? 'bg-gray-700' : ''}`}
              title="Emoji"
              type="button"
            >
              😊
            </button>
            {/* GIF button */}
            <button
              onClick={() => { setShowGifPicker(v => !v); setShowEmojiPicker(false); }}
              className={`shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded border transition hover:bg-gray-700 ml-1 ${showGifPicker ? 'bg-gray-700 border-purple-500 text-purple-400' : 'border-gray-600 text-gray-400'}`}
              title="GIF"
              type="button"
            >
              GIF
            </button>
          </div>
          {/* Send button */}
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="shrink-0 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition"
            title="Send (Enter)"
          >
            <svg className="w-4 h-4 rotate-90" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
