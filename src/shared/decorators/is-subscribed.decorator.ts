import { SetMetadata } from '@nestjs/common';

export const IS_SUBSCRIBED_KEY = 'isSubscribed';

export const IsSubscribed = () => SetMetadata(IS_SUBSCRIBED_KEY, true); 