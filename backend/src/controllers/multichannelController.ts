import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getEmailChannelDiagnostics,
  getSmsChannelDiagnostics
} from '../services/multiChannelService';

export const getMultichannelCapabilitiesHandler = async (_req: AuthRequest, res: Response) => {
  try {
    const [email, sms] = await Promise.all([
      getEmailChannelDiagnostics(),
      getSmsChannelDiagnostics()
    ]);

    return res.json({
      whatsapp: { enabled: true, configured: true },
      email,
      sms
    });
  } catch (error) {
    console.error('[Multichannel] Failed to load capabilities', error);
    return res.status(500).json({ error: 'Erro ao carregar configuracoes de multicanal' });
  }
};

