import {
  Controller,
  Post,
  Get,
  Body,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody, ApiBearerAuth, ApiCookieAuth } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { GoogleLoginDto } from './dto/google-login.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Google Sign-In callback
   * Receives the Google ID token (JWT) from the frontend and verifies it
   * This matches the Phoenix POST /auth/callback behavior
   */
  @Post('google')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate with Google Sign-In' })
  @ApiBody({ type: GoogleLoginDto })
  async googleLogin(@Body() dto: GoogleLoginDto, @Res({ passthrough: true }) res: Response) {
    const { accessToken, user } = await this.authService.authenticateWithGoogle(dto.credential);

    // Set JWT in HttpOnly cookie (matching Phoenix session behavior)
    res.cookie('spig_token', accessToken, this.authService.getCookieConfig());

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
      // Also return redirect path based on role (matching Phoenix behavior)
      redirectTo: user.role === 'STUDENT' ? '/section' : '/home',
    };
  }

  /**
   * Get current authenticated user
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Get current user' })
  async me(@CurrentUser() user: User) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      role: user.role,
    };
  }

  /**
   * Logout - clear session cookie
   */
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Logout and clear session' })
  async logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('spig_token', {
      httpOnly: true,
      path: '/',
    });

    return { success: true };
  }

  /**
   * Verify if current token is valid
   * Useful for frontend to check auth status
   */
  @Get('verify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiCookieAuth()
  @ApiOperation({ summary: 'Verify authentication status' })
  async verify(@CurrentUser() user: User) {
    return {
      valid: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        role: user.role,
      },
    };
  }
}
