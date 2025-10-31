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
const io = new Server(httpServer, {
  cors: {
    origin: 'https://whatskovi.vercel.app',
    methods: ['GET', 'POST']
  }
});

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://whatskovi.vercel.app', // Adicione esta linha
    /\.vercel\.app$/ // Aceita todos os subdomínios .vercel.app
  ],
  credentials: true
}));

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
