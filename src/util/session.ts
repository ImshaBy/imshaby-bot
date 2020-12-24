import { Context } from 'telegraf';
import logger from './logger';

type SessionDataField = 'parishes'  | 'settingsScene' | 'language' | 'user' | 'parish';

/**
 * Saving data to the session
 * @param ctx - telegram context
 * @param field - field to store in
 * @param data - data to store
 */
export function saveToSession(ctx: Context, field: SessionDataField, data: any) {
  logger.debug(ctx, 'Saving %s to session', field);
  ctx.session[field] = data;
}

/**
 * Removing data from the session
 * @param ctx - telegram context
 * @param field - field to delete
 */
export function deleteFromSession(ctx: Context, field: SessionDataField) {
  logger.debug(ctx, 'Deleting %s from session', field);
  delete ctx.session[field];
}
