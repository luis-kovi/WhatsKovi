export const ticketInclude = {
  contact: true,
  user: { select: { id: true, name: true, avatar: true } },
  queue: true,
  tags: { include: { tag: true } }
} as const;
