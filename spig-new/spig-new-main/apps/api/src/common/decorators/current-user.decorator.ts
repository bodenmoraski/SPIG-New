import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

/**
 * Decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user: User
 */
export const CurrentUser = createParamDecorator(
  (data: keyof User | undefined, ctx: ExecutionContext): User | any => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as User;

    if (!user) {
      return null;
    }

    // If a specific property is requested, return just that
    if (data) {
      return user[data];
    }

    return user;
  },
);
