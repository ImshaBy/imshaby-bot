import { SessionContext } from 'telegraf-context';
import logger from '../../util/logger';

const about = async (ctx: SessionContext) => {
    logger.debug(ctx, 'Opens about section');
    await ctx.reply(ctx.i18n.t('scenes.about.main'), {
        disable_web_page_preview: true
    } as any);
};

export default about;
