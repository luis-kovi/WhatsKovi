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
  removeTicketTag
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
import {
  getIntegrationSettingsHandler,
  updateIntegrationSettingsHandler,
  listIntegrationLogsHandler,
  getPublicAnalyticsConfigHandler
} from '../controllers/integrationController';
import { getMultichannelCapabilitiesHandler } from '../controllers/multichannelController';
import {
  performAdvancedSearch,
  listAdvancedSearchHistory,
  clearAdvancedSearchHistory
} from '../controllers/searchController';
import {
  requestConversationExport,
  listTicketExports,
  getExportJobDetails,
  downloadExportJob
} from '../controllers/conversationExportController';
import {
  listChatbotFlows,
  getChatbotFlow,
  createChatbotFlow,
  updateChatbotFlow,
  deleteChatbotFlow,
  getChatbotFlowStats,
  testChatbotFlow
} from '../controllers/chatbotController';
import {
  listScheduledMessagesHandler,
  createScheduledMessageHandler,
  updateScheduledMessageHandler,
  cancelScheduledMessageHandler
} from '../controllers/scheduledMessageController';
import {
  listAutomationRules,
  getAutomationRule,
  createAutomationRule,
  updateAutomationRule,
  deleteAutomationRule,
  toggleAutomationRule,
  testAutomationRuleHandler,
  listAutomationLogs
} from '../controllers/automationController';
import {
  getAdvancedReport,
  exportAdvancedReport,
  listReportSchedulesHandler,
  createReportScheduleHandler,
  updateReportScheduleHandler,
  deleteReportScheduleHandler,
  runReportScheduleHandler,
  listReportSnapshotsHandler,
  downloadReportSnapshotHandler
} from '../controllers/reportController';
import {
  getTicketInsightsHandler,
  getDemandForecastHandler,
  previewChatbotReplyHandler,
  regenerateSuggestionsHandler
} from '../controllers/aiController';
import {
  listCampaignController,
  getCampaignController,
  createCampaignController,
  updateCampaignController,
  pauseCampaignController,
  resumeCampaignController,
  cancelCampaignController,
  campaignStatsController,
  campaignRecipientsController
} from '../controllers/messageCampaignController';
import {
  getSatisfactionOverview,
  listSatisfactionResponsesHandler,
  getTicketSurveyStatus,
  sendTicketSurvey
} from '../controllers/satisfactionSurveyController';
import {
  getAdvancedSettingsHandler,
  updateGeneralSettingsHandler,
  updateServiceSettingsHandler,
  updateNotificationSettingsHandler,
  uploadBrandingLogoHandler,
  removeBrandingLogoHandler
} from '../controllers/settingsController';

const router = Router();

router.get('/public/integrations/analytics', getPublicAnalyticsConfigHandler);

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
router.put('/tickets/:id/accept', authMiddleware, acceptTicket);
router.put('/tickets/:id/close', authMiddleware, closeTicket);
router.put('/tickets/:id/transfer', authMiddleware, transferTicket);
router.put('/tickets/:id/reopen', authMiddleware, reopenTicket);
router.put('/tickets/:id/details', authMiddleware, updateTicketDetails);
router.post('/tickets/:id/tags', authMiddleware, applyTicketTags);
router.delete('/tickets/:id/tags/:tagId', authMiddleware, removeTicketTag);
router.get('/tickets/:id/satisfaction', authMiddleware, getTicketSurveyStatus);
router.post('/tickets/:id/satisfaction/send', authMiddleware, sendTicketSurvey);

// Message routes
router.post('/messages', authMiddleware, upload.single('media'), sendMessage);
router.get('/messages/:ticketId', authMiddleware, listMessages);
router.put('/messages/:id', authMiddleware, updateMessage);
router.delete('/messages/:id', authMiddleware, deleteMessage);
router.post('/messages/:id/reactions', authMiddleware, addReaction);
router.delete('/messages/:id/reactions/:reactionId', authMiddleware, removeReaction);

// Scheduled messages routes
router.get('/tickets/:ticketId/scheduled-messages', authMiddleware, listScheduledMessagesHandler);
router.post('/tickets/:ticketId/scheduled-messages', authMiddleware, createScheduledMessageHandler);
router.put('/scheduled-messages/:id', authMiddleware, updateScheduledMessageHandler);
router.delete('/scheduled-messages/:id', authMiddleware, cancelScheduledMessageHandler);

// Message campaign routes
router.get('/message-campaigns', authMiddleware, adminOnly, listCampaignController);
router.get('/message-campaigns/:id', authMiddleware, adminOnly, getCampaignController);
router.post('/message-campaigns', authMiddleware, adminOnly, createCampaignController);
router.put('/message-campaigns/:id', authMiddleware, adminOnly, updateCampaignController);
router.post('/message-campaigns/:id/pause', authMiddleware, adminOnly, pauseCampaignController);
router.post('/message-campaigns/:id/resume', authMiddleware, adminOnly, resumeCampaignController);
router.post('/message-campaigns/:id/cancel', authMiddleware, adminOnly, cancelCampaignController);
router.get('/message-campaigns/:id/stats', authMiddleware, adminOnly, campaignStatsController);
router.get('/message-campaigns/:id/recipients', authMiddleware, adminOnly, campaignRecipientsController);

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

// Multichannel
router.get('/multichannel/capabilities', authMiddleware, getMultichannelCapabilitiesHandler);

// Integration settings
router.get('/settings/integrations', authMiddleware, adminOnly, getIntegrationSettingsHandler);
router.put('/settings/integrations', authMiddleware, adminOnly, updateIntegrationSettingsHandler);
router.get('/settings/integrations/logs', authMiddleware, adminOnly, listIntegrationLogsHandler);

// Advanced settings
router.get('/settings/advanced', authMiddleware, adminOnly, getAdvancedSettingsHandler);
router.put('/settings/advanced/general', authMiddleware, adminOnly, updateGeneralSettingsHandler);
router.put('/settings/advanced/service', authMiddleware, adminOnly, updateServiceSettingsHandler);
router.put('/settings/advanced/notifications', authMiddleware, adminOnly, updateNotificationSettingsHandler);
router.post('/settings/advanced/logo', authMiddleware, adminOnly, upload.single('logo'), uploadBrandingLogoHandler);
router.delete('/settings/advanced/logo', authMiddleware, adminOnly, removeBrandingLogoHandler);

// Conversation export
router.post('/tickets/:id/export', authMiddleware, requestConversationExport);
router.get('/tickets/:id/export/jobs', authMiddleware, listTicketExports);
router.get('/exports/:id', authMiddleware, getExportJobDetails);
router.get('/exports/:id/download', authMiddleware, downloadExportJob);

// Advanced search
router.get('/search', authMiddleware, performAdvancedSearch);
router.get('/search/history', authMiddleware, listAdvancedSearchHistory);
router.delete('/search/history', authMiddleware, clearAdvancedSearchHistory);

// Chatbot flows
router.get('/chatbot/flows', authMiddleware, listChatbotFlows);
router.get('/chatbot/flows/:id', authMiddleware, getChatbotFlow);
router.post('/chatbot/flows', authMiddleware, adminOnly, createChatbotFlow);
router.put('/chatbot/flows/:id', authMiddleware, adminOnly, updateChatbotFlow);
router.delete('/chatbot/flows/:id', authMiddleware, adminOnly, deleteChatbotFlow);
router.get('/chatbot/flows/:id/stats', authMiddleware, adminOnly, getChatbotFlowStats);
router.post('/chatbot/flows/:id/test', authMiddleware, adminOnly, testChatbotFlow);

// Automations
router.get('/automations', authMiddleware, adminOnly, listAutomationRules);
router.get('/automations/:id', authMiddleware, adminOnly, getAutomationRule);
router.post('/automations', authMiddleware, adminOnly, createAutomationRule);
router.put('/automations/:id', authMiddleware, adminOnly, updateAutomationRule);
router.delete('/automations/:id', authMiddleware, adminOnly, deleteAutomationRule);
router.post('/automations/:id/toggle', authMiddleware, adminOnly, toggleAutomationRule);
router.post('/automations/:id/test', authMiddleware, adminOnly, testAutomationRuleHandler);
router.get('/automation-logs', authMiddleware, adminOnly, listAutomationLogs);

// Reports
router.get('/reports', authMiddleware, getAdvancedReport);
router.get('/reports/export', authMiddleware, exportAdvancedReport);
router.get('/reports/schedules', authMiddleware, listReportSchedulesHandler);
router.post('/reports/schedules', authMiddleware, createReportScheduleHandler);
router.put('/reports/schedules/:id', authMiddleware, updateReportScheduleHandler);
router.delete('/reports/schedules/:id', authMiddleware, deleteReportScheduleHandler);
router.post('/reports/schedules/:id/run', authMiddleware, runReportScheduleHandler);
router.get('/reports/snapshots', authMiddleware, listReportSnapshotsHandler);
router.get('/reports/snapshots/:id/download', authMiddleware, downloadReportSnapshotHandler);

// Satisfaction
router.get('/satisfaction/overview', authMiddleware, getSatisfactionOverview);
router.get('/satisfaction/responses', authMiddleware, listSatisfactionResponsesHandler);

// AI
router.get('/ai/tickets/:ticketId/insights', authMiddleware, getTicketInsightsHandler);
router.post('/ai/messages/:messageId/regenerate', authMiddleware, regenerateSuggestionsHandler);
router.post('/ai/chatbot/preview', authMiddleware, previewChatbotReplyHandler);
router.get('/ai/forecast', authMiddleware, adminOnly, getDemandForecastHandler);

export default router;
