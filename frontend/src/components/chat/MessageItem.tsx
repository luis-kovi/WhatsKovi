import Image from 'next/image';
import { format } from 'date-fns';
import {
  Check,
  CheckCheck,
  Mail,
  MoreVertical,
  Paperclip,
  Pencil,
  Reply,
  Smartphone,
  StickyNote,
  Trash2,
  ThumbsUp
} from 'lucide-react';

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
  onToggleMenu?: (messageId: string) => void;
  onEdit?: (message: TicketMessage) => void;
  onDelete?: (message: TicketMessage) => void;
  onJumpToMessage?: (messageId: string) => void;
  canEdit?: boolean;
  canDelete?: boolean;
  isMenuOpen?: boolean;
  isHighlighted?: boolean;
};

export function MessageItem({
  message,
  author,
  contactName,
  currentUserId,
  isFromAgent,
  reactionPalette,
  onQuote,
  onToggleReaction,
  onToggleMenu,
  onEdit,
  onDelete,
  onJumpToMessage,
  canEdit = false,
  canDelete = false,
  isMenuOpen = false,
  isHighlighted = false
}: MessageItemProps) {
  const reactionGroups = groupReactions(message.reactions);
  const userReactions = new Set(
    message.reactions.filter((reaction) => reaction.userId === currentUserId).map((reaction) => reaction.emoji)
  );
  const primaryReactionEmoji = reactionPalette[0] ?? '👍';
  const primaryReactionGroup = reactionGroups.find((group) => group.emoji === primaryReactionEmoji);
  const primaryReactionFromOthers = primaryReactionGroup
    ? primaryReactionGroup.reactions.filter((reaction) => reaction.userId !== currentUserId).length
    : 0;
  const agentHasReacted = userReactions.has(primaryReactionEmoji);
  const shouldShowOutboundReaction = isFromAgent && primaryReactionFromOthers > 0;
  const isPrivateNote = Boolean(message.isPrivate);
  const shouldShowInboundReactionButton = !isFromAgent && !isPrivateNote;

  const handlePrimaryReaction = () => {
    onToggleReaction(message, primaryReactionEmoji);
  };
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

  const showMenuButton = isFromAgent && (canEdit || canDelete) && Boolean(onToggleMenu);
  const bubbleHighlightClass = isHighlighted
    ? isDarkTheme
      ? 'ring-2 ring-white/70 shadow-lg'
      : 'ring-2 ring-primary/60 shadow-lg'
    : '';

  const channelBadge =
    !isPrivateNote && message.channel && message.channel !== 'WHATSAPP'
      ? (() => {
          if (message.channel === 'EMAIL') {
            return {
              label: 'E-mail',
              className: isDarkTheme ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700',
              icon: <Mail size={12} />
            };
          }
          if (message.channel === 'SMS') {
            return {
              label: 'SMS',
              className: isDarkTheme ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700',
              icon: <Smartphone size={12} />
            };
          }
          return null;
        })()
      : null;

  return (
    <div className={`flex ${isFromAgent ? 'justify-end' : 'justify-start'}`} data-message-id={message.id}>
      <div className="relative flex flex-col max-w-[70%]">
        <div
          className={`group relative rounded-2xl px-4 py-3 shadow-sm transition ${bubbleBackgroundClass} ${bubbleBorderClass} ${bubbleHighlightClass}`}
          style={isPrivateNote ? { backgroundColor: '#f58a32' } : undefined}
        >
        <div className="mb-1 flex items-start justify-between gap-2">
          <span className={`text-[11px] font-semibold uppercase tracking-wide whitespace-nowrap ${isDarkTheme ? 'text-white/80' : 'text-gray-500'}`}>{author}</span>
          {showMenuButton && (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onToggleMenu?.(message.id);
              }}
              className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] transition ${
                isDarkTheme ? 'text-white/80 hover:bg-white/20' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              <MoreVertical size={14} />
            </button>
          )}
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

        {channelBadge && (
          <span
            className={`mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${channelBadge.className}`}
          >
            {channelBadge.icon}
            {channelBadge.label}
          </span>
        )}

        {message.quotedMessage && (
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              if (onJumpToMessage) {
                onJumpToMessage(message.quotedMessage!.id);
              }
            }}
            className={`mb-2 w-full rounded-lg border px-3 py-2 text-left text-xs transition ${quoteClasses} hover:opacity-80`}
          >
            <p className="font-semibold">{message.quotedMessage.user?.name ?? contactName}</p>
            <p className="mt-1 opacity-80">
              {message.quotedMessage.body ||
                (message.quotedMessage.mediaUrl ? 'Midia anexada' : 'Mensagem sem texto')}
            </p>
          </button>
        )}

        {message.body && <p className="break-words text-sm leading-relaxed">{message.body}</p>}

        {renderMessageMedia(message, isDarkTheme)}

        <div className="mt-2 flex items-center justify-end gap-2 text-[10px] opacity-75">
          {shouldShowOutboundReaction && (
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                isDarkTheme ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
              }`}
            >
              <ThumbsUp size={12} />
              {primaryReactionFromOthers}
            </span>
          )}
          {message.editedAt && <span>Editada</span>}
          <span>{format(new Date(message.createdAt), 'HH:mm')}</span>
          {isFromAgent && (
            <span>{message.status === 'READ' ? <CheckCheck size={14} /> : <Check size={14} />}</span>
          )}
        </div>

        {showMenuButton && isMenuOpen && (
          <div
            className="absolute right-0 top-10 z-30 w-40 rounded-xl border border-gray-200 bg-white p-1 text-xs shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            {canEdit && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEdit?.(message);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-gray-600 transition hover:bg-gray-100"
              >
                <Pencil size={14} />
                Editar mensagem
              </button>
            )}
            {canDelete && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onDelete?.(message);
                }}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-red-600 transition hover:bg-red-50"
              >
                <Trash2 size={14} />
                Excluir mensagem
              </button>
            )}
          </div>
        )}
        </div>
        <div className="mt-1 flex items-center gap-1">
          {!isFromAgent && !isPrivateNote && (
            <button
              type="button"
              aria-label="Responder mensagem"
              onClick={() => onQuote(message)}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-400 transition hover:bg-gray-50 hover:text-primary"
            >
              <Reply size={12} />
            </button>
          )}
          {shouldShowInboundReactionButton && (
            <button
              type="button"
              aria-label="Curtir mensagem"
              onClick={handlePrimaryReaction}
              className={`flex h-6 w-6 items-center justify-center rounded-full border transition ${
                agentHasReacted ? 'border-primary bg-primary text-white' : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-primary'
              }`}
            >
              <ThumbsUp size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
