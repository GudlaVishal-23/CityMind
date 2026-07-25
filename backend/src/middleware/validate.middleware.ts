import { Request, Response, NextFunction } from 'express';
import { ZodTypeAny, ZodError } from 'zod';
import logger from '../utils/logger';

export const validateBody = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.body = await schema.parseAsync(req.body);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(`[Validation] Request body validation failed: ${JSON.stringify(error.errors)}`);
        
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          issue: err.message,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Validation failed for request parameters.',
            details,
          },
        });
        return;
      }
      
      next(error);
    }
  };
};

export const validateQuery = (schema: ZodTypeAny) => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      req.query = await schema.parseAsync(req.query);
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        logger.warn(`[Validation] Request query validation failed: ${JSON.stringify(error.errors)}`);
        
        const details = error.errors.map((err) => ({
          field: err.path.join('.'),
          issue: err.message,
        }));

        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Validation failed for request parameters.',
            details,
          },
        });
        return;
      }
      
      next(error);
    }
  };
};
