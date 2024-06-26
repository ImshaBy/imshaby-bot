import { SessionContext } from 'telegram-context';
import {telegram} from '../../bot';
import User from '../../models/User';
import { registerUser } from '../../providers/identity-provider';
import { sendMessageWithErrorHandling } from '../../util/notifier';
import loggerWithCtx from '../../util/logger';

/**
 * Write message to a specific user or to all existing users
 *
 * @param ctx - telegram context
 * @param recipient - id or 'all.language'
 * @param message - text to write
 */
export async function write(ctx: SessionContext, recipient: string, message: string) {
    if (!Number.isNaN(+recipient) && recipient.length >= 6) {
    // Write to a single user
        await sendMessageWithErrorHandling(Number(recipient), message);
        await ctx.reply(`Successfully sent message to: ${recipient}, content: ${message}`);
    } else if (recipient.includes('all')) {
    // Write to everyone
        const SUPPORTED_LANGUAGES = ['en', 'ru'];
        const language = recipient.split('.')[1];

        if (!SUPPORTED_LANGUAGES.includes(language)) {
            await ctx.reply(`Unsupported language ${language}`);
            return;
        }

        const users = await User.find({ }); // TODO: Filter by language

        users.forEach((user, index) => {
            setTimeout(() => {
                  try {
             sendMessageWithErrorHandling(user._id, message);
        } catch (e) {
            loggerWithCtx.error(undefined, "Can't notify user about  reason: %O", e);
        } finally {
            // TODO: check if user blocked the bot and delete him from the DB
        }
        sendMessageWithErrorHandling(Number(user._id), message);
            }, 200 * (index + 1));
        });

        await ctx.reply(`Sending message to everyone is in process, content: ${message}`);
    } else {
    // Recipient wasn't specified correctly
        await ctx.reply(
            'No messages were sent. Please make sure that the command parameters are correct'
        );
    }
}

/**
 * Get users statistics
 *
 * @param ctx - telegram context
 */
export async function getStats(ctx: any) {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();
    const epochTime = new Date(year, month, day).getTime();

    const allUsers = await User.countDocuments({});
    const createdToday = await User.find({ created: { $gte: epochTime } }).countDocuments();
    const activeToday = await User.find({ lastActivity: { $gte: epochTime } }).countDocuments();
    await ctx.reply(
        `Amount of users: ${allUsers}\n` +
      `New users: ${createdToday}\n` +
      `Active users: ${activeToday}`
    );
}

/**
 * Display help menu
 *
 * @param ctx - telegram context
 */
export async function getHelp(ctx: any) {
    await ctx.reply(
        'write | [user_id | all.ru | all.en] | message - write message to user\n' +
      'stats - get stats about users\n' +
      'help - get help menu\n' +
      'user | email | defaultParish | [...otherParishes] - add new user to the Admin panel'
    );
}

export async function addUser(ctx: any, email: string, defaultParish: string, parishes?: string[]) {
    const user = await registerUser(
        email,
        defaultParish,
        parishes
    );
    if (user) {
        await ctx.reply(`Successfully created user with \nEmail: ${email}\nParishes: ${defaultParish}, ${parishes ? parishes : ''}`);
    } else {
        await ctx.reply('User not created due to error');
    }
}
