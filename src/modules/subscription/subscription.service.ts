import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ResponseModel } from 'src/shared/models/response.model';
import { errorResponse, successResponse } from 'src/shared/helpers/functions';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { lastValueFrom } from 'rxjs';
import { coreConstant } from 'src/shared/helpers/coreConstant';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  private async getWordUsageData(userId: number): Promise<any> {
    try {
      const now = new Date();
      const oneMonthFromNow = new Date();
      oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

      let wordUsage = await this.prisma.aIWordUsage.findUnique({
        where: { userId },
        select: {
          totalWordLimit: true,
          wordsGenerated: true,
          expirationTime: true,
        },
      });

      const used = wordUsage.wordsGenerated;
      const total = wordUsage.totalWordLimit;
      const remaining = total - used;
      const isActive = wordUsage.expirationTime > now;

      return {
        usage: {
          used,
          remaining,
          total,
          isActive,
          expirationDate: wordUsage.expirationTime,
        },
        percentage: {
          used: Math.round((used / total) * 100) || 0,
          remaining: Math.round((remaining / total) * 100) || 0,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting word usage data: ${error.message}`);
      return null;
    }
  }

  async checkSubscription(user: User): Promise<ResponseModel> {
    try {
      // Get subscription data
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const now = new Date();

      // Process subscription status
      let subscriptionData;
      if (!subscription) {
        subscriptionData = {
          isSubscribed: false,
          subscription: null,
          daysLeft: null,
        };
      } else {
        const endDate = new Date(subscription.endDate);
        const isActive = subscription.status === 'active' && endDate > now;

        if (isActive) {
          const daysLeft = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 3600 * 24),
          );
          subscriptionData = { isSubscribed: true, subscription, daysLeft };
        } else {
          await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: coreConstant.SUBSCRIPTION_STATUS_EXPIRED },
          });
          subscriptionData = { isSubscribed: false, subscription, daysLeft: 0 };
        }
      }

      // Get word usage data
      const wordUsageData = await this.getWordUsageData(user.id);

      return successResponse(
        'Subscription and usage status retrieved successfully',
        {
          subscription: subscriptionData,
          wordUsage: wordUsageData,
        },
      );
    } catch (error) {
      console.error('Error in checkSubscription:', error);
      return errorResponse('Error retrieving subscription and usage status');
    }
  }

  async isSubscribed(user: User): Promise<boolean> {
    try {
      const subscription = await this.prisma.subscription.findFirst({
        where: {
          userId: user.id,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      if (!subscription) {
        return false;
      }
      const now = new Date();
      const endDate = new Date(subscription.endDate);
      const isActive =
        subscription.status === coreConstant.SUBSCRIPTION_STATUS_ACTIVE &&
        endDate > now;
      return isActive;
    } catch (error) {
      return false;
    }
  }

  async getActiveSubscribers(): Promise<number> {
    const now = new Date();
    const activeSubscribers = await this.prisma.subscription.count({
      where: {
        status: coreConstant.SUBSCRIPTION_STATUS_ACTIVE,
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
        status: coreConstant.SUBSCRIPTION_STATUS_ACTIVE,
        endDate: {
          lte: now,
        },
      },
      data: {
        status: coreConstant.SUBSCRIPTION_STATUS_EXPIRED,
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
    console.log('Creating subscription with data:', subscriptionData);

    try {
      const result = await this.prisma.subscription.create({
        data: subscriptionData,
      });
      console.log('Subscription created successfully:', result);

      await this.prisma.user.update({
        where: { id: subscriptionData.userId },
        data: { is_subscribed: 1 },
      });
      console.log('User subscription status updated');
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
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
                    user_id: dbUser.id.toString(),
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
          status: coreConstant.SUBSCRIPTION_STATUS_ACTIVE,
          endDate,
          subscriptionLengthInMonths: durationInMonths,
          updatedAt: new Date(),
        },
        create: {
          userId: user.id,
          orderId: `COMP-${Date.now()}`,
          status: coreConstant.SUBSCRIPTION_STATUS_ACTIVE,
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
