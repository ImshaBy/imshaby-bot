import { I18n } from 'telegraf-i18n';
import { IParish } from '../models/Parish';
import { IUser } from '../models/User';
import { Context } from 'telegraf';
import { SceneContext, SceneSessionData } from 'telegraf/typings/scenes';

interface SessionData extends SceneSessionData{
    __scenes: any;
    cleanUpMessages: number[];
    parishes: IParish[];
    parish: IParish;
    settingsScene: {
        messagesToDelete: any[];
    };
    language: 'en' | 'ru' | any;
    counter: number;
    user: IUser;
}
   

interface SessionContext extends SceneContext  {
    i18n: I18n;
    scene: any;
    session: SessionData 
}