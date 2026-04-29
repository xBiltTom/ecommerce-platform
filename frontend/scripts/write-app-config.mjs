import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const normalizeApiUrl = (value) => value.replace(/\/+$/, '');

const environment = process.env.NG_APP_ENVIRONMENT || process.env.VERCEL_ENV || process.env.NODE_ENV || 'development';
const apiUrl = normalizeApiUrl(process.env.NG_APP_API_URL || 'http://localhost:8000/api/v1');
const isProduction = environment !== 'development';
const targetFile = resolve(process.cwd(), 'src/app/core/config/app-config.ts');

const fileContent = `export interface AppConfig {
  apiUrl: string;
  environment: string;
  isProduction: boolean;
}

export const APP_CONFIG: AppConfig = {
  apiUrl: ${JSON.stringify(apiUrl)},
  environment: ${JSON.stringify(environment)},
  isProduction: ${JSON.stringify(isProduction)},
};
`;

await mkdir(dirname(targetFile), { recursive: true });
await writeFile(targetFile, fileContent, 'utf8');
