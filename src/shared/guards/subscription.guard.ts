import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../modules/prisma/prisma.service';
import { IS_SUBSCRIBED_KEY } from '../decorators/is-subscribed.decorator';

@Injectable()
export class SubscriptionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isSubscribed = this.reflector.getAllAndOverride<boolean>(IS_SUBSCRIBED_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!isSubscribed) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new UnauthorizedException('User not authenticated');
    }

    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId: user.id },
      });

      const now = new Date();
      const isActive = subscription?.status === 'active' && subscription?.endDate > now;

      if (!isActive) {
        throw new UnauthorizedException(
          'This feature requires an active subscription. Please subscribe to continue.'
        );
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Error checking subscription status');
    }
  }
} 