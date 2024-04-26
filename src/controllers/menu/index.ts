import logger from '../../util/logger';
import { getMainKeyboard, getBackKeyboard } from '../../util/keyboards';


const menu = async (ctx: any) => {
    ctx.scene.leave()
    const { mainKeyboard } = getMainKeyboard(ctx);
    await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
};

export default menu;
