import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client, TokenPayload } from 'google-auth-library';

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
  hd?: string; // Hosted domain (for Google Workspace accounts)
}

@Injectable()
export class GoogleAuthService {
  private readonly client: OAuth2Client;
  private readonly clientId: string;

  constructor(private readonly configService: ConfigService) {
    this.clientId = this.configService.getOrThrow<string>('GOOGLE_CLIENT_ID');
    this.client = new OAuth2Client(this.clientId);
  }

  /**
   * Verify Google Sign-In ID token (JWT)
   * This matches the Phoenix GoogleToken module behavior
   *
   * Google JWT validation includes:
   * - Signature verification against Google's JWKS
   * - iss (issuer) must be accounts.google.com or https://accounts.google.com
   * - aud (audience) must match our client ID
   * - exp (expiration) must be in the future
   */
  async verifyIdToken(idToken: string): Promise<GoogleUserInfo> {
    try {
      const ticket = await this.client.verifyIdToken({
        idToken,
        audience: this.clientId,
      });

      const payload = ticket.getPayload();

      if (!payload) {
        throw new UnauthorizedException('Invalid Google token: no payload');
      }

      // Validate required claims
      this.validatePayload(payload);

      return {
        email: payload.email!,
        name: payload.name || payload.email!.split('@')[0],
        picture: payload.picture,
        hd: payload.hd, // Hosted domain for workspace accounts
      };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(`Google token verification failed: ${error.message}`);
    }
  }

  /**
   * Validate the Google JWT payload
   */
  private validatePayload(payload: TokenPayload): void {
    // Email must be present and verified
    if (!payload.email) {
      throw new UnauthorizedException('Google token missing email claim');
    }

    if (!payload.email_verified) {
      throw new UnauthorizedException('Google email not verified');
    }

    // Validate issuer (matching Phoenix validation)
    const validIssuers = ['accounts.google.com', 'https://accounts.google.com'];
    if (!payload.iss || !validIssuers.includes(payload.iss)) {
      throw new UnauthorizedException(`Invalid Google token issuer: ${payload.iss}`);
    }

    // Audience validation is handled by verifyIdToken, but double-check
    if (payload.aud !== this.clientId) {
      throw new UnauthorizedException('Google token audience mismatch');
    }
  }

  /**
   * Check if email is from a trusted hosted domain
   * (Phoenix has this commented out, but including for future use)
   */
  isTrustedDomain(hd: string | undefined, trustedDomains: string[]): boolean {
    if (!hd || trustedDomains.length === 0) {
      return true; // No domain restriction
    }
    return trustedDomains.includes(hd);
  }
}
