import { sendMessageWithErrorHandling } from '../../util/notifier';
import { telegram } from '../../bot';

/**
 * Sends a message to the admin
 *
 * @param ctx - telegram context
 */
export async function sendMessage(ctx: any) {
  const msg = `Валанцёр: ${ctx.from.first_name} ${
    !!ctx.from.last_name ? ctx.from.last_name : ''
  }\nUsername 🔎: @${!!ctx.from.username ? ctx.from.username : ''}\nUserID 🔑: ${
    ctx.from.id
  }\n\nПаведамленне 📨: ${ctx.message.text}`;
  const adminIds = process.env.ADMIN_IDS;
  const adminIdsArr = adminIds.split(',');
  for await (const adminId of adminIdsArr) {
    await sendMessageWithErrorHandling(adminId, msg);
  }
}
