import { Scenes } from "telegraf";
import { match } from 'telegraf-i18n';
import { getMainKeyboard, getBackKeyboard } from '../../util/keyboards';
import logger from '../../util/logger';
import { write, getStats, getHelp, addUser } from './helpers';
import { SessionContext } from "telegram-context";

const admin = new Scenes.BaseScene<SessionContext>('admin');

admin.enter(async (ctx: any) => {
    logger.debug(ctx, 'Enters admin scene');
    const { backKeyboard } = getBackKeyboard(ctx);

    await ctx.reply('Welcome to Admin stage', backKeyboard);
    getHelp(ctx);
});

admin.leave(async (ctx: any) => {
    logger.debug(ctx, 'Leaves admin scene');
    await ctx.scene.leave(ctx);
    const { mainKeyboard } = getMainKeyboard(ctx);
    await ctx.reply(ctx.i18n.t('shared.what_next'), mainKeyboard);
});

admin.command('saveme', async (ctx) => await ctx.scene.leave());

admin.hears(match('keyboards.back_keyboard.back'), async (ctx: SessionContext) => await ctx.scene.leave());

admin.on('text', async (ctx: any) => {
    if(ctx.message.text == '/menu'){
        await ctx.scene.leave(ctx);
    }else {
        console.log(ctx.message.text);
        const [type, ...params] = ctx.message.text.split(' | ');
        switch (type) {
            case 'write':
                await write(ctx, params[0], params[1]);
                break;
            case 'stats':
                await getStats(ctx);
                break;
            case 'help':
                await getHelp(ctx);
                break;
            case 'user':
                await addUser(ctx, params[0], params[1], params.slice(2));
                break;
            default:
                ctx.reply('Command was not specified');
    }

    }
});

export default admin;
