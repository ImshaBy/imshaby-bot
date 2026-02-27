

import mongoose from 'mongoose';
import logger from './util/logger';

import {CONFIG} from './config';

export async function mongoConnection(hostingType: string) {

    logger.debug(undefined, 'get Connection function call');

    await mongoose.connect(`${CONFIG.api.dbUri}`);
    if (hostingType === 'lambda') {
        mongoose.set('bufferCommands', false);
    }

    mongoose.set('strictQuery', false);
}

mongoose.connection.on('error', err => {
    logger.error(
        undefined,
        'Error occurred during an attempt to establish connection with the database: %O',
        err
    );
    process.exit(1);
});

mongoose.connection.on('open', async () =>  {
    logger.info(undefined, 'Connection to Mongo DB is passed!');
});


module.exports = {
    mongoConnection: mongoConnection
};
