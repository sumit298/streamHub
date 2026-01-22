'use client';
import { useState, useEffect, useRef } from 'react';
import { Socket } from 'socket.io-client';

interface Message {
  id: string;
  userId: string;
  content: string;
  timestamp: string;
  username: string
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
  };

  return (
    <div className="flex flex-col h-full bg-gray-900/50 backdrop-blur-sm rounded-2xl">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold text-white">Live Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((msg) => (
          <div key={msg.id} className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-semibold ${getUsernameColor(msg.username || 'Anonymous')}`}>
                {msg.username || 'Anonymous'}
              </span>
              <span className="text-xs text-gray-500">{formatTime(msg.timestamp)}</span>
            </div>
            <div className="bg-gray-700 rounded-lg px-3 py-2">
              <span className="text-sm text-white">{msg.content}</span>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <div className="p-4 border-t border-gray-700">
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
