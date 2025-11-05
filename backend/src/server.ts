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
import { bootstrapMessageCampaigns } from './services/messageCampaignService';

dotenv.config();
const app = express();
const httpServer = createServer(app);

const buildAllowedOrigins = () => {
  const defaults = [
    'http://localhost:3000',
    'https://whatskovi.vercel.app',
    /\.vercel\.app$/ // Accept any *.vercel.app
  ];

  const envOrigins = [
    process.env.CORS_ORIGIN,
    process.env.CORS_ORIGINS,
    process.env.FRONTEND_URL
  ]
    .filter((origin): origin is string => Boolean(origin))
    .flatMap((origin) =>
      origin
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    );

  return [...defaults, ...envOrigins];
};

const allowedOrigins = buildAllowedOrigins();

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
    credentials: true
  }
});

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
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
  bootstrapMessageCampaigns().catch((error) => {
    console.error('Failed to bootstrap message campaigns:', error);
  });
  import('./services/aiOrchestrator')
    .then(({ rebuildDemandForecast }) =>
      rebuildDemandForecast().catch((error) => {
        console.error('[AI] Failed to bootstrap demand forecast', error);
      })
    )
    .catch((error) => {
      console.error('[AI] Failed to initialize AI services', error);
    });
});

export { io };
