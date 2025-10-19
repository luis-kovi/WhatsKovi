import { Router } from 'express';
import { login, me, logout } from '../controllers/authController';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import {
  listTickets,
  createManualTicket,
  getTicket,
  acceptTicket,
  closeTicket,
  transferTicket,
  reopenTicket,
  updateTicketDetails,
  applyTicketTags,
  removeTicketTag,
  exportTicket
} from '../controllers/ticketController';
import {
  sendMessage,
  listMessages,
  updateMessage,
  deleteMessage,
  addReaction,
  removeReaction
} from '../controllers/messageController';
import { listQueues, createQueue, updateQueue, deleteQueue } from '../controllers/queueController';
import {
  listConnections,
  createConnection,
  startConnection,
  stopConnection,
  deleteConnection
} from '../controllers/whatsappController';
import { listTags, createTag, updateTag, deleteTag, getTagStats } from '../controllers/tagController';
import {
  listQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply,
  renderQuickReply,
  registerQuickReplyUsage,
  listQuickReplyStats,
  listQuickReplyCategories,
  createQuickReplyCategory,
  updateQuickReplyCategory,
  deleteQuickReplyCategory,
  listQuickReplyVariables
} from '../controllers/quickReplyController';
import {
  listContacts,
  getContact,
  updateContact,
  listContactFields,
  createContactField,
  updateContactField,
  deleteContactField,
  listContactSegments,
  createContactSegment,
  updateContactSegment,
  deleteContactSegment,
  getSegmentContacts,
  listContactNotes,
  createContactNote,
  deleteContactNote,
  getContactHistory,
  importContacts,
  exportContacts
} from '../controllers/contactController';
import { getDashboardSummary, getDashboardMetrics } from '../controllers/dashboardController';
import { authMiddleware, adminOnly } from '../middleware/auth';
import upload from '../middleware/upload';
import {
  getNotifications,
  getNotificationStats,
  markAllNotificationsRead,
  markNotificationListAsRead,
  getNotificationPreferences,
  updateNotificationPreferences,
  subscribeToPush,
  unsubscribeFromPush,
  triggerTestNotification
} from '../controllers/notificationController';

const router = Router();

// Auth routes
router.post('/auth/login', login);
router.get('/auth/me', authMiddleware, me);
router.post('/auth/logout', authMiddleware, logout);

// User routes
router.get('/users', authMiddleware, listUsers);
router.post('/users', authMiddleware, adminOnly, createUser);
router.put('/users/:id', authMiddleware, adminOnly, updateUser);
router.delete('/users/:id', authMiddleware, adminOnly, deleteUser);

// Ticket routes
router.post('/tickets', authMiddleware, createManualTicket);
router.get('/tickets', authMiddleware, listTickets);
router.get('/tickets/:id', authMiddleware, getTicket);
router.get('/tickets/:id/export', authMiddleware, exportTicket);
router.put('/tickets/:id/accept', authMiddleware, acceptTicket);
router.put('/tickets/:id/close', authMiddleware, closeTicket);
router.put('/tickets/:id/transfer', authMiddleware, transferTicket);
router.put('/tickets/:id/reopen', authMiddleware, reopenTicket);
router.put('/tickets/:id/details', authMiddleware, updateTicketDetails);
router.post('/tickets/:id/tags', authMiddleware, applyTicketTags);
router.delete('/tickets/:id/tags/:tagId', authMiddleware, removeTicketTag);

// Message routes
router.post('/messages', authMiddleware, upload.single('media'), sendMessage);
router.get('/messages/:ticketId', authMiddleware, listMessages);
router.put('/messages/:id', authMiddleware, updateMessage);
router.delete('/messages/:id', authMiddleware, deleteMessage);
router.post('/messages/:id/reactions', authMiddleware, addReaction);
router.delete('/messages/:id/reactions/:reactionId', authMiddleware, removeReaction);

// Queue routes
router.get('/queues', authMiddleware, listQueues);
router.post('/queues', authMiddleware, adminOnly, createQueue);
router.put('/queues/:id', authMiddleware, adminOnly, updateQueue);
router.delete('/queues/:id', authMiddleware, adminOnly, deleteQueue);

// WhatsApp routes
router.get('/whatsapp', authMiddleware, listConnections);
router.post('/whatsapp', authMiddleware, adminOnly, createConnection);
router.post('/whatsapp/:id/start', authMiddleware, adminOnly, startConnection);
router.post('/whatsapp/:id/stop', authMiddleware, adminOnly, stopConnection);
router.delete('/whatsapp/:id', authMiddleware, adminOnly, deleteConnection);

// Tag routes
router.get('/tags', authMiddleware, listTags);
router.get('/tags/stats', authMiddleware, getTagStats);
router.post('/tags', authMiddleware, adminOnly, createTag);
router.put('/tags/:id', authMiddleware, adminOnly, updateTag);
router.delete('/tags/:id', authMiddleware, adminOnly, deleteTag);

// Quick reply categories
router.get('/quick-reply-categories', authMiddleware, listQuickReplyCategories);
router.post('/quick-reply-categories', authMiddleware, adminOnly, createQuickReplyCategory);
router.put('/quick-reply-categories/:id', authMiddleware, adminOnly, updateQuickReplyCategory);
router.delete('/quick-reply-categories/:id', authMiddleware, adminOnly, deleteQuickReplyCategory);

// Quick replies routes
router.get('/quick-replies', authMiddleware, listQuickReplies);
router.get('/quick-replies/variables', authMiddleware, listQuickReplyVariables);
router.get('/quick-replies/stats', authMiddleware, adminOnly, listQuickReplyStats);
router.post('/quick-replies', authMiddleware, adminOnly, createQuickReply);
router.put('/quick-replies/:id', authMiddleware, adminOnly, updateQuickReply);
router.delete('/quick-replies/:id', authMiddleware, adminOnly, deleteQuickReply);
router.post('/quick-replies/:id/render', authMiddleware, renderQuickReply);
router.post('/quick-replies/:id/use', authMiddleware, registerQuickReplyUsage);

// Contact routes
router.get('/contacts', authMiddleware, listContacts);
router.get('/contacts/export', authMiddleware, exportContacts);
router.post('/contacts/import', authMiddleware, adminOnly, upload.single('file'), importContacts);
router.get('/contacts/fields', authMiddleware, listContactFields);
router.post('/contacts/fields', authMiddleware, adminOnly, createContactField);
router.put('/contacts/fields/:id', authMiddleware, adminOnly, updateContactField);
router.delete('/contacts/fields/:id', authMiddleware, adminOnly, deleteContactField);
router.get('/contact-segments', authMiddleware, listContactSegments);
router.post('/contact-segments', authMiddleware, adminOnly, createContactSegment);
router.put('/contact-segments/:id', authMiddleware, adminOnly, updateContactSegment);
router.delete('/contact-segments/:id', authMiddleware, adminOnly, deleteContactSegment);
router.get('/contact-segments/:id/contacts', authMiddleware, getSegmentContacts);
router.get('/contacts/:id', authMiddleware, getContact);
router.put('/contacts/:id', authMiddleware, updateContact);
router.get('/contacts/:id/history', authMiddleware, getContactHistory);
router.get('/contacts/:id/notes', authMiddleware, listContactNotes);
router.post('/contacts/:id/notes', authMiddleware, createContactNote);
router.delete('/contacts/:id/notes/:noteId', authMiddleware, deleteContactNote);

// Dashboard
router.get('/dashboard/summary', authMiddleware, getDashboardSummary);
router.get('/dashboard/metrics', authMiddleware, getDashboardMetrics);

// Notifications
router.get('/notifications', authMiddleware, getNotifications);
router.get('/notifications/unread-count', authMiddleware, getNotificationStats);
router.post('/notifications/mark-read', authMiddleware, markNotificationListAsRead);
router.post('/notifications/mark-all-read', authMiddleware, markAllNotificationsRead);
router.get('/notifications/preferences', authMiddleware, getNotificationPreferences);
router.put('/notifications/preferences', authMiddleware, updateNotificationPreferences);
router.post('/notifications/subscribe', authMiddleware, subscribeToPush);
router.post('/notifications/unsubscribe', authMiddleware, unsubscribeFromPush);
router.post('/notifications/test', authMiddleware, triggerTestNotification);

export default router;
