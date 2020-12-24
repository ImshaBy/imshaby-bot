import { Context } from 'telegraf';

/**
 * Checks whether user is admin and can access restricted areas
 * @param ctx - telegram context
 * @param next - next function
 */
export const isAdmin = async (ctx: Context, next: Function) => {
  const password = ctx.message.text.split(' ')[1];
  const adminIds = process.env.ADMIN_IDS;

  if (adminIds.includes(ctx.from.id + '') && password === process.env.ADMIN_PASSWORD) {
    return next();
  }

  return ctx.reply('Sorry, you are not an admin :(');
};
