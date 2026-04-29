export interface AppConfig {
  apiUrl: string;
  environment: string;
  isProduction: boolean;
}

const browserOrigin = typeof globalThis !== 'undefined' && 'location' in globalThis
  ? globalThis.location.origin
  : '';

const isLocalEnvironment = !browserOrigin
  || /localhost|127\.0\.0\.1/i.test(browserOrigin);

export const APP_CONFIG: AppConfig = {
  apiUrl: isLocalEnvironment
    ? 'http://localhost:8000/api/v1'
    : 'https://ecommerce-platform-qb93.onrender.com/api/v1',
  environment: isLocalEnvironment ? 'development' : 'production',
  isProduction: !isLocalEnvironment,
};
