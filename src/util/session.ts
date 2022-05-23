
import logger from './logger';
import { SessionContext } from 'telegraf-context';


type SessionDataField = 'parishes'  | 'settingsScene' | 'language' | 'user' | 'parish' | 'test';

/**
 * Saving data to the session
 * @param ctx - telegram context
 * @param field - field to store in
 * @param data - data to store
 */
export function saveToSession(ctx: SessionContext, field: SessionDataField, data: any) {
  logger.debug(ctx, 'Saving %s to session', field);
  ctx.session[field] = data;
  logger.debug(ctx, `Contenxt :  ${ctx.session}`);

  // ctx.session
  // redisSession.saveSession(getSessionKey(ctx), ctx.session);
}

/**
 * Removing data from the session
 * @param ctx - telegram context
 * @param field - field to delete
 */
export function deleteFromSession(ctx: SessionContext, field: SessionDataField) {
  logger.debug(ctx, 'Deleting %s from session', field);
  delete ctx.session[field];
  // redisSession.saveSession(getSessionKey(ctx), ctx.session);
}
