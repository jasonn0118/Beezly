import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class AuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(AuthMiddleware.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const startTime = Date.now();

    // Log request details
    this.logger.debug(`${req.method} ${req.path} - IP: ${req.ip}`);

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    // Check for auth token (but don't validate - that's for the guard)
    const authHeader = req.headers.authorization;
    const hasToken = !!this.supabaseService.extractTokenFromHeader(authHeader);

    // Add request metadata
    (req as Request & { authMetadata: any }).authMetadata = {
      hasToken,
      timestamp: new Date().toISOString(),
      userAgent: req.headers['user-agent'],
      ip: req.ip,
    };

    // Log response time on finish
    res.on('finish', () => {
      const duration = Date.now() - startTime;
      const statusCode = res.statusCode;
      const logLevel = statusCode >= 400 ? 'warn' : 'log';

      this.logger[logLevel](
        `${req.method} ${req.path} - ${statusCode} - ${duration}ms - Token: ${hasToken ? 'Present' : 'None'}`,
      );
    });

    next();
  }
}
