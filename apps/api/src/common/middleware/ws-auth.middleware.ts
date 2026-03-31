import { Injectable, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Socket } from 'socket.io';
import { WsException } from '@nestjs/websockets';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

@Injectable()
export class WsAuthMiddleware {
  private readonly logger = new Logger(WsAuthMiddleware.name);

  constructor(private readonly jwtService: JwtService) {}

  use(client: AuthenticatedSocket, next: (err?: Error) => void) {
    try {
      // Extract token from handshake auth or query
      const token =
        client.handshake?.auth?.token ||
        client.handshake?.headers?.authorization?.replace('Bearer ', '');

      if (!token) {
        this.logger.warn({
          event: 'ws_auth_missing_token',
          clientId: client.id,
        });
        // Allow connection but without user context
        return next();
      }

      // Verify and decode token
      const payload = this.jwtService.verify(token);

      // Attach user to socket
      client.user = {
        id: payload.sub,
        email: payload.email,
        role: payload.role,
      };

      this.logger.log({
        event: 'ws_auth_success',
        clientId: client.id,
        userId: payload.sub,
        role: payload.role,
      });

      next();
    } catch (error) {
      this.logger.error({
        event: 'ws_auth_failed',
        clientId: client.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      // Allow connection anyway (but without user context)
      // In production, you might want to reject: next(new WsException('Unauthorized'));
      next();
    }
  }
}
