import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from '../../auth/auth.service';

/**
 * Guard for WebSocket connections
 * Verifies JWT from socket handshake auth
 */
@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake?.auth?.token || client.handshake?.headers?.authorization?.split(' ')[1];

    if (!token) {
      throw new WsException('Authentication required');
    }

    try {
      const payload = await this.authService.verifyToken(token);
      const user = await this.authService.getUserFromPayload(payload);
      
      // Attach user to socket for later use
      client.data = client.data || {};
      client.data.user = user;
      
      return true;
    } catch {
      throw new WsException('Invalid or expired token');
    }
  }
}
