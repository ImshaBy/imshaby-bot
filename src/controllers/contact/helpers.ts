import { sendMessageWithErrorHandling } from '../../util/notifier';
import { telegram } from '../../bot';

/**
 * Sends a message to the admin
 *
 * @param ctx - telegram context
 */
export async function sendMessage(ctx: any) {
    const msg = `From: ${JSON.stringify(ctx.from)}.\n\nMessage: ${ctx.message.text}`;
    const adminIds = process.env.ADMIN_IDS;
    const adminIdsArr = adminIds.split(',');
    for await (const adminId of adminIdsArr) {
        await sendMessageWithErrorHandling(adminId, msg);
    }
}
