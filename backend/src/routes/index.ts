import { Router } from 'express';
import { login, me, logout } from '../controllers/authController';
import { listUsers, createUser, updateUser, deleteUser } from '../controllers/userController';
import { listTickets, getTicket, acceptTicket, closeTicket, transferTicket } from '../controllers/ticketController';
import { sendMessage, listMessages } from '../controllers/messageController';
import { listQueues, createQueue, updateQueue, deleteQueue } from '../controllers/queueController';
import { listConnections, createConnection, startConnection, stopConnection, deleteConnection } from '../controllers/whatsappController';
import { authMiddleware, adminOnly } from '../middleware/auth';

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
router.get('/tickets', authMiddleware, listTickets);
router.get('/tickets/:id', authMiddleware, getTicket);
router.put('/tickets/:id/accept', authMiddleware, acceptTicket);
router.put('/tickets/:id/close', authMiddleware, closeTicket);
router.put('/tickets/:id/transfer', authMiddleware, transferTicket);

// Message routes
router.post('/messages', authMiddleware, sendMessage);
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

export default router;
