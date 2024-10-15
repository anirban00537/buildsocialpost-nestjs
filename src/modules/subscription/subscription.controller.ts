import { Controller, Get } from '@nestjs/common';
import { SubscriptionService } from './subscription.service';
import { UserInfo } from 'src/shared/decorators/user.decorators';
import { User } from '../users/entities/user.entity';

@Controller('subscription')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) { }
  @Get("check-subscription")
  async checkSubscription(@UserInfo() user: User) {
    return this.subscriptionService.checkSubscription(user);
  }
}
