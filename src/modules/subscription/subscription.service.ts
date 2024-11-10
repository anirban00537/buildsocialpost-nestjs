import {
  Injectable,
  Logger,
  NotFoundException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import {
  PRICING_PLANS,
  PlanId,
  getVariantId,
  getPlanByVariantId,
  getPlanById,
} from 'src/shared/constants/pricing';
import { successResponse, errorResponse } from 'src/shared/helpers/functions';
import { ResponseModel } from 'src/shared/models/response.model';
import axios from 'axios';
import { WordLimitUpdate } from './types/subscription';

@Injectable()
export class SubscriptionService {
  private readonly logger = new Logger(SubscriptionService.name);
  private readonly apiKey: string;
  private readonly storeId: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('LEMONSQUEEZY_API_KEY');
    this.storeId = this.configService.get<string>('LEMONSQUEEZY_STORE_ID');

    if (!this.apiKey) {
      this.logger.error('LEMONSQUEEZY_API_KEY is not configured');
    }
    if (!this.storeId) {
      this.logger.error('LEMONSQUEEZY_STORE_ID is not configured');
    }
  }

  async checkSubscription(user: User) {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId: user.id },
      });

      // Get word usage data regardless of subscription status
      const wordUsage = await this.prisma.aIWordUsage.findUnique({
        where: { userId: user.id },
        select: {
          totalWordLimit: true,
          wordsGenerated: true,
          expirationTime: true,
        },
      });

      const now = new Date();
      const isActive = subscription?.status === 'active' && subscription?.endDate > now;

      // Format token data
      const tokenData = wordUsage ? {
        totalTokens: wordUsage.totalWordLimit,
        usedTokens: wordUsage.wordsGenerated,
        remainingTokens: wordUsage.totalWordLimit - wordUsage.wordsGenerated,
        tokenExpirationDate: wordUsage.expirationTime,
        isTokenActive: wordUsage.expirationTime > now,
      } : {
        totalTokens: 0,
        usedTokens: 0,
        remainingTokens: 0,
        tokenExpirationDate: null,
        isTokenActive: false,
      };

      return {
        isSubscribed: isActive,
        plan: isActive ? subscription.planId : null,
        expiresAt: subscription?.endDate || null,
        subscription: subscription ? {
          status: subscription.status,
          productName: subscription.productName,
          variantName: subscription.variantName,
        } : null,
        tokens: tokenData,
      };
    } catch (error) {
      this.logger.error('Error checking subscription:', error);
      console.log(error, 'error');
      throw error;
    }
  }

  async checkSubscriptionResponse(user: User) {
    try {
      const subscriptionStatus = await this.checkSubscription(user);
      const plan_id = subscriptionStatus.plan;
      const plan = PRICING_PLANS.find((p) => p.id === plan_id);
      const limits = plan?.limits;
      const userWordUsage = await this.getWordUsageData(user.id);

      return successResponse('Subscription checked successfully', {
        ...subscriptionStatus,
        limits,
        userWordUsage: userWordUsage,
      });
    } catch (error) {
      this.logger.error('Error checking subscription:', error);
      return errorResponse(`Failed to check subscription: ${error.message}`);
    }
  }

  async createCheckout(user: User, variantId: string, redirectUrl: string) {
    let planId: PlanId | null = null;
    let plan: any = null;

    try {
      if (!this.apiKey) {
        throw new Error('Lemon Squeezy API key is not configured');
      }

      const tempPlanId = getPlanByVariantId(variantId);
      if (!tempPlanId || !['starter', 'pro'].includes(tempPlanId)) {
        throw new Error('Invalid variant ID');
      }
      planId = tempPlanId as PlanId;

      plan = getPlanById(planId);
      if (!plan) {
        throw new Error('Invalid plan');
      }

      const payload = {
        data: {
          type: 'checkouts',
          attributes: {
            checkout_data: {
              custom: {
                user_id: user.id.toString(),
                plan_id: planId,
              },
            },
            product_options: {
              redirect_url: redirectUrl,
              receipt_button_text: 'Return to Dashboard',
              receipt_link_url: redirectUrl,
            },
          },
          relationships: {
            store: {
              data: {
                type: 'stores',
                id: this.storeId,
              },
            },
            variant: {
              data: {
                type: 'variants',
                id: variantId,
              },
            },
          },
        },
      };

      this.logger.debug('Creating checkout with payload:', payload);

      const checkoutResponse = await axios.post(
        'https://api.lemonsqueezy.com/v1/checkouts',
        payload,
        {
          headers: {
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json',
            Authorization: `Bearer ${this.apiKey}`,
          },
        },
      );

      this.logger.debug('Checkout created successfully');
      return checkoutResponse.data.data.attributes.url;
    } catch (error) {
      console.log('Request Payload:', {
        storeId: this.storeId,
        variantId,
        userId: user.id,
      });

      if (error.response) {
        console.log('Error Response Data:', error.response.data);
        console.log('Error Response Status:', error.response.status);
        console.log('Error Response Headers:', error.response.headers);
      }

      this.logger.error(
        'Error creating checkout:',
        error.response?.data || error,
      );
      throw new HttpException(
        `Failed to create checkout: ${error.response?.data?.errors?.[0]?.detail || error.message}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async createSubscription(data: {
    userId: number;
    orderId: string;
    status: string;
    planId: PlanId;
    endDate: Date;
    createdAt: Date;
    productName: string;
    variantName: string;
    subscriptionLengthInMonths: number;
    totalAmount: number;
    currency: string;
  }) {
    try {
      this.logger.debug('Creating subscription with data:', data);

      // Validate planId
      const plan = PRICING_PLANS.find((p) => p.id === data.planId);
      if (!plan) {
        throw new Error(`Invalid plan variant: ${data.planId}`);
      }

      // Create the subscription
      const subscription = await this.prisma.subscription.create({
        data: {
          userId: data.userId,
          orderId: data.orderId,
          status: data.status,
          planId: data.planId,
          endDate: data.endDate,
          createdAt: data.createdAt,
          productName: data.productName,
          variantName: data.variantName,
          subscriptionLengthInMonths: data.subscriptionLengthInMonths,
          totalAmount: data.totalAmount,
          currency: data.currency,
        },
      });

      // Update user's word usage limits based on the plan
      await this.prisma.aIWordUsage.upsert({
        where: { userId: data.userId },
        create: {
          userId: data.userId,
          totalWordLimit: plan.limits.aiWordsPerMonth,
          wordsGenerated: 0,
          expirationTime: data.endDate,
        },
        update: {
          totalWordLimit: plan.limits.aiWordsPerMonth,
          expirationTime: data.endDate,
        },
      });

      this.logger.debug('Subscription created successfully:', subscription);
      return subscription;
    } catch (error) {
      this.logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  async giveSubscription(
    email: string,
    durationInMonths: number,
  ): Promise<ResponseModel> {
    try {
      // Find the user
      const user = await this.prisma.user.findUnique({
        where: { email },
      });

      if (!user) {
        return errorResponse('User not found');
      }

      const now = new Date();
      const endDate = new Date(now);
      endDate.setMonth(endDate.getMonth() + durationInMonths);

      // Create or update subscription
      const subscription = await this.prisma.subscription.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          orderId: `ADMIN_GIVEN_${Date.now()}`,
          status: 'active',
          planId: 'pro',
          endDate,
          productName: 'Pro Plan',
          variantName: 'Pro Monthly',
          subscriptionLengthInMonths: durationInMonths,
          totalAmount: 0, // Free subscription
          currency: 'USD',
        },
        update: {
          status: 'active',
          planId: 'pro',
          endDate,
          subscriptionLengthInMonths: durationInMonths,
        },
      });

      // Initialize or update AI word usage
      await this.prisma.aIWordUsage.upsert({
        where: { userId: user.id },
        create: {
          userId: user.id,
          totalWordLimit:
            PRICING_PLANS.find((p) => p.id === 'pro')?.limits.aiWordsPerMonth ||
            0,
          wordsGenerated: 0,
          expirationTime: endDate,
        },
        update: {
          totalWordLimit:
            PRICING_PLANS.find((p) => p.id === 'pro')?.limits.aiWordsPerMonth ||
            0,
          expirationTime: endDate,
        },
      });

      this.logger.log(
        `Admin gave subscription to user ${user.email} for ${durationInMonths} months`,
      );

      return successResponse('Subscription given successfully', {
        subscription,
        user: {
          id: user.id,
          email: user.email,
        },
      });
    } catch (error) {
      this.logger.error('Error giving subscription:', error);
      return errorResponse(`Failed to give subscription: ${error.message}`);
    }
  }

  async getAllSubscriptions(): Promise<ResponseModel> {
    try {
      const subscriptions = await this.prisma.subscription.findMany({
        include: {
          user: {
            select: {
              id: true,
              email: true,
              first_name: true,
              last_name: true,
              user_name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const formattedSubscriptions = subscriptions.map((sub) => ({
        id: sub.id,
        status: sub.status,
        endDate: sub.endDate,
        createdAt: sub.createdAt,
        productName: sub.productName,
        variantName: sub.variantName,
        subscriptionLengthInMonths: sub.subscriptionLengthInMonths,
        totalAmount: sub.totalAmount,
        currency: sub.currency,
        user: sub.user,
        isActive: sub.status === 'active' && sub.endDate > new Date(),
        daysRemaining: Math.ceil(
          (sub.endDate.getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      }));

      return successResponse('Subscriptions retrieved successfully', {
        subscriptions: formattedSubscriptions,
        total: formattedSubscriptions.length,
        activeSubscriptions: formattedSubscriptions.filter((s) => s.isActive)
          .length,
      });
    } catch (error) {
      this.logger.error('Error getting all subscriptions:', error);
      return errorResponse(`Failed to get subscriptions: ${error.message}`);
    }
  }

  // Helper method to cancel a subscription (if needed)
  async cancelSubscription(userId: number): Promise<ResponseModel> {
    try {
      const subscription = await this.prisma.subscription.findUnique({
        where: { userId },
      });

      if (!subscription) {
        return errorResponse('No active subscription found');
      }

      await this.prisma.subscription.update({
        where: { userId },
        data: {
          status: 'cancelled',
        },
      });

      return successResponse('Subscription cancelled successfully');
    } catch (error) {
      this.logger.error('Error cancelling subscription:', error);
      return errorResponse(`Failed to cancel subscription: ${error.message}`);
    }
  }
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

  async updateWordUsageLimit({
    userId,
    newWordLimit,
    expirationTime,
  }: WordLimitUpdate) {
    try {
      this.logger.debug('Updating word usage limit:', {
        userId,
        newWordLimit,
        expirationTime,
      });

      const existingAIWordUsage = await this.prisma.aIWordUsage.findUnique({
        where: { userId },
      });

      let finalWordLimit = newWordLimit;
      const now = new Date();

      // Check if user has existing words and valid expiration
      if (existingAIWordUsage) {
        const currentExpirationTime = new Date(
          existingAIWordUsage.expirationTime,
        );

        // If expiration is in the future, add existing limit to new limit
        if (currentExpirationTime > now) {
          this.logger.debug('Accumulating word limit:', {
            existing: existingAIWordUsage.totalWordLimit,
            new: newWordLimit,
          });

          finalWordLimit += existingAIWordUsage.totalWordLimit;
        }
      }

      // Update or create AIWordUsage with accumulated limit
      const updatedUsage = await this.prisma.aIWordUsage.upsert({
        where: { userId },
        update: {
          totalWordLimit: finalWordLimit,
          expirationTime,
          // Only reset wordsGenerated if previous subscription expired
          ...(!existingAIWordUsage || existingAIWordUsage.expirationTime < now
            ? { wordsGenerated: 0 }
            : {}),
        },
        create: {
          userId,
          totalWordLimit: finalWordLimit,
          wordsGenerated: 0,
          expirationTime,
        },
      });

      this.logger.debug('Word usage limit updated:', updatedUsage);
      return updatedUsage;
    } catch (error) {
      this.logger.error('Error updating word usage limit:', error);
      throw new Error(`Failed to update word usage limit: ${error.message}`);
    }
  }
}
