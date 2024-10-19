import {
  Controller,
  Post,
  Req,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { Public } from 'src/shared/decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { SubscriptionService } from './subscription.service';
import getRawBody from 'raw-body';

@Controller('subscription/webhook')
export class SubscriptionWebhookController {
  constructor(
    private readonly subscriptionService: SubscriptionService,
    private readonly configService: ConfigService,
  ) {}

  @Public()
  @Post()
  async handleWebhook(
    @Req() req: Request,
    @Headers('X-Event-Name') eventType: string,
    @Headers('X-Signature') signature: string,
  ) {
    try {
      console.log('Webhook endpoint hit');
      console.log('Event type:', eventType);
      console.log('Signature:', signature);

      const rawBody = await getRawBody(req);
      const body = JSON.parse(rawBody.toString('utf8'));
      console.log('Request body:', JSON.stringify(body, null, 2));

      // Verify signature
      const secret = this.configService.get<string>('LEMONSQUEEZY_WEBHOOK_SIGNATURE') || '';
      const hmac = crypto.createHmac('sha256', secret);
      const digest = Buffer.from(hmac.update(rawBody).digest('hex'), 'utf8');
      const signatureBuffer = Buffer.from(signature || '', 'utf8');

      if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
        console.log('Signature verification failed');
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
      console.log('Signature verified successfully');

      // Logic based on event type
      if (eventType === 'order_created') {
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
    const isSuccessful = body.data.attributes.status === 'paid';
    const orderCreatedAt = new Date(body.data.attributes.created_at);
    
    const firstOrderItem = body.data.attributes.first_order_item;
    const variantName = firstOrderItem.variant_name.toLowerCase();
    
    // Determine subscription length
    let subscriptionLengthInMonths = 1; // Default to monthly
    if (variantName.includes('yearly') || variantName.includes('annual')) {
      subscriptionLengthInMonths = 12;
    } else if (variantName.includes('monthly')) {
      subscriptionLengthInMonths = 1;
    } else {
      console.warn(`Unrecognized subscription length for variant: ${variantName}`);
    }

    // Set end date based on subscription length
    const endDate = new Date(orderCreatedAt);
    endDate.setMonth(endDate.getMonth() + subscriptionLengthInMonths);

    const subscriptionData = {
      userId,
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

    console.log('Creating subscription with data:', subscriptionData);
    await this.subscriptionService.createSubscription(subscriptionData);
    console.log('Subscription created successfully');
  }
}
