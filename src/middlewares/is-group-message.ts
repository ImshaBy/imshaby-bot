import { SessionContext } from 'telegraf-context';


/**
 * Checks whether message is from user in private communication
 * @param ctx - telegram context
 * @param next - next function
 */
 export const isSupportedChatType = async (ctx: SessionContext, next: Function) => {
  const chatType = ctx.message?.chat.type;
  const supportedChatType = process.env.CHAT_TYPES;

  if (supportedChatType.includes(chatType)) {
    return next();
  }

};
