// Add some general info, like isPremium, language, etc...
import { Context } from 'telegraf';
import User from '../models/User';
import { saveToSession } from '../util/session';


/**
 * Modifies context and add some information about the user
 * @param ctx - telegram context
 * @param next - next function
 */
export const getUserInfo = async (ctx: Context, next: Function) => {
  if (!ctx.session.language) {
    const user = await User.findById(ctx.from.id);

    if (user) {
      ctx.session.language = user.language;
      ctx.i18n.locale(user.language);
      if (!ctx.session.user) {
        saveToSession(ctx, 'user', user );
      }
    }
  }

  return next();
};
