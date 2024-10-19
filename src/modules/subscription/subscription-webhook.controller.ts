import {
  Controller,
  Post,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Public } from 'src/shared/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { SubscriptionService } from './subscription.service';
import { LemonSqueezyRequest } from './lemon-squeezy-request.decorator';

@Controller('subscription/webhook')
export class SubscriptionWebhookController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(@LemonSqueezyRequest() evt: any) {
    try {
      console.log('Webhook endpoint hit');
      console.log('Event type:', evt.meta.event_name);
      console.log('Request body:', JSON.stringify(evt, null, 2));

      // Process the webhook based on the event type
      if (evt.meta.event_name === 'order_created') {
        await this.handleOrderCreated(evt);
      } else {
        console.log(`Unhandled event type: ${evt.meta.event_name}`);
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

  private async handleOrderCreated(evt: any) {
    console.log('Entering handleOrderCreated method');
    const userId = evt.meta.custom_data.user_id;
    const isSuccessful = evt.data.attributes.status === 'paid';
    const orderCreatedAt = new Date(evt.data.attributes.created_at);

    const firstOrderItem = evt.data.attributes.first_order_item;
    const variantName = firstOrderItem.variant_name.toLowerCase();

    // Determine subscription length
    let subscriptionLengthInMonths = 1; // Default to monthly
    if (variantName.includes('yearly') || variantName.includes('annual')) {
      subscriptionLengthInMonths = 12;
    } else if (variantName.includes('monthly')) {
      subscriptionLengthInMonths = 1;
    } else {
      console.warn(
        `Unrecognized subscription length for variant: ${variantName}`,
      );
    }

    // Set end date based on subscription length
    const endDate = new Date(orderCreatedAt);
    endDate.setMonth(endDate.getMonth() + subscriptionLengthInMonths);

    const subscriptionData = {
      userId,
      orderId: evt.data.id,
      status: isSuccessful ? 'active' : 'pending',
      endDate: endDate,
      createdAt: orderCreatedAt,
      productName: firstOrderItem.product_name,
      variantName: firstOrderItem.variant_name,
      subscriptionLengthInMonths,
      totalAmount: parseFloat(evt.data.attributes.total),
      currency: evt.data.attributes.currency,
    };

    console.log('Creating subscription with data:', subscriptionData);
    await this.subscriptionService.createSubscription(subscriptionData);
    console.log('Subscription created successfully');
  }
}
