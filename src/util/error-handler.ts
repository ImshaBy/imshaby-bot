import { Telegraf } from 'telegraf';
import logger from './logger';



export function gracefullShutdown(bot: Telegraf) {
    //do something when app is closing
    process.on('exit', exitHandler.bind(null, { cleanup: true }, bot));

    //catches ctrl+c event
    process.on('SIGINT', exitHandler.bind(null, { exit: true }, bot));

    // catches "kill pid" (for example: nodemon restart)
    process.on('SIGUSR1', exitHandler.bind(null, { exit: true }, bot));
    process.on('SIGUSR2', exitHandler.bind(null, { exit: true }, bot));

    //catches uncaught exceptions
    process.on('uncaughtException', exitHandler.bind(null, { exit: true }, bot));
}

function exitHandler(options: any, exitCode: any, bot: Telegraf) {
    if (options.cleanup) {
        logger.info(null, 'exit: clean');
    }
    if (exitCode || exitCode === 0) {
        if (exitCode !== 0) {
            logger.error(exitCode, exitCode.stack);
            logger.info(null, `exit: code - ${exitCode}`);
        } else {
            logger.info(null, `exit: code - ${exitCode}`);
        }
    }
    if (options.exit) {
        // bot.;
      process.exit(0);
        process.exit();
    }
}



/**
 * Wrapper to catch async errors within a stage. Helps to avoid try catch blocks in there
 *
 * @param fn - function to enter a stage
 */
const asyncWrapper = (fn: CallableFunction) => {
    return async function (ctx: any, next: CallableFunction) {
        try {
            return await fn(ctx);
        } catch (error) {
            logger.error(ctx, 'asyncWrapper error, %O', error);
            await ctx.reply(ctx.i18n.t('shared.something_went_wrong'));
            return next();
        }
    };
};


export default asyncWrapper ;
