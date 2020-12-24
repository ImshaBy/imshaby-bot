require('dotenv').config();

import mongoose from 'mongoose';
import logger from './util/logger';


export async function getConnection(hostingType: string) {

  logger.debug(undefined, `get Connection function call`);

  await mongoose.connect(`${process.env.DATABASE_URI}`, {
      useNewUrlParser: true,
      useFindAndModify: false
  });
  if (hostingType === 'lambda') {
    mongoose.set('bufferCommands', false);
  }
}

mongoose.connection.on('error', err => {
  logger.error(
    undefined,
    `Error occurred during an attempt to establish connection with the database: %O`,
    err
  );
  process.exit(1);
});

mongoose.connection.on('open', async () =>  {
  logger.info(undefined, 'Connection to DB is passed!');
});


module.exports = {
  getConnection
};
