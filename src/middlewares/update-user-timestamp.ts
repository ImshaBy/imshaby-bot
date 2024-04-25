import User from '../models/User';

/**
 * Updated last activity timestamp for the user in database
 *
 * @param ctx - telegram context
 * @param next - next function
 */
export const updateUserTimestamp = async (ctx: any, next: () => void) => {
    await User.findOneAndUpdate(
        { _id: ctx.from.id + '' },
        { lastActivity: new Date().getTime() },
        { new: true }
    );
    return next();
};
