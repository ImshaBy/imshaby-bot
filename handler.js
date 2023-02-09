'use strict';

const { bot } = require('./dist/bot.js');
const { getConnection } = require('./dist/mongo.js');


const getResponseHeaders = () => {
    return {
        'Access-Control-Allow-Origin': '*'
    };
};

module.exports.webhook = async event => {
    try {

        const body = JSON.parse(event.body);
        console.log('details - message');

        console.log(body);

        console.log(bot);

        await getConnection('lambda');

        await bot.handleUpdate(body);

        console.log('After handle update!');
        const promise = new Promise(function(resolve, reject) {
            setTimeout(() => {
                resolve;
            }, 2000);
        });
        return promise;

        // return {
        //   statusCode: 200,
        //   headers: getResponseHeaders(),
        //   body: JSON.stringify(
        //     {
        //       message: 'Ok',
        //     })
        // };

    } catch (err) {
        console.log('Catch case Error: ', err);

        console.log('Error: ', err);
        return {
            statusCode: err.statusCode ? err.statusCode : 500,
            headers: getResponseHeaders(),
            body: JSON.stringify({
                error: err.name ? err.name : 'Exception',
                message: err.message ? err.message : 'Unknown error'
            })
        };
    }
};

module.exports.setWebhook = async event => {
    try {

        const url = 'https://' + event.headers.Host + '/' + event.requestContext.stage + '/webhook';

        console.log('Hook :' + url);

        await bot.telegram.setWebhook(url);

        return {
            statusCode: 200,
            headers: getResponseHeaders(),
            body: JSON.stringify({url: url})
        };

    } catch (err) {
        console.log('Error: ', err);
        return {
            statusCode: err.statusCode ? err.statusCode : 500,
            headers: getResponseHeaders(),
            body: JSON.stringify({
                error: err.name ? err.name : 'Exception',
                message: err.message ? err.message : 'Unknown error'
            })
        };
    }
};