const { loadEnvConfig } = require('@next/env');

// Load environment variables from .env.local
loadEnvConfig(process.cwd());

/** @type { import("drizzle-kit").Config } */
module.exports = {  
  schema: "./utils/schema.tsx",
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.NEXT_PUBLIC_DRIZZLE_DB_URL
  }
};
