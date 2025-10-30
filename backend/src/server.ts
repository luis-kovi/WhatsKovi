import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv';
import routes from './routes';
import satisfactionPublicRoutes from './routes/satisfactionPublicRoutes';
import { setupSocketIO } from './services/socketService';
import { registerNotificationSocketServer } from './services/notificationQueue';
import './services/exportQueue';
import { bootstrapReportSchedules } from './services/reportScheduleService';
import { bootstrapScheduledMessages } from './services/scheduledMessageService';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000'
  })
);
app.use(express.json());
app.use('/uploads', express.static('uploads'));

app.use('/survey', satisfactionPublicRoutes);
app.use('/api', routes);

setupSocketIO(io);
registerNotificationSocketServer(io);

const PORT = process.env.PORT || 3001;

httpServer.listen(PORT, () => {
  console.log(`?? Server running on port ${PORT}`);
  bootstrapReportSchedules().catch((error) => {
    console.error('Failed to bootstrap report schedules:', error);
  });
  bootstrapScheduledMessages().catch((error) => {
    console.error('Failed to bootstrap scheduled messages:', error);
  });
});

export { io };
