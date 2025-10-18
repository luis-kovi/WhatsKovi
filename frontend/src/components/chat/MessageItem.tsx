import Image from 'next/image';
import { format } from 'date-fns';
import { Check, CheckCheck, CornerUpRight, Paperclip, StickyNote } from 'lucide-react';

import { resolveAssetUrl } from '@/utils/media';
import type { MessageReaction, TicketMessage } from '@/store/ticketStore';

type ReactionGroup = {
  emoji: string;
  count: number;
  reactions: MessageReaction[];
};

const groupReactions = (reactions: MessageReaction[]): ReactionGroup[] => {
  if (!reactions || reactions.length === 0) return [];
  const map = new Map<string, MessageReaction[]>();
  reactions.forEach((reaction) => {
    const list = map.get(reaction.emoji) ?? [];
    list.push(reaction);
    map.set(reaction.emoji, list);
  });

  return Array.from(map.entries()).map(([emoji, list]) => ({
    emoji,
    count: list.length,
    reactions: list
  }));
};

const getMediaType = (message: TicketMessage) => {
  const type = message.type?.toUpperCase();
  if (type === 'IMAGE') return 'image';
  if (type === 'VIDEO') return 'video';
  if (type === 'AUDIO') return 'audio';
  return 'file';
};

const renderMessageMedia = (message: TicketMessage, isDarkTheme: boolean) => {
  const src = resolveAssetUrl(message.mediaUrl ?? null);
  if (!src) return null;

  const mediaType = getMediaType(message);

  if (mediaType === 'image') {
    return (
      <Image
        src={src}
        alt="Midia enviada"
        width={400}
        height={400}
        className="mt-2 max-h-64 w-full rounded-lg object-cover"
        unoptimized
      />
    );
  }

  if (mediaType === 'video') {
    return (
      <video controls className="mt-2 w-full rounded-lg">
        <source src={src} />
        Seu navegador nao suporta video.
      </video>
    );
  }

  if (mediaType === 'audio') {
    return (
      <audio controls className="mt-2 w-full">
        <source src={src} />
        Seu navegador nao suporta audio.
      </audio>
    );
  }

  return (
    <a
      href={src}
      target="_blank"
      rel="noopener noreferrer"
      className={`mt-2 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition ${
        isDarkTheme
          ? 'border-white/40 bg-white/10 text-white hover:bg-white/20'
          : 'border-primary/20 bg-primary/5 text-primary hover:bg-primary/10'
      }`}
    >
      <Paperclip size={14} />
      Baixar arquivo
    </a>
  );
};

type MessageItemProps = {
  message: TicketMessage;
  author: string;
  contactName: string;
  currentUserId?: string;
  isFromAgent: boolean;
  reactionPalette: string[];
  onQuote: (message: TicketMessage) => void;
  onToggleReaction: (message: TicketMessage, emoji: string) => void;
};

export function MessageItem({
  message,
  author,
  contactName,
  currentUserId,
  isFromAgent,
  reactionPalette,
  onQuote,
  onToggleReaction
}: MessageItemProps) {
  const reactionGroups = groupReactions(message.reactions);
  const userReactions = new Set(
    message.reactions.filter((reaction) => reaction.userId === currentUserId).map((reaction) => reaction.emoji)
  );

  const isPrivateNote = Boolean(message.isPrivate);
  const isDarkTheme = isPrivateNote || isFromAgent;
  const bubbleBackgroundClass = isPrivateNote
    ? 'text-white'
    : isFromAgent
    ? 'bg-primary text-white'
    : 'bg-white text-gray-800';
  const bubbleBorderClass = isPrivateNote
    ? ''
    : isFromAgent
    ? ''
    : 'border border-gray-100';

  const quoteClasses = isDarkTheme
    ? 'border-white/30 bg-white/10 text-white'
    : 'border-primary/10 bg-primary/5 text-primary';

  return (
    <div className={`flex ${isFromAgent ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`group relative max-w-[70%] rounded-2xl px-4 py-3 shadow-sm transition ${bubbleBackgroundClass} ${bubbleBorderClass}`}
        style={isPrivateNote ? { backgroundColor: '#f58a32' } : undefined}
      >
        <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide">
          <span className={isDarkTheme ? 'text-white/80' : 'text-gray-500'}>{author}</span>
          <button
            type="button"
            onClick={() => onQuote(message)}
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition ${
              isDarkTheme ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <CornerUpRight size={12} />
            Responder
          </button>
        </div>

        {isPrivateNote && (
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-white/80">
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 text-white">
              <StickyNote size={12} />
              Nota interna
            </span>
            <span className="text-white/70">Nao visivel para o cliente</span>
          </div>
        )}

        {message.quotedMessage && (
          <div className={`mb-2 rounded-lg border px-3 py-2 text-xs ${quoteClasses}`}>
            <p className="font-semibold">{message.quotedMessage.user?.name ?? contactName}</p>
            <p className="mt-1 opacity-80">
              {message.quotedMessage.body ||
                (message.quotedMessage.mediaUrl ? 'Midia anexada' : 'Mensagem sem texto')}
            </p>
          </div>
        )}

        {message.body && <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.body}</p>}

        {renderMessageMedia(message, isDarkTheme)}

        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-75">
          {message.editedAt && <span>Editada</span>}
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isFromAgent && (
            <span>{message.status === 'READ' ? <CheckCheck size={14} /> : <Check size={14} />}</span>
          )}
        </div>

        {reactionGroups.length > 0 && (
          <div className={`mt-2 flex flex-wrap gap-1 ${isFromAgent ? 'justify-end' : 'justify-start'}`}>
            {reactionGroups.map((group) => {
              const userReacted = userReactions.has(group.emoji);
              return (
                <button
                  key={group.emoji}
                  type="button"
                  onClick={() => onToggleReaction(message, group.emoji)}
                  className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] transition ${
                    userReacted
                      ? isDarkTheme
                        ? 'border-white bg-white/20 text-white'
                        : 'border-primary bg-primary/10 text-primary'
                      : isDarkTheme
                      ? 'border-white/40 bg-white/10 text-white/80 hover:bg-white/20'
                      : 'border-gray-200 bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <span>{group.emoji}</span>
                  <span>{group.count}</span>
                </button>
              );
            })}
          </div>
        )}

        {reactionPalette.length > 0 && (
          <div
            className={`mt-2 flex flex-wrap gap-1 ${
              isFromAgent ? 'justify-end' : 'justify-start'
            } opacity-0 transition group-hover:opacity-100`}
          >
            {reactionPalette.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => onToggleReaction(message, emoji)}
                className={`rounded-full px-2 py-0.5 text-[11px] transition ${
                  isDarkTheme ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
