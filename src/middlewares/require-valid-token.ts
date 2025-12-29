import User from '../models/User';
import { getValidAccessToken } from '../util/token-manager';
import { saveToSession } from '../util/session';
import logger from '../util/logger';

/**
 * Middleware that ensures user has a valid access token
 * If no valid token exists or refresh fails, redirects to start scene for re-authentication
 * 
 * @param ctx - telegram context
 * @param next - next function
 */
export const requireValidToken = async (ctx: any, next: () => void) => {
    const uid = String(ctx.from.id);
    
    // Try to get user from session first, then from DB
    let user = ctx.session.user;
    
    if (!user) {
        user = await User.findById(uid);
        
        if (!user) {
            logger.warn(ctx, 'User %s not found in DB, redirecting to start scene', uid);
            await ctx.reply(ctx.i18n.t('scenes.start.session_expired_reauth'));
            await ctx.scene.enter('start');
            return;
        }
    }

    // Check if user has verified email
    if (!user.emailVerified) {
        logger.warn(ctx, 'User %s email not verified, redirecting to start scene', uid);
        await ctx.reply(ctx.i18n.t('scenes.start.session_expired_reauth'));
        await ctx.scene.enter('start');
        return;
    }

    // Validate/refresh token
    const validToken = await getValidAccessToken(user);
    
    if (!validToken) {
        logger.warn(ctx, 'Failed to get valid token for user %s, redirecting to start scene', uid);
        await ctx.reply(ctx.i18n.t('scenes.start.session_expired_reauth'));
        await ctx.scene.enter('start');
        return;
    }

    // Update session with latest user data (including refreshed tokens if any)
    saveToSession(ctx, 'user', user);
    
    // Token is valid, proceed
    return next();
};

