declare module 'swagger-ui-express' {
  import { RequestHandler } from 'express';

  export interface SwaggerUiOptions {
    [key: string]: unknown;
  }

  export const serve: RequestHandler[];
  export function setup(
    swaggerDoc?: Record<string, unknown> | null,
    opts?: SwaggerUiOptions | boolean,
    options?: SwaggerUiOptions,
    customCss?: string,
    customfavIcon?: string,
    swaggerUrl?: string,
    customSiteTitle?: string
  ): RequestHandler;
  export function serveFiles(swaggerDoc?: Record<string, unknown> | null, opts?: SwaggerUiOptions): RequestHandler[];
}
