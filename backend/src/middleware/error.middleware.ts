import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export class AppError extends Error {
  public statusCode: number;
  public code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

export const errorHandler = (err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  // Map known error types to user-friendly messages
  const errorMessage = err.message || 'An unexpected internal error occurred.';
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let userMessage = 'Something went wrong. Please try again later.';

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    userMessage = err.message;
  } else if (errorMessage.includes('Image') || errorMessage.includes('image') || errorMessage.includes('base64')) {
    statusCode = 400;
    code = 'INVALID_IMAGE';
    userMessage = 'Uploaded file is not a valid image. Please upload a JPEG or PNG under 10 MB.';
  } else if (errorMessage.includes('GPS') || errorMessage.includes('coordinates') || errorMessage.includes('location')) {
    statusCode = 400;
    code = 'MISSING_GPS';
    userMessage = 'Location coordinates are required. Please enable GPS and try again.';
  } else if (errorMessage.includes('429') || errorMessage.includes('RESOURCE_EXHAUSTED') || errorMessage.includes('quota')) {
    statusCode = 429;
    code = 'GEMINI_RATE_LIMIT';
    userMessage = 'AI processing is temporarily rate-limited. Please wait a moment and try again.';
  } else if (errorMessage.includes('timeout') || errorMessage.includes('DEADLINE_EXCEEDED')) {
    statusCode = 504;
    code = 'GEMINI_TIMEOUT';
    userMessage = 'AI processing timed out. Please try again in a few seconds.';
  } else if (errorMessage.includes('duplicate') || errorMessage.includes('already reported')) {
    statusCode = 200;
    code = 'DUPLICATE_COMPLAINT';
    userMessage = 'This issue has already been reported nearby. Your report has been linked as a witness.';
  } else if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND') || errorMessage.includes('network')) {
    statusCode = 503;
    code = 'NETWORK_FAILURE';
    userMessage = 'Unable to connect to external services. Please check your connection and try again.';
  } else if (errorMessage.includes('Validation') || errorMessage.includes('validation')) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    userMessage = errorMessage;
  }

  logger.error(`[ErrorMiddleware] ${code}: ${errorMessage}`);

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: userMessage,
      ...(process.env.NODE_ENV === 'development' ? { debug: errorMessage } : {})
    }
  });
};

export default errorHandler;
