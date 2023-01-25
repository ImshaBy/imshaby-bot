import { Redis } from 'ioredis';
import { SessionContext } from 'telegraf-context';

export interface SessionOptions {
    // session expire seconds
    readonly ttl?: number;
    readonly property?: string;
    readonly client: Redis;
    readonly getSessionKey?: (ctx: SessionContext) => any;
}

export type ContextUpdate = (ctx: any, next: () => any) => any;