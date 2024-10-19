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
    console.log('Webhook receiveddddddddddddd', { eventType, signature });

    try {
      if (!eventType || !signature) {
        console.log('Invalid eventType or signature');
        throw new HttpException('Invalid eventType or signature', HttpStatus.UNAUTHORIZED);
      }

      console.log('Getting raw body');
      let rawBody;
      try {
        rawBody = await this.getRawBody(req);
        console.log('Raw body received, length:', rawBody.length);
        
        console.log('Parsing body');
        const body = JSON.parse(rawBody);
        console.log('Parsed body:', JSON.stringify(body, null, 2));

        if (eventType === 'order_created') {
          console.log('Handling order_created event');
          await this.handleOrderCreated(body);
          console.log('Order created event handled');
        } else {
          console.log(`Unhandled event type: ${eventType}`);
        }

        console.log('Webhook processing completed');
        return successResponse('Webhook received and processed', {
          eventType,
          body,
        });
      } catch (error) {
        console.error('Error getting or parsing raw body:', error);
        throw new HttpException('Failed to read or parse request body', HttpStatus.BAD_REQUEST);
      }
    } catch (err) {
      console.error('Error in handleWebhook:', err);
      throw new HttpException(
        err.message || 'Server error',
        err.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  private async getRawBody(req: Request): Promise<string> {
    console.log('Starting to read raw body as stream');
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      let totalLength = 0;

      req.on('data', (chunk: Buffer) => {
        chunks.push(chunk);
        totalLength += chunk.length;
        console.log(`Received chunk, total length so far: ${totalLength}`);
      });

      req.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf8');
        console.log(`Finished reading body, total length: ${body.length}`);
        console.log('Body content:', body);  // Log the entire body content
        resolve(body);
      });

      req.on('error', (err) => {
        console.error('Error reading body:', err);
        reject(err);
      });
    });
  }

  private verifySignature(payload: string, signature: string) {
    console.log('Verifying signature');
    const secret = process.env.NEXT_PUBLIC_LEMONSQUEEZY_WEBHOOK_SIGNATURE || '';
    console.log('Secret length:', secret.length);
    
    const hmac = crypto.createHmac('sha256', secret);
    const digest = Buffer.from(hmac.update(payload).digest('hex'), 'utf8');
    const signatureBuffer = Buffer.from(signature || '', 'utf8');

    console.log('Calculated signature:', digest.toString('hex'));
    console.log('Received signature:', signature);

    if (!crypto.timingSafeEqual(digest, signatureBuffer)) {
      console.log('Signature verification failed');
      throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
    }
    console.log('Signature verified successfully');
  }

  private async handleOrderCreated(body: any) {
    console.log('Handling order created event. Full body:', JSON.stringify(body, null, 2));

    try {
      const userId = body.meta.custom_data.user_id;
      console.log('Extracted userId:', userId);

      const isSuccessful = body.data.attributes.status === 'paid';
      console.log('Order status:', body.data.attributes.status, 'Is successful:', isSuccessful);

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
        console.warn(`Unrecognized subscription length for variant: ${variantName}`);
      }
      console.log('Calculated subscription length in months:', subscriptionLengthInMonths);

      const endDate = new Date(orderCreatedAt);
      endDate.setMonth(endDate.getMonth() + subscriptionLengthInMonths);
      console.log('Calculated end date:', endDate);

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
      console.log('Prepared subscription data:', subscriptionData);

      const result = await this.subscriptionService.createSubscription(subscriptionData);
      console.log('Subscription creation result:', result);

      return result;
    } catch (error) {
      console.error('Error in handleOrderCreated:', error);
      throw error;
    }
  }
}
