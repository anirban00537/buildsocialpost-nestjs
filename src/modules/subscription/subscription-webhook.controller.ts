import {
  Controller,
  Post,
  Body,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Public } from 'src/shared/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SubscriptionService } from './subscription.service';

@Controller('subscription/webhook')
export class SubscriptionWebhookController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(
    @Body() body: any,
    @Headers('X-Event-Name') eventType: string,
    @Headers('X-Signature') signature: string,
  ) {
    console.log('Webhook endpoint hit');
    console.log('Event type:', eventType);
    console.log('Signature:', signature);
    console.log('Request body:', JSON.stringify(body, null, 2));

    try {
      const secret =
        this.configService.get<string>('LEMONSQUEEZY_WEBHOOK_SIGNATURE') || '';
      const hmac = crypto.createHmac('sha256', secret);
      const digest = Buffer.from(
        hmac.update(JSON.stringify(body)).digest('hex'),
        'utf8',
      );
      const signatureBuffer = Buffer.from(signature || '', 'utf8');

      if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
        console.log('Invalid signature');
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
      console.log('Signature verified successfully');

      if (eventType === 'order_created') {
        console.log('Handling order_created event');
        await this.handleOrderCreated(body);
      } else {
        console.log(`Unhandled event type: ${eventType}`);
      }

      console.log('Webhook processing completed');
      return { message: 'Webhook received' };
    } catch (err) {
      console.error('Error in handleWebhook:', err);
      throw new HttpException(
        err.message || 'Server error',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async handleOrderCreated(body: any) {
    console.log('Entering handleOrderCreated method');
    const userId = body.meta.custom_data.user_id;
    console.log('User ID:', userId);

    const isSuccessful = body.data.attributes.status === 'paid';
    console.log('Is successful:', isSuccessful);

    const orderCreatedAt = new Date(body.data.attributes.created_at);
    console.log('Order created at:', orderCreatedAt);

    const firstOrderItem = body.data.attributes.first_order_item;
    console.log('First order item:', firstOrderItem);

    const variantName = firstOrderItem.variant_name.toLowerCase();
    console.log('Variant name:', variantName);

    let subscriptionLengthInMonths = 1;
    if (variantName.includes('yearly') || variantName.includes('annual')) {
      subscriptionLengthInMonths = 12;
    } else if (variantName.includes('monthly')) {
      subscriptionLengthInMonths = 1;
    } else {
      console.warn(
        `Unrecognized subscription length for variant: ${variantName}`,
      );
    }
    console.log('Subscription length in months:', subscriptionLengthInMonths);

    const endDate = new Date(orderCreatedAt);
    endDate.setMonth(endDate.getMonth() + subscriptionLengthInMonths);
    console.log('End date:', endDate);

    const subscriptionData = {
      userId: parseInt(userId, 10),
      orderId: body.data.id,
      status: isSuccessful ? 'active' : 'pending',
      endDate: endDate,
      createdAt: orderCreatedAt,
      productName: firstOrderItem.product_name,
      variantName: firstOrderItem.variant_name,
      subscriptionLengthInMonths,
      totalAmount: parseFloat(body.data.attributes.total),
      currency: body.data.attributes.currency,
    };
    console.log('Subscription data:', subscriptionData);

    try {
      console.log('Creating subscription');
      await this.subscriptionService.createSubscription(subscriptionData);
      console.log('Subscription created successfully');
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }
}
