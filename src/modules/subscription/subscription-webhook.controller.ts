import {
  Controller,
  Post,
  Req,
  Headers,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionService } from './subscription.service';
import * as crypto from 'crypto';
import { Public } from 'src/shared/decorators/public.decorator';
import { successResponse } from 'src/shared/helpers/functions';

@Controller('subscription/webhook')
export class SubscriptionWebhookController {
  constructor(private readonly subscriptionService: SubscriptionService) {}
  @Public()
  @Post()
  async handleWebhook(
    @Req() req: Request,
    @Headers('X-Event-Name') eventType: string,
    @Headers('X-Signature') signature: string,
  ) {
    try {
      console.log('Webhook received', JSON.stringify(req.body, null, 2));
      console.log('Event type:', eventType);
      console.log('Signature:', signature);

      if (!eventType || !signature) {
        console.log('Invalid signature or event type');
        throw new HttpException('Invalid signature or event type', HttpStatus.UNAUTHORIZED);
      }

      const rawBody = await this.getRawBody(req);
      console.log('Raw body:', rawBody);

      try {
        this.verifySignature(rawBody, signature);
        console.log('Signature verified successfully');
      } catch (error) {
        console.error('Signature verification failed:', error);
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }

      const body = JSON.parse(rawBody);
      console.log('Parsed body:', JSON.stringify(body, null, 2));

      if (eventType === 'order_created') {
        console.log('Handling order_created event');
        try {
          await this.handleOrderCreated(body);
          console.log('Order created handled successfully');
        } catch (error) {
          console.error('Error handling order_created event:', error);
          throw new HttpException('Error handling order_created event', HttpStatus.INTERNAL_SERVER_ERROR);
        }
      } else {
        console.log(`Unhandled event type: ${eventType}`);
      }

      console.log('Webhook processing completed');
      return successResponse('Webhook received', {
        eventType,
        body,
      });
    } catch (err) {
      console.error('Error in handleWebhook:', err);
      throw new HttpException(
        err.message || 'Server error',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getRawBody(req: Request): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      req.on('data', (chunk) => {
        data += chunk;
      });
      req.on('end', () => {
        resolve(data);
      });
      req.on('error', reject);
    });
  }

  private verifySignature(payload: string, signature: string) {
    const secret = process.env.NEXT_PUBLIC_LEMONSQUEEZY_WEBHOOK_SIGNATURE || '';
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature || '', 'utf8');

    if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }
  }

  private async handleOrderCreated(body: any) {
    console.log('Entering handleOrderCreated method');
    console.log('handleOrderCreated called with body:', JSON.stringify(body, null, 2));
    const userId = body.meta.custom_data.user_id;
    const isSuccessful = body.data.attributes.status === 'paid';
    const orderCreatedAt = new Date(body.data.attributes.created_at);

    const firstOrderItem = body.data.attributes.first_order_item;
    const variantName = firstOrderItem.variant_name.toLowerCase();

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

    const endDate = new Date(orderCreatedAt);
    endDate.setMonth(endDate.getMonth() + subscriptionLengthInMonths);

    const subscriptionData = {
      userId: parseInt(userId),
      orderId: body.data.id,
      status: isSuccessful ? 'active' : 'pending',
      endDate,
      createdAt: orderCreatedAt,
      productName: firstOrderItem.product_name,
      variantName: firstOrderItem.variant_name,
      subscriptionLengthInMonths,
      totalAmount: parseFloat(body.data.attributes.total),
      currency: body.data.attributes.currency,
    };

    console.log('Creating subscription with data:', JSON.stringify(subscriptionData, null, 2));

    try {
      const result = await this.subscriptionService.createSubscription(subscriptionData);
      console.log('Subscription created successfully:', JSON.stringify(result, null, 2));
    } catch (error) {
      console.error('Error creating subscription:', error);
      throw error;
    }
  }
}
