import {expressjwt} from 'express-jwt';

import i18next from 'i18next';
import Backend from 'i18next-fs-backend';
import i18nextMiddleware from 'i18next-http-middleware';
import axios from 'axios';
import express from 'express';
import bodyParser from 'body-parser';
import logger from '../util/logger';
import { checkNeeedToUpdateParishes, notifyGroupChatAboutParishChange } from '../util/notifier';
import { invokeGitHubAction, addBuildMessage, checkNeeedToRebuildSite, getBuildMessages, getParishUpdateMsg } from '../util/githooker';
import { Telegram } from 'telegraf';

i18next
    .use(Backend)
    .use(i18nextMiddleware.LanguageDetector)
    .init({
        backend: {
            loadPath: __dirname + '/locales/{{lng}}-hook.json',
        },
        detection: {
            lookupQuerystring: 'lng',
            order: ['querystring', 'cookie'],
            caches: ['cookie']
        },
        fallbackLng: 'en',
        preload: ['en', 'ru']
    });


export async function createExpressServer(telegram: Telegram) {

    const app = express();
    app.use(bodyParser.json());
    app.use(i18nextMiddleware.handle(
      i18next, {
        removeLngFromUrl: false
        }
    ));
  
    app.get('/private', checkJwt, function (req: any, res: any) {
      logger.debug(undefined, `Private url is triggered `);
      res.status(200).end();
    });
  
    app.get('/',  function (req: any, res: any) {
      logger.debug(undefined, `Public root url is triggered `);
      res.json({'status': 'ok'});
    });
  
    app.post('/chat/parish',  function (req: any, res: any) {
      notifyGroupChatAboutParishChange(req.query.chatId, getParishUpdateMsg(req, `${req.body.parish.name}`), req.query.msgThreadId);
      res.status(200).end();
    });
  
    app.post('/chat/city', function (req: any, res: any) {
      notifyGroupChatAboutParishChange(req.query.chatId, getParishUpdateMsg(req, `${req.body.parish.name}`), req.query.msgThreadId);
      res.status(200).end();
    });
  
    app.post('/build-site',  async function (req: any, res: any) {
      // console.log(`${JSON.stringify(req.body)}`);
      if ( req.headers['x-build-now']) {
        await invokeGitHubAction(req.headers['workflow-type'], req.body);
      } else {
        await addBuildMessage(JSON.stringify({'event' : req.headers['workflow-type'], 'client_payload' : req.body}));
      }
      logger.debug(undefined, `CMS hook is triggered`);
      res.status(200).end();
    });
  
    app.get('/build-site/messages',  function (req: any, res: any) {
      res.json({'count': getBuildMessages().length, 'messages': getBuildMessages()});
    });
  
    return app;
  }


 
  const checkJwt = expressjwt({
    // DEPRECATED
    // SHOULD BE REMOVED

    // Dynamically provide a signing key
    // based on the kid in the header and
    // the signing keys provided by the JWKS endpoint.
    // secret: jwksRsa.expressJwtSecret({
    //   cache: true,
    //   rateLimit: true,
    //   jwksRequestsPerMinute: 5,
    //   jwksUri: `https://${process.env.AUTH0_ISSUER_BASE_URL}/.well-known/jwks.json`
    // }),
    secret: 'secret',

    // Validate the audience and the issuer.
    audience: `${process.env.AUTH0_AUDIENCE}`,
    issuer: `https://${process.env.AUTH0_ISSUER_BASE_URL}/`,
    algorithms: ['RS256']
});