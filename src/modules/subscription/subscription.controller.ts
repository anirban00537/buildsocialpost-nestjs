import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UserInfo } from 'src/shared/decorators/user.decorators';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}
  @UseGuards(JwtAuthGuard)
  @Get('check-subscription')
  async checkSubscription(@UserInfo() user: User) {
    return this.subscriptionService.checkSubscription(user);
  }

  @Post('create-checkout')
  @UseGuards(JwtAuthGuard)
  async createCheckout(
    @UserInfo() user: User,
    @Body() body: { productId: string; redirectUrl: string },
  ) {
    const checkoutUrl = await this.subscriptionService.createCheckout(
      user,
      body.productId,
      body.redirectUrl,
    );
    return { checkoutUrl };
  }
}
