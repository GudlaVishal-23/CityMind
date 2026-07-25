import app from './app';
import { connectDatabase } from './config/db';
import { initializeFirebase } from './config/firebase';
import { configureCloudinary } from './config/cloudinary';
import { connectNeo4j } from './config/neo4j';
import logger from './utils/logger';

const PORT = process.env.PORT || 5000;

const startServer = async (): Promise<void> => {
  try {
    logger.info('[Startup] Initializing AI CITY backend server...');

    // 1. Establish database link
    await connectDatabase();

    // 2. Initialize Identity Edge SDK
    initializeFirebase();

    // 3. Configure storage parameters
    configureCloudinary();

    // 4. Connect Neo4j Graph Database
    await connectNeo4j();

    // 4. Bind listener
    app.listen(PORT, () => {
      logger.info(`[Startup] Server listening successfully on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
    });
  } catch (error) {
    logger.error(`[Startup] Failed to start server: ${error}`);
    process.exit(1);
  }
};

startServer();
