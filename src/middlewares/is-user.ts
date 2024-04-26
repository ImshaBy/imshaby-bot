
/**
 * Checks whether user is admin and can access restricted areas
 *
 * @param ctx - telegram context
 * @param next - next function
 */
export const isUseDefined = async (ctx: any, next: () => void) => {
    ctx.session.user.observableParishKeys

    return ctx.reply('Sorry, you are not an admin :(');
};
