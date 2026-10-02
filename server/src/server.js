const app = require('./app');
const { connectDB } = require('./config/db');
const { PORT } = require('./config/env');

const startServer = async () => {
  try {
    await connectDB();

    const server = app.listen(PORT, () => {
      console.log(`=======================================================`);
      console.log(`🚀 Adverse Hoarding Backend running on port: ${PORT}`);
      console.log(`📍 West Bengal Outdoor Advertising (OOH) Engine Active`);
      console.log(`📡 Health Check: http://localhost:${PORT}/api/health`);
      console.log(`=======================================================`);
    });

    process.on('unhandledRejection', (err) => {
      console.error('Unhandled Rejection! Shutting down...', err);
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
