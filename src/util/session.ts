
import logger from './logger';


type SessionDataField = 'parishes'  | 'settingsScene' | 'language' | 'user' | 'parish' | 'cleanUpMessages' | '__scenes';

/**
 * Saving data to the session
 *
 * @param ctx - telegram context
 * @param field - field to store in
 * @param data - data to store
 */
export function saveToSession(ctx: any, field: SessionDataField, data: any) {
    logger.debug(ctx, 'Saving %s to session', field);
    ctx.session[field] = data;
    logger.debug(ctx, `Context :  ${JSON.stringify(ctx.session)}`);

    // ctx.session
    // redisSession.saveSession(getSessionKey(ctx), ctx.session);
}

export function cleanUpMessages(ctx: any) {
    try {
        while (ctx.session.cleanUpMessages && ctx.session.cleanUpMessages.length) {
            ctx.deleteMessage(ctx.session.cleanUpMessages.pop())
                .catch((e: any) => {
                    logger.error(ctx, `Runtime error during clean up message:  ${e}`);
                    ctx.session.cleanUpMessages.pop();
                });
        }
    } catch (e) {
        logger.error(ctx, `Runtime error during clean up message:  ${e}`);
    }
}

/**
 * Removing data from the session
 *
 * @param ctx - telegram context
 * @param field - field to delete
 */
export function deleteFromSession(ctx: any, field: SessionDataField) {
    logger.debug(ctx, 'Deleting %s from session', field);
    delete ctx.session[field];
    // redisSession.saveSession(getSessionKey(ctx), ctx.session);
}
