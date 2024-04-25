
import {CONFIG} from '../config';
/**
 * Checks whether message is from user in private communication
 *
 * @param ctx - telegram context
 * @param next - next function
 */
export const isSupportedChatType = async (ctx: any, next: () => void) => {
    const chatType = ctx.message?.chat.type;
    const supportedChatType = CONFIG.bot.chatTypes;

    if (supportedChatType.includes(chatType)) {
        return next();
    }

};
