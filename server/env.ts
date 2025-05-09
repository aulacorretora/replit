import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

const cwd = process.cwd();
console.log('Current working directory:', cwd);
const envPath = path.resolve(cwd, '.env');
console.log('.env file exists:', fs.existsSync(envPath));
console.log('.env file path:', envPath);

// Load environment variables from .env file
const result = dotenv.config({ path: envPath });
if (result.error) {
  console.error('Error loading .env file:', result.error);
} else {
  console.log('.env file loaded successfully');
}

// Log loaded environment variables (without sensitive values)
console.log('Environment variables loaded:');
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- SUPABASE_URL:', process.env.SUPABASE_URL ? 'configured' : 'not configured');
console.log('- SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'configured' : 'not configured');
console.log('- SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'configured' : 'not configured');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? 'configured' : 'not configured');

export const ENV = {
  SUPABASE_URL: process.env.SUPABASE_URL,
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_KEY: process.env.SUPABASE_SERVICE_KEY,
  DATABASE_URL: process.env.DATABASE_URL,
  NODE_ENV: process.env.NODE_ENV,
  PORT: process.env.PORT,
  SESSION_SECRET: process.env.SESSION_SECRET
};
