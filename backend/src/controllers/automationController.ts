import { Request, Response } from 'express';
import { AutomationLogStatus, AutomationTrigger, Prisma } from '@prisma/client';
import prisma from '../config/database';
import { serializeAutomationRule, testAutomationRule } from '../services/automationService';
import { AutomationAction, AutomationCondition } from '../types/automation';

const isValidTrigger = (value: unknown): value is AutomationTrigger =>
  typeof value === 'string' && (Object.values(AutomationTrigger) as string[]).includes(value);

const isValidStatus = (value: unknown): value is AutomationLogStatus =>
  typeof value === 'string' && (Object.values(AutomationLogStatus) as string[]).includes(value);

const sanitizeActions = (value: unknown): AutomationAction[] =>
  Array.isArray(value) ? (value as AutomationAction[]).filter(Boolean) : [];

const sanitizeConditions = (value: unknown): AutomationCondition[] =>
  Array.isArray(value) ? (value as AutomationCondition[]).filter(Boolean) : [];

const parsePriority = (value: unknown) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.floor(value);
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return 0;
};

const normalizeMetadataInput = (
  value: unknown
): Prisma.InputJsonValue | Prisma.JsonNullValueInput | undefined => {
  if (typeof value === 'undefined') {
    return undefined;
  }
  if (value === null) {
    return Prisma.JsonNull;
  }
  return value as Prisma.InputJsonValue;
};

export const listAutomationRules = async (_req: Request, res: Response) => {
  try {
    const rules = await prisma.automationRule.findMany({
      orderBy: [{ priority: 'desc' }, { updatedAt: 'desc' }]
    });

    return res.json(rules.map(serializeAutomationRule));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao listar automações' });
  }
};

export const getAutomationRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const rule = await prisma.automationRule.findUnique({ where: { id } });

    if (!rule) {
      return res.status(404).json({ error: 'Regra não encontrada' });
    }

    return res.json(serializeAutomationRule(rule));
  } catch (error) {
    return res.status(500).json({ error: 'Erro ao buscar automação' });
  }
};

export const createAutomationRule = async (req: Request, res: Response) => {
  try {
    const { name, description, trigger, conditions, actions, priority, stopOnMatch, metadata, isActive } =
      req.body ?? {};

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Nome da automação é obrigatório' });
    }

    if (!isValidTrigger(trigger)) {
      return res.status(400).json({ error: 'Trigger inválido' });
    }

    const sanitizedActions = sanitizeActions(actions);
    if (sanitizedActions.length === 0) {
      return res.status(400).json({ error: 'Informe ao menos uma ação' });
    }

    const sanitizedConditions = sanitizeConditions(conditions);

    const rule = await prisma.automationRule.create({
      data: {
        name: name.trim(),
        description: typeof description === 'string' && description.trim().length > 0 ? description.trim() : null,
        trigger,
        priority: parsePriority(priority),
        stopOnMatch: Boolean(stopOnMatch),
        isActive: typeof isActive === 'boolean' ? isActive : true,
        conditions: sanitizedConditions,
        actions: sanitizedActions,
        metadata: normalizeMetadataInput(metadata)
      }
    });

    return res.status(201).json(serializeAutomationRule(rule));
  } catch (error) {
    console.error('Erro ao criar automação:', error);
    return res.status(500).json({ error: 'Erro ao criar automação' });
  }
};

export const updateAutomationRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, description, trigger, conditions, actions, priority, stopOnMatch, metadata, isActive } =
      req.body ?? {};

    if (trigger && !isValidTrigger(trigger)) {
      return res.status(400).json({ error: 'Trigger inválido' });
    }

    if (actions && sanitizeActions(actions).length === 0) {
      return res.status(400).json({ error: 'Informe ao menos uma ação' });
    }

    const rule = await prisma.automationRule.update({
      where: { id },
      data: {
        ...(typeof name === 'string' && name.trim().length > 0 ? { name: name.trim() } : {}),
        ...(typeof description === 'string'
          ? { description: description.trim().length > 0 ? description.trim() : null }
          : {}),
        ...(trigger ? { trigger } : {}),
        ...(typeof priority !== 'undefined' ? { priority: parsePriority(priority) } : {}),
        ...(typeof stopOnMatch !== 'undefined' ? { stopOnMatch: Boolean(stopOnMatch) } : {}),
        ...(typeof isActive === 'boolean' ? { isActive } : {}),
        ...(conditions ? { conditions: sanitizeConditions(conditions) } : {}),
        ...(actions ? { actions: sanitizeActions(actions) } : {}),
        ...(typeof metadata !== 'undefined' ? { metadata: normalizeMetadataInput(metadata) } : {})
      }
    });

    return res.json(serializeAutomationRule(rule));
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Regra não encontrada' });
    }
    console.error('Erro ao atualizar automação:', error);
    return res.status(500).json({ error: 'Erro ao atualizar automação' });
  }
};

export const deleteAutomationRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await prisma.automationRule.delete({ where: { id } });
    await prisma.automationLog.updateMany({
      where: { ruleId: id },
      data: { ruleId: null }
    });

    return res.json({ message: 'Automação removida com sucesso' });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Regra não encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao remover automação' });
  }
};

export const toggleAutomationRule = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body ?? {};

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ error: 'Informe o estado desejado' });
    }

    const rule = await prisma.automationRule.update({
      where: { id },
      data: { isActive }
    });

    return res.json(serializeAutomationRule(rule));
  } catch (error: any) {
    if (error?.code === 'P2025') {
      return res.status(404).json({ error: 'Regra não encontrada' });
    }
    return res.status(500).json({ error: 'Erro ao atualizar automação' });
  }
};

export const testAutomationRuleHandler = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ticketId, messageId } = req.body ?? {};

    if (!ticketId || typeof ticketId !== 'string') {
      return res.status(400).json({ error: 'Informe o ticket para teste' });
    }

    const result = await testAutomationRule(id, { ticketId, messageId });
    return res.json(result);
  } catch (error) {
    console.error('Erro ao testar automação:', error);
    return res.status(500).json({ error: 'Erro ao testar automação' });
  }
};

export const listAutomationLogs = async (req: Request, res: Response) => {
  try {
    const { ruleId, status, trigger, limit } = req.query;

    const where: Prisma.AutomationLogWhereInput = {};

    if (ruleId && typeof ruleId === 'string') {
      where.ruleId = ruleId;
    }

    if (status && isValidStatus(status)) {
      where.status = status;
    }

    if (trigger && isValidTrigger(trigger)) {
      where.trigger = trigger;
    }

    const take = limit ? Math.min(Math.max(Number(limit) || 20, 1), 100) : 20;

    const logs = await prisma.automationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take,
      include: {
        rule: { select: { id: true, name: true } }
      }
    });

    return res.json(
      logs.map((log) => ({
        id: log.id,
        trigger: log.trigger,
        status: log.status,
        ruleId: log.ruleId,
        ruleName: log.rule?.name ?? null,
        message: log.message,
        error: log.error,
        context: log.context ?? null,
        createdAt: log.createdAt
      }))
    );
  } catch (error) {
    console.error('Erro ao listar logs de automação:', error);
    return res.status(500).json({ error: 'Erro ao listar logs de automação' });
  }
};
