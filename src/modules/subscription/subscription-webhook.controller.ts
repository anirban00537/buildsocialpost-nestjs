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
      console.log('Webhook received', {
        eventType,
        signature,
      });
      if (!eventType || !signature) {
        throw new HttpException('Invalid signature', HttpStatus.UNAUTHORIZED);
      }
      const rawBody = await this.getRawBody(req);
      this.verifySignature(rawBody, signature);

      const body = JSON.parse(rawBody);

      if (eventType === 'order_created') {
        console.log('order_created', body);
        await this.handleOrderCreated(body);
      }
      console.log('Webhook received', {
        eventType,
        body,
      });
      return successResponse('Webhook received', {
        eventType,
        body,
      });
    } catch (err) {
      console.error(err);
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

    await this.subscriptionService.createSubscription({
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
    });
  }
}
