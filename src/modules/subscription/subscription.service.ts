import { Injectable } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { PrismaService } from '../prisma/prisma.service';
import { errorResponse, successResponse } from 'src/shared/helpers/functions';
import { ResponseModel } from 'src/shared/models/response.model';

@Injectable()
export class SubscriptionService {
  constructor(private readonly prisma: PrismaService) {}

  async checkSubscription(user: User): Promise<ResponseModel> {
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        userId: user.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!subscription) {
      return errorResponse('Subscription not found', {
        isSubscribed: false,
        subscription: null,
        daysLeft: null,
      });
    }

    const now = new Date();
    const endDate = new Date(subscription.endDate);
    const isActive = subscription.status === 'active' && endDate > now;

    let result;
    if (isActive) {
      const daysLeft = Math.ceil(
        (endDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
      );
      result = { isSubscribed: true, subscription, daysLeft };
    } else {
      result = { isSubscribed: false, subscription, daysLeft: 0 };
    }

    return successResponse(
      'Subscription status retrieved successfully',
      result,
    );
  }

  async getActiveSubscribers(): Promise<number> {
    const now = new Date();
    const activeSubscribers = await this.prisma.subscription.count({
      where: {
        status: 'active',
        endDate: {
          gt: now,
        },
      },
    });
    return activeSubscribers;
  }

  async updateSubscriptionStatus(): Promise<void> {
    const now = new Date();
    await this.prisma.subscription.updateMany({
      where: {
        status: 'active',
        endDate: {
          lte: now,
        },
      },
      data: {
        status: 'expired',
      },
    });
  }
}
