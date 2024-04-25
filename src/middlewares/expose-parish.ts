import { saveToSession } from '../util/session';
import { IParish } from '../models/Parish';

/**
 * Exposes required parish according to the given callback data
 *
 * @param ctx - telegram context
 * @param next - next function
 */
export function exposeParish(ctx: any, next: () => void) {
    const action = JSON.parse(ctx.callbackQuery.data);
    const selectedParish = (ctx.session.parishes as IParish[]).find((item: IParish) => item.id === action.p);
    saveToSession(ctx, 'parish', selectedParish);
    return next();
}
