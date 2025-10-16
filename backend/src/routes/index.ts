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
  exportTicket
} from '../controllers/ticketController';
import { sendMessage, listMessages } from '../controllers/messageController';
import { listQueues, createQueue, updateQueue, deleteQueue } from '../controllers/queueController';
import {
  listConnections,
  createConnection,
  startConnection,
  stopConnection,
  deleteConnection
} from '../controllers/whatsappController';
import { listTags, createTag, updateTag, deleteTag } from '../controllers/tagController';
import {
  listQuickReplies,
  createQuickReply,
  updateQuickReply,
  deleteQuickReply
} from '../controllers/quickReplyController';
import { listContacts, getContact, updateContact } from '../controllers/contactController';
import { getDashboardSummary } from '../controllers/dashboardController';
import { authMiddleware, adminOnly } from '../middleware/auth';
import upload from '../middleware/upload';

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

// Message routes
router.post('/messages', authMiddleware, upload.single('media'), sendMessage);
router.get('/messages/:ticketId', authMiddleware, listMessages);

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
router.post('/tags', authMiddleware, adminOnly, createTag);
router.put('/tags/:id', authMiddleware, adminOnly, updateTag);
router.delete('/tags/:id', authMiddleware, adminOnly, deleteTag);

// Quick replies routes
router.get('/quick-replies', authMiddleware, listQuickReplies);
router.post('/quick-replies', authMiddleware, adminOnly, createQuickReply);
router.put('/quick-replies/:id', authMiddleware, adminOnly, updateQuickReply);
router.delete('/quick-replies/:id', authMiddleware, adminOnly, deleteQuickReply);

// Contact routes
router.get('/contacts', authMiddleware, listContacts);
router.get('/contacts/:id', authMiddleware, getContact);
router.put('/contacts/:id', authMiddleware, updateContact);

// Dashboard
router.get('/dashboard/summary', authMiddleware, getDashboardSummary);

export default router;
