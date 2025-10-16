'use client';

import { useTicketStore } from '@/store/ticketStore';
import { Search, Filter, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TicketList() {
  const { tickets, selectedTicket, selectTicket, loading } = useTicketStore();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-500';
      case 'OPEN':
        return 'bg-green-500';
      case 'CLOSED':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Pendente';
      case 'OPEN':
        return 'Aberto';
      case 'CLOSED':
        return 'Fechado';
      default:
        return status;
    }
  };

  return (
    <div className="w-96 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-800 mb-4">Atendimentos</h2>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar conversa..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
          />
        </div>

        <div className="flex gap-2">
          <button className="flex-1 px-3 py-2 bg-primary text-white rounded-lg text-sm font-medium">
            Todos
          </button>
          <button className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">
            Pendentes
          </button>
          <button className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">
            <Filter size={18} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary"></div>
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <MessageSquare size={48} className="mb-2 opacity-50" />
            <p>Nenhum atendimento</p>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div
              key={ticket.id}
              onClick={() => selectTicket(ticket.id)}
              className={`p-4 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition ${
                selectedTicket?.id === ticket.id ? 'bg-primary/5 border-l-4 border-l-primary' : ''
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-gray-600 font-semibold flex-shrink-0">
                  {ticket.contact.name.charAt(0).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-semibold text-gray-800 truncate">{ticket.contact.name}</h3>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(ticket.lastMessageAt), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${getStatusColor(ticket.status)}`}></span>
                    <span className="text-xs text-gray-600">{getStatusText(ticket.status)}</span>
                    {ticket.queue && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                        {ticket.queue.name}
                      </span>
                    )}
                  </div>

                  {ticket.unreadMessages > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-500 truncate">Nova mensagem</span>
                      <span className="bg-primary text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                        {ticket.unreadMessages}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
