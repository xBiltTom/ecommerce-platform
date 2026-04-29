export interface AppConfig {
  apiUrl: string;
  environment: string;
  isProduction: boolean;
}

export const APP_CONFIG: AppConfig = {
  apiUrl: 'http://localhost:8000/api/v1',
  environment: 'development',
  isProduction: false,
};
