import { I18n } from 'telegraf-i18n';
import { IMovie } from '../models/Movie';
import { IUser } from '../models/User';
import { IParish } from '../models/Parish';
import { Context } from 'telegraf';

interface SessionContext extends Context  {
    i18n: I18n;
    scene: any;

    session: {
      __scenes: any,
      test : any,
      parishes: IParish[];
      parish: IParish;
      settingsScene: {
        messagesToDelete: any[];
      };
      language: 'en' | 'ru' | any;
      user: IUser;
    };
    webhookReply: boolean;
}
