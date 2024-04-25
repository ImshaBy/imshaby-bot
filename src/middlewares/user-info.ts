// Add some general info, like isPremium, language, etc...
import User from '../models/User';
import { saveToSession } from '../util/session';
import logger from '../util/logger';



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
            ctx.i18n.locale(user.language);
            if (!ctx.session.user) {
                saveToSession(ctx, 'user', user );
            }
        } else {
            logger.warn(ctx, "No user found")
        }
    }else {
        logger.warn(ctx, "No session language found")
    }

    return next();
};
