import * as dotenv from 'dotenv'
import { env } from 'process';
dotenv.config()

export type IConfig = {
  bot: { 
    token: string, 
    lang: string,
    chatTypes: string,
    dropPending: boolean,
    isTopicChannel: boolean };
  server: { port: number, env: string };
  log: { output: string };
  webhook: {
    path: string,
    url: string
  }, 
  schedule: {
    build: string,
    notify: string
  }, 
  admin: {
    ids: string,
    url: string,
    pass: string
  },
  api: {
    dbUri:string,
    host: string,
    bearer: string,
    internalHost: string,
    internalKey: string
  },
  redis: {
    host: string,
    port: string
  },
  build: {
    repoOwner: string,
    repoName: string,
    token: string
  },
  identity: {
    applicationId: string,
    apiKey: string,
    defaultPass: string
  }

};

function initConfig(): IConfig {
  const envs = {
    WEBHOOK_PATH: process.env.WEBHOOK_PATH,
    SCHEDULE:process.env.SCHEDULE,
    SCHEDULE_BUILD: process.env.SCHEDULE_BUILD,
    WEBHOOK_URL: process.env.WEBHOOK_URL,
    NODE_ENV: process.env.NODE_ENV,
    TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
    PORT: process.env.PORT,
    DATABASE_URI: process.env.DATABASE_URI,
    ADMIN_URL: process.env.ADMIN_URL,
    ADMIN_IDS: process.env.ADMIN_IDS,
    ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
    APIHOST: process.env.APIHOST,
    APIBEARER: process.env.APIBEARER,
    REDIS_HOST: process.env.REDIS_HOST,
    REDIS_PORT: process.env.REDIS_PORT,
    INTERNAL_APIHOST: process.env.INTERNAL_APIHOST,
    DEFAULT_LANG: process.env.DEFAULT_LANG || 'ru',
    CHAT_TYPES: process.env.CHAT_TYPES,
    INTERNAL_API_KEY: process.env.INTERNAL_API_KEY,
    REPO_OWNER: process.env.REPO_OWNER,
    REPO_NAME: process.env.REPO_NAME,
    GITHUB_TOKEN: process.env.GITHUB_TOKEN,
    LOGS_OUTPUT: process.env.LOGS_OUTPUT || 'logs.log',
    IS_TOPIC_MESSAGE:process.env.IS_TOPIC_MESSAGE,
    APPLICATIONID: process.env.APPLICATIONID,
    API_KEY: process.env.API_KEY,
    DEFAULTPASSWORD: process.env.DEFAULTPASSWORD,
    BOT_DROP_PENDING: process.env.BOT_DROP_PENDING
  } as const;

  const requiredEnvsNames = ['TELEGRAM_TOKEN','BOT_DROP_PENDING', 'SCHEDULE', 'SCHEDULE_BUILD',
 'NODE_ENV', 'TELEGRAM_TOKEN', 'PORT', 'DATABASE_URI', 'ADMIN_URL', 'ADMIN_IDS', 'ADMIN_PASSWORD', 'APIHOST',
'APIBEARER', 'REDIS_HOST', 'REDIS_PORT', 'INTERNAL_APIHOST', 'INTERNAL_API_KEY', 'CHAT_TYPES', 'REPO_OWNER', 
'REPO_NAME', 'GITHUB_TOKEN', 'IS_TOPIC_MESSAGE', 'APPLICATIONID', 'API_KEY', 'DEFAULTPASSWORD'    ] as const;

  requiredEnvsNames.forEach((key: keyof typeof envs) => {
    const value = !!envs[key];
    if (!value) {
      console.error(`❌ Missing env value for ${key}`);
      return process.exit(0);
    }
  });

  const config: IConfig = {
    bot: {
      token: envs.TELEGRAM_TOKEN!,
      chatTypes: envs.CHAT_TYPES,
      lang: envs.DEFAULT_LANG,
      dropPending: Boolean(envs.BOT_DROP_PENDING),
      isTopicChannel: Boolean(envs.IS_TOPIC_MESSAGE)
    },
    server:{
      port: Number(envs.PORT) || 3000,
      env: envs.NODE_ENV,
    },
    log: {
      output: envs.LOGS_OUTPUT,
    },
    webhook :{
      path: envs.WEBHOOK_PATH,
      url: envs.WEBHOOK_URL
    },
    admin: {
      ids: envs.ADMIN_IDS,
      pass: envs.ADMIN_PASSWORD,
      url: envs.ADMIN_URL
    },
    api: {
      host: envs.APIHOST,
      bearer: envs.APIBEARER,
      dbUri: envs.DATABASE_URI,
      internalKey: envs.INTERNAL_API_KEY,
      internalHost: envs.INTERNAL_APIHOST
    },
    build: {
      repoName: envs.REPO_NAME,
      repoOwner: envs.REPO_OWNER,
      token: envs.GITHUB_TOKEN
    },
    redis: {
      host: envs.REDIS_HOST || '127.0.0.1',
      port: envs.REDIS_PORT || '6379'
    },
    schedule: {
      build: envs.SCHEDULE_BUILD,
      notify: envs.SCHEDULE
    },
    identity: {
      apiKey: envs.API_KEY,
      applicationId: envs.APPLICATIONID,
      defaultPass: envs.DEFAULTPASSWORD
    }
  };

  return config;
}

export const CONFIG: IConfig = initConfig();
