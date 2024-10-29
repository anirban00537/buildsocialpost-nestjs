import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { errorResponse, successResponse } from 'src/shared/helpers/functions';
import { ResponseModel } from 'src/shared/models/response.model';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

@Injectable()
export class LemonSqueezyService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.lemonsqueezy.com/v1';

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get('LEMON_SQUEEZY_API_KEY');
  }

  private get headers() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.apiKey}`
    };
  }

  /**
   * Creates a checkout session
   * @see https://docs.lemonsqueezy.com/api/checkouts#create-a-checkout
   */
  async createCheckout(params: {
    email: string;
    name: string;
    variantId: string;
    storeId: string;
    customData?: any;
    customPrice?: number;
  }): Promise<ResponseModel> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/checkouts`,
        {
          data: {
            type: 'checkouts',
            attributes: {
              store_id: params.storeId,
              variant_id: params.variantId,
              custom_price: params.customPrice || 0,
              checkout_data: {
                email: params.email,
                name: params.name,
                billing_address: {
                  country: '',
                  zip: ''
                },
                custom: params.customData
              }
            }
          }
        },
        { headers: this.headers }
      );
      return successResponse('Checkout created successfully', response.data);
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to create checkout', error),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Gets a specific subscription
   * @see https://docs.lemonsqueezy.com/api/subscriptions#retrieve-a-subscription
   */
  async getSubscription(subscriptionId: string): Promise<ResponseModel> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        { headers: this.headers }
      );
      return successResponse('Subscription retrieved successfully', response.data);
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to get subscription', error),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Lists all subscriptions
   * @see https://docs.lemonsqueezy.com/api/subscriptions#list-all-subscriptions
   */
  async listSubscriptions(page?: number): Promise<ResponseModel> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/subscriptions`,
        { 
          headers: this.headers,
          params: { page }
        }
      );
      return successResponse('Subscriptions retrieved successfully', response.data);
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to list subscriptions', error),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Updates a subscription
   * @see https://docs.lemonsqueezy.com/api/subscriptions#update-a-subscription
   */
  async updateSubscription(subscriptionId: string, updateData: any): Promise<ResponseModel> {
    try {
      const response = await axios.patch(
        `${this.baseUrl}/subscriptions/${subscriptionId}`,
        {
          data: {
            type: 'subscriptions',
            id: subscriptionId,
            attributes: updateData
          }
        },
        { headers: this.headers }
      );
      return successResponse('Subscription updated successfully', response.data);
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to update subscription', error),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Gets a specific product
   * @see https://docs.lemonsqueezy.com/api/products#retrieve-a-product
   */
  async getProduct(productId: string): Promise<ResponseModel> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/products/${productId}`,
        { headers: this.headers }
      );
      return successResponse('Product retrieved successfully', response.data);
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to get product', error),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Lists all products
   * @see https://docs.lemonsqueezy.com/api/products#list-all-products
   */
  async listProducts(): Promise<ResponseModel> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/products`,
        { headers: this.headers }
      );
      return successResponse('Products retrieved successfully', response.data);
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to list products', error),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Gets a specific variant
   * @see https://docs.lemonsqueezy.com/api/variants#retrieve-a-variant
   */
  async getVariant(variantId: string): Promise<ResponseModel> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/variants/${variantId}`,
        { headers: this.headers }
      );
      return successResponse('Variant retrieved successfully', response.data);
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to get variant', error),
        HttpStatus.BAD_REQUEST
      );
    }
  }

  /**
   * Handles incoming webhooks from Lemon Squeezy
   * 
   * @description Processes webhook events for:
   * - Subscription created/updated/cancelled
   * - Order created
   * - Payment succeeded/failed
   * 
   * Updates local database accordingly
   * 
   * @param payload - The webhook payload from Lemon Squeezy
   */
  async handleWebhook(payload: any): Promise<ResponseModel> {
    try {
      const eventName = payload.meta.event_name;

      switch (eventName) {
        case 'subscription_created':
          await this.handleSubscriptionCreated(payload);
          break;
        case 'subscription_updated':
          await this.handleSubscriptionUpdated(payload);
          break;
        case 'subscription_cancelled':
          await this.handleSubscriptionCancelled(payload);
          break;
        case 'order_created':
          await this.handleOrderCreated(payload);
          break;
        // Add more webhook handlers as needed
      }

      return successResponse('Webhook handled successfully');
    } catch (error) {
      throw new HttpException(
        errorResponse('Failed to handle webhook', error),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Handles subscription creation webhook
   * 
   * @description When a new subscription is created:
   * 1. Creates subscription record in database
   * 2. Updates user's subscription status
   * 3. Records subscription details (product, variant, price)
   * 
   * @param payload - The webhook payload containing subscription data
   */
  private async handleSubscriptionCreated(payload: any): Promise<void> {
    const orderData = payload.data.attributes;
    const productData = payload.included.find(
      (item) => item.type === 'products',
    );
    const variantData = payload.included.find(
      (item) => item.type === 'variants',
    );

    await this.prisma.subscription.create({
      data: {
        userId: parseInt(orderData.custom_data?.userId || '0'),
        orderId: orderData.order_id,
        status: orderData.status,
        endDate: new Date(orderData.ends_at),
        productName: productData?.attributes?.name || '',
        variantName: variantData?.attributes?.name || '',
        subscriptionLengthInMonths: this.getSubscriptionLength(
          variantData?.attributes?.interval,
        ),
        totalAmount: parseFloat(orderData.total_formatted) || 0,
        currency: orderData.currency,
      },
    });

    // Update user subscription status
    if (orderData.custom_data?.userId) {
      await this.prisma.user.update({
        where: { id: parseInt(orderData.custom_data.userId) },
        data: { is_subscribed: 1 },
      });
    }
  }

  /**
   * Handles subscription update webhook
   * 
   * @description Updates local subscription record when changes occur:
   * - Status changes
   * - Plan changes
   * - Billing cycle updates
   * 
   * @param payload - The webhook payload containing updated subscription data
   */
  private async handleSubscriptionUpdated(payload: any): Promise<void> {
    const orderData = payload.data.attributes;

    await this.prisma.subscription.update({
      where: { orderId: orderData.order_id },
      data: {
        status: orderData.status,
        endDate: new Date(orderData.ends_at),
      },
    });
  }

  /**
   * Handles subscription cancellation webhook
   * 
   * @description When a subscription is cancelled:
   * 1. Updates subscription status to cancelled
   * 2. Updates end date
   * 3. Updates user's subscription status
   * 
   * @param payload - The webhook payload containing cancellation data
   */
  private async handleSubscriptionCancelled(payload: any): Promise<void> {
    const orderData = payload.data.attributes;

    await this.prisma.subscription.update({
      where: { orderId: orderData.order_id },
      data: {
        status: 'cancelled',
        endDate: new Date(orderData.ends_at),
      },
    });

    // Update user subscription status
    const subscription = await this.prisma.subscription.findUnique({
      where: { orderId: orderData.order_id },
      select: { userId: true },
    });

    if (subscription) {
      await this.prisma.user.update({
        where: { id: subscription.userId },
        data: { is_subscribed: 0 },
      });
    }
  }

  /**
   * Handles order creation webhook
   * 
   * @description When a new order is created:
   * 1. Creates subscription if it's a subscription product
   * 2. Records order details
   * 3. Updates user's subscription status
   * 
   * @param payload - The webhook payload containing order data
   */
  private async handleOrderCreated(payload: any): Promise<void> {
    const orderData = payload.data.attributes;
    const productData = payload.included.find(
      (item) => item.type === 'products',
    );
    const variantData = payload.included.find(
      (item) => item.type === 'variants',
    );

    // Only create subscription for subscription products
    if (variantData?.attributes?.interval) {
      await this.prisma.subscription.create({
        data: {
          userId: parseInt(orderData.custom_data?.userId || '0'),
          orderId: orderData.order_id,
          status: 'active',
          endDate: new Date(
            orderData.ends_at ||
              this.calculateEndDate(variantData.attributes.interval),
          ),
          productName: productData?.attributes?.name || '',
          variantName: variantData?.attributes?.name || '',
          subscriptionLengthInMonths: this.getSubscriptionLength(
            variantData.attributes.interval,
          ),
          totalAmount: parseFloat(orderData.total_formatted) || 0,
          currency: orderData.currency,
        },
      });

      // Update user subscription status
      if (orderData.custom_data?.userId) {
        await this.prisma.user.update({
          where: { id: parseInt(orderData.custom_data.userId) },
          data: { is_subscribed: 1 },
        });
      }
    }
  }

  /**
   * Helper method to calculate subscription length in months
   * 
   * @description Converts subscription interval to months:
   * - month -> 1
   * - year -> 12
   * - quarterly -> 3
   * 
   * @param interval - The subscription interval (month/year/quarterly)
   */
  private getSubscriptionLength(interval: string): number {
    switch (interval) {
      case 'month':
        return 1;
      case 'year':
        return 12;
      case 'quarterly':
        return 3;
      default:
        return 0;
    }
  }

  /**
   * Helper method to calculate subscription end date
   * 
   * @description Calculates when subscription will end based on interval:
   * - month: current date + 1 month
   * - year: current date + 1 year
   * - quarterly: current date + 3 months
   * 
   * @param interval - The subscription interval (month/year/quarterly)
   */
  private calculateEndDate(interval: string): Date {
    const now = new Date();
    switch (interval) {
      case 'month':
        return new Date(now.setMonth(now.getMonth() + 1));
      case 'year':
        return new Date(now.setFullYear(now.getFullYear() + 1));
      case 'quarterly':
        return new Date(now.setMonth(now.getMonth() + 3));
      default:
        return now;
    }
  }
}
