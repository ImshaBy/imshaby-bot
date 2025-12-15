// Add some general info, like isPremium, language, etc...
import User from '../models/User';
import { saveToSession } from '../util/session';
import logger from '../util/logger';
import { CONFIG } from '../config';



/**
 * Modifies context and add some information about the user
 *
 * @param ctx - telegram context
 * @param next - next function
 */
export const getUserInfo = async (ctx: any, next: () => void) => {
    if (!ctx.session.language) {
        const user = await User.findById(ctx.from.id);

        if (user) {
            ctx.session.language = user.language;
            if(user.language != 'ru') {
                logger.warn(ctx, "User" + user.id + " has other language: " + user.language)
            }
            // TODO: remove once move to other country and once customer will have capability to change lang in settings
            ctx.i18n.locale(CONFIG.bot.lang);
            if (!ctx.session.user) {
                saveToSession(ctx, 'user', user );
            }
        } else {
            logger.warn(ctx, "No user found, setting default lang")
            ctx.i18n.locale(CONFIG.bot.lang);
        }
    }else {
        logger.warn(ctx, "No session language found, setting default lang")
        ctx.i18n.locale(CONFIG.bot.lang);
    }

    return next();
};
