import * as dotenv from 'dotenv'
dotenv.config()

import logger from './logger';
import { sleep } from './common';
import cron from 'node-cron';
import axios from 'axios';

const buildSiteMsgs: string[] = [];

export async function checkNeeedToRebuildSite() {
 if ( buildSiteMsgs.length > 0 ) {
    const lastMsg = buildSiteMsgs.pop();
    buildSiteMsgs.length = 0;
    const msgObj = JSON.parse(lastMsg);
    await invokeGitHubAction (msgObj.event, msgObj.client_payload);
 }
}

export async function addBuildMessage(msg: string) {
  buildSiteMsgs.push(msg);
}

export function getBuildMessages(): string[] {
  return buildSiteMsgs;
}



export async function invokeGitHubAction(event: string, client_payload: string) {

  const gitActionMessage = {
    'event_type': event,
    'client_payload': client_payload
  };

  try {
    const res = await axios.post(`https://api.github.com/repos/${process.env.REPO_OWNER}/${process.env.REPO_NAME}/dispatches`, gitActionMessage, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'Authorization': `token ${process.env.GITHUB_TOKEN}`
      }
    }).then((response) => {
      console.log(response.status);
      console.log(response.data);
    });
  } catch (err) {
      if (err.response) {
          // The client was given an error response (5xx, 4xx)
          console.error('Error response from server:');

          console.error(err.response);
      } else if (err.request) {
        console.error('No response from server, request is:');
          // The client never received a response, and the request was never left
        console.error(err.request);
      } else {
          // Anything else
        console.error('Error', err.message);
      }
  }
}
