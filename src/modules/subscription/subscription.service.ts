import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { User } from '../users/entities/user.entity';
import { PrismaService } from '../prisma/prisma.service';
import { errorResponse, successResponse } from 'src/shared/helpers/functions';
import { ResponseModel } from 'src/shared/models/response.model';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { paginatedQuery } from 'src/shared/utils/pagination.util';

@Injectable()
export class SubscriptionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

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

  async createSubscription(subscriptionData: {
    userId: number;
    orderId: string;
    status: string;
    endDate: Date;
    createdAt: Date;
    productName: string;
    variantName: string;
    subscriptionLengthInMonths: number;
    totalAmount: number;
    currency: string;
  }): Promise<void> {
    await this.prisma.subscription.create({
      data: {
        userId: subscriptionData.userId,
        orderId: subscriptionData.orderId,
        status: subscriptionData.status,
        endDate: subscriptionData.endDate,
        createdAt: subscriptionData.createdAt,
        productName: subscriptionData.productName,
        variantName: subscriptionData.variantName,
        subscriptionLengthInMonths: subscriptionData.subscriptionLengthInMonths,
        totalAmount: subscriptionData.totalAmount,
        currency: subscriptionData.currency,
      },
    });
  }

  async createCheckout(
    user: User,
    productId: string,
    redirectUrl: string,
  ): Promise<string> {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.id },
    });

    if (!dbUser) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    try {
      const response = await lastValueFrom(
        this.httpService.post(
          'https://api.lemonsqueezy.com/v1/checkouts',
          {
            data: {
              type: 'checkouts',
              attributes: {
                checkout_data: {
                  custom: {
                    user_id: dbUser.id.toString(), // Convert to string
                  },
                },
                product_options: {
                  redirect_url: redirectUrl,
                },
              },
              relationships: {
                store: {
                  data: {
                    type: 'stores',
                    id: this.configService.get('LEMONSQUEEZY_STORE_ID'),
                  },
                },
                variant: {
                  data: {
                    type: 'variants',
                    id: productId,
                  },
                },
              },
            },
          },
          {
            headers: {
              Authorization: `Bearer ${this.configService.get('LEMONSQUEEZY_API_KEY')}`,
              Accept: 'application/vnd.api+json',
              'Content-Type': 'application/vnd.api+json',
            },
          },
        ),
      );

      return response.data.data.attributes.url;
    } catch (error) {
      console.error(
        'Error creating checkout:',
        error.response?.data || error.message,
      );
      throw new HttpException(
        'Failed to create checkout',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async giveSubscription(
    email: string,
    durationInMonths: number,
  ): Promise<ResponseModel> {
    try {
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        return errorResponse('User not found');
      }

      const now = new Date();
      const endDate = new Date(now.setMonth(now.getMonth() + durationInMonths));

      const subscription = await this.prisma.subscription.upsert({
        where: { userId: user.id },
        update: {
          status: 'active',
          endDate,
          subscriptionLengthInMonths: durationInMonths,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          orderId: `COMP-${Date.now()}`, // Generate a unique order ID
          status: 'active',
          endDate,
          productName: 'Complimentary Subscription',
          variantName: `${durationInMonths} Month(s)`,
          subscriptionLengthInMonths: durationInMonths,
          totalAmount: 0,
          currency: 'USD',
        },
      });

      await this.prisma.user.update({
        where: { id: user.id },
        data: { is_subscribed: 1 },
      });

      return successResponse('Subscription given successfully', {
        subscription,
      });
    } catch (error) {
      console.error('Error giving subscription:', error);
      return errorResponse('Failed to give subscription');
    }
  }

  async getAllSubscriptions(): Promise<ResponseModel> {
    const subscriptions = await this.prisma.subscription.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        user: true,
      },
    });
    return successResponse(
      'All subscriptions retrieved successfully',
      subscriptions,
    );
  }
}
