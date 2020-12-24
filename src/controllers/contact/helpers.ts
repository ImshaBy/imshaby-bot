import { Context } from 'telegraf';
import telegram from '../../telegram';

/**
 * Sends a message to the admin
 * @param ctx - telegram context
 */
export async function sendMessage(ctx: Context) {
  const msg = `From: ${JSON.stringify(ctx.from)}.\n\nMessage: ${ctx.message.text}`;
  const adminIds = process.env.ADMIN_IDS;
  const adminIdsArr = adminIds.split(',');
  for await (const adminId of adminIdsArr) {
    await telegram.sendMessage(adminId, msg);
  }
}
