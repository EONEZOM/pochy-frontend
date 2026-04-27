import dotenv from 'dotenv';
dotenv.config();

const OPENAPI_BASE_URL = process.env.OPENAPI_BASE_URL;
if (!OPENAPI_BASE_URL) {
  throw new Error('OPENAPI_BASE_URL is required');
}
const normalizedBase = OPENAPI_BASE_URL.replace(/\/$/, '');
const openApiTarget = normalizedBase.endsWith('/v3/api-docs')
  ? normalizedBase
  : `${normalizedBase}/v3/api-docs`;

module.exports = {
  pouchy: {
    input: {
      target: openApiTarget,
    },
    output: {
      mode: 'tags-split',
      target: './api/generated/pouchy.ts',
      schemas: './api/model',
      client: 'react-query',
      httpClient: 'axios',
      override: {
        mutator: {
          path: './api/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
};
