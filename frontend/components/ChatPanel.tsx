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
    <div className="flex flex-col h-full bg-card">
      <div className="p-4 border-b border-gray-700">
        <h3 className="font-semibold">Live Chat</h3>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((msg) => (
          <div key={msg.id} className="text-sm">
            <span className="font-semibold text-primary">{msg.username || 'Anonymous'}: </span>
            <span className="text-gray-300">{msg.content}</span>
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
            placeholder="Send a message..."
            className="flex-1 bg-background px-3 py-2 rounded text-sm"
            maxLength={500}
          />
          <button
            onClick={sendMessage}
            className="bg-primary px-4 py-2 rounded text-sm font-semibold hover:bg-primary/80"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
