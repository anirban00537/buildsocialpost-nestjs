import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UserInfo } from 'src/shared/decorators/user.decorators';
import { User } from '../users/entities/user.entity';
import { JwtAuthGuard } from 'src/shared/guards/jwt-auth.guard';
import { RolesGuard } from 'src/shared/guards/roles.guard';
import { IsAdmin } from 'src/shared/decorators/is-admin.decorator';

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

  @Post('give-subscription')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @IsAdmin()
  async giveSubscription(
    @Body() body: { email: string; durationInMonths: number },
  ) {
    return this.subscriptionService.giveSubscription(
      body.email,
      body.durationInMonths,
    );
  }
}
