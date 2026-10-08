const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

module.exports = {
  PORT: process.env.PORT || 3000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGO_URI: process.env.MONGO_URI || 'mongodb+srv://veda:veda@vedaapi.wiqur3b.mongodb.net/Adverse?retryWrites=true&w=majority&appName=VedaAPI',
  JWT_SECRET: process.env.JWT_SECRET || 'kjaghdfabhdfjiiy&&**^&^kgvk',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '30d',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  USE_MEMORY_DB: process.env.USE_MEMORY_DB === 'true'
};
