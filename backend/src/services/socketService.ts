import { Server, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';

interface UserSocket {
  userId: string;
  socketId: string;
}

const connectedUsers: Map<string, UserSocket> = new Map();

export const setupSocketIO = (io: Server) => {
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      socket.data.user = decoded;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.user.id;

    connectedUsers.set(userId, {
      userId,
      socketId: socket.id
    });

    io.emit('user:online', { userId });

    socket.on('disconnect', () => {
      connectedUsers.delete(userId);
      io.emit('user:offline', { userId });
    });

    socket.on('ticket:typing', (data) => {
      socket.broadcast.emit('ticket:typing', data);
    });
  });
};

export const getConnectedUsers = () => {
  return Array.from(connectedUsers.values());
};
