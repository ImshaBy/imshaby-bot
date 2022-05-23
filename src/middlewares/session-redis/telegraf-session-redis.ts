import { Redis } from 'ioredis';
import { Middleware }  from 'telegraf';
import { SessionContext } from 'telegraf-context';
import { SessionOptions } from './session-interfaces';

import logger from '../../util/logger';


export class TelegrafSessionRedis {
  client: Redis;
  options: SessionOptions;

  constructor( options: SessionOptions ) {
    this.options = Object.assign(
      {
        property: 'session',
        getSessionKey: (ctx: SessionContext) => ctx.from && ctx.chat && `${ctx.from.id}:${ctx.chat.id}`,
        store: {}
      },
      options
    );

    this.client = this.options.client;
  }

  async getSession(key: string): Promise<any> {
    const json = await this.client.get(key);
    if (!json) {
      return {};
    }
    try {
      const session = JSON.parse(json);
      logger.debug(null, 'session state', key, session);
      return session;
    } catch (error) {
      logger.debug(null, 'Parse session state failed', error);
    }
    return {};
  }

  async clearSession(key: string): Promise<void> {
    await this.client.del(key);
  }

  async saveSession(key: string, session: object): Promise<any> {
    if (!session || Object.keys(session).length === 0) {
      return this.clearSession(key).then(() => ({}));
    }
    if (this.options.ttl) {
      await this.client.setex(key, this.options.ttl, JSON.stringify(session));
    } else {
      await this.client.set(key, JSON.stringify(session));
    }
  }

  middleware(): Middleware<any> {
    return async (ctx: SessionContext, next: any) => {
      const key = this.options.getSessionKey!(ctx);
      if (!key) {
        return next();
      }
      let session = await this.getSession(key);
      Object.defineProperty(ctx, this.options.property!, {
        get: function() {
          return session;
        },
        set: function(newValue) {
          session = Object.assign({}, newValue);
        }
      });
      const rs = await next();
      await this.saveSession(key, session);
      return rs;
    };
  }
}