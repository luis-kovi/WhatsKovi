'use client';

import { useState, useEffect, useRef } from 'react';
import { useTicketStore } from '@/store/ticketStore';
import { Send, Paperclip, Smile, MoreVertical, X, Check, CheckCheck, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import api from '@/services/api';
import { getSocket } from '@/services/socket';
import toast from 'react-hot-toast';

export default function ChatArea() {
  const { selectedTicket, acceptTicket, closeTicket } = useTicketStore();
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedTicket) {
      loadMessages();
    }
  }, [selectedTicket]);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    socket.on('message:new', (data: any) => {
      if (data.ticketId === selectedTicket?.id) {
        setMessages((prev) => [...prev, data]);
        scrollToBottom();
      }
    });

    return () => {
      socket.off('message:new');
    };
  }, [selectedTicket]);

  const loadMessages = async () => {
    if (!selectedTicket) return;

    try {
      const response = await api.get(`/messages/${selectedTicket.id}`);
      setMessages(response.data);
      scrollToBottom();
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    setLoading(true);
    try {
      await api.post('/messages', {
        ticketId: selectedTicket.id,
        body: newMessage,
        type: 'TEXT',
      });

      setNewMessage('');
    } catch (error) {
      toast.error('Erro ao enviar mensagem');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptTicket = async () => {
    if (!selectedTicket) return;
    try {
      await acceptTicket(selectedTicket.id);
      toast.success('Atendimento aceito!');
    } catch (error) {
      toast.error('Erro ao aceitar atendimento');
    }
  };

  const handleCloseTicket = async () => {
    if (!selectedTicket) return;
    try {
      await closeTicket(selectedTicket.id);
      toast.success('Atendimento finalizado!');
    } catch (error) {
      toast.error('Erro ao finalizar atendimento');
    }
  };

  if (!selectedTicket) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50">
        <div className="text-center text-gray-500">
          <MessageSquare size={64} className="mx-auto mb-4 opacity-50" />
          <p className="text-lg">Selecione um atendimento para começar</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold">
            {selectedTicket.contact.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="font-semibold text-gray-800">{selectedTicket.contact.name}</h3>
            <p className="text-sm text-gray-500">{selectedTicket.contact.phoneNumber}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {selectedTicket.status === 'PENDING' && (
            <button
              onClick={handleAcceptTicket}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition text-sm font-medium"
            >
              Aceitar Atendimento
            </button>
          )}

          {selectedTicket.status === 'OPEN' && (
            <button
              onClick={handleCloseTicket}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-medium"
            >
              Finalizar
            </button>
          )}

          <button className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.userId ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                message.userId
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-800 border border-gray-200'
              }`}
            >
              {message.isPrivate && (
                <div className="text-xs opacity-75 mb-1">📝 Nota interna</div>
              )}
              <p className="whitespace-pre-wrap break-words">{message.body}</p>
              <div className="flex items-center justify-end gap-1 mt-1">
                <span className="text-xs opacity-75">
                  {format(new Date(message.createdAt), 'HH:mm')}
                </span>
                {message.userId && (
                  <span className="opacity-75">
                    {message.status === 'READ' ? (
                      <CheckCheck size={14} />
                    ) : (
                      <Check size={14} />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      {selectedTicket.status !== 'CLOSED' && (
        <div className="bg-white border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex items-center gap-2">
            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600"
            >
              <Smile size={24} />
            </button>

            <button
              type="button"
              className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-600"
            >
              <Paperclip size={24} />
            </button>

            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
              disabled={loading}
            />

            <button
              type="submit"
              disabled={loading || !newMessage.trim()}
              className="w-12 h-12 bg-primary text-white rounded-lg hover:bg-primary/90 transition flex items-center justify-center disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
