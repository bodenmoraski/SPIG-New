import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User, Role } from '@prisma/client';
import { GoogleAuthService, GoogleUserInfo } from './google-auth.service';
import { UsersService } from '../users/users.service';

export interface JwtPayload {
  sub: number;
  email: string;
  role: Role;
}

export interface AuthTokens {
  accessToken: string;
  user: User;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Authenticate user with Google Sign-In credential (JWT)
   * This matches the Phoenix implementation which verifies Google's JWT directly
   */
  async authenticateWithGoogle(credential: string): Promise<AuthTokens> {
    // Verify the Google JWT and extract user info
    const googleUser = await this.googleAuthService.verifyIdToken(credential);

    // Find or create user (matching Phoenix behavior - defaults to STUDENT)
    let user = await this.usersService.findByEmail(googleUser.email);

    if (!user) {
      user = await this.usersService.create({
        email: googleUser.email,
        name: googleUser.name,
        avatar: googleUser.picture,
        role: Role.STUDENT,
      });
    } else {
      // Update avatar if changed
      if (googleUser.picture && user.avatar !== googleUser.picture) {
        user = await this.usersService.update(user.id, { avatar: googleUser.picture });
      }
    }

    // Generate our own JWT for session
    const accessToken = this.generateToken(user);

    return { accessToken, user };
  }

  /**
   * Generate JWT token for user
   */
  generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }

  /**
   * Verify and decode JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload> {
    try {
      return this.jwtService.verify<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Get user from JWT payload
   */
  async getUserFromPayload(payload: JwtPayload): Promise<User> {
    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }
    return user;
  }

  /**
   * Cookie configuration matching Phoenix behavior
   */
  getCookieConfig() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax' as const,
      maxAge: 60 * 24 * 60 * 60 * 1000, // 60 days in milliseconds
      path: '/',
    };
  }
}
