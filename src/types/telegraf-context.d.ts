import { I18n } from 'telegraf-i18n';
import { IMovie } from '../models/Movie';
import { IUser } from '../models/User';
import { IParish } from '../models/Parish';



declare module 'telegraf' {
  interface Context {
    i18n: I18n;
    scene: any;
    session: {
      parishes: IParish[];
      parish: IParish;
      settingsScene: {
        messagesToDelete: any[];
      };
      language: 'en' | 'ru';
      user: IUser;
    };
    webhookReply: boolean;
  }
}
