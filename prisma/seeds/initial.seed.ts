import { PrismaClient } from '@prisma/client';
import { coreConstant } from '../../src/shared/helpers/coreConstant';
import { hashedPassword } from '../../src/shared/helpers/functions';

export async function initialSeed(prisma: PrismaClient) {
  try {
    await prisma.user.createMany({
      data: [
        {
          email: 'admin@email.com',
          password: (
            await hashedPassword(coreConstant.COMMON_PASSWORD)
          ).toString(),
          first_name: 'Mr',
          last_name: 'Admin',
          user_name: 'admin',
          role: coreConstant.USER_ROLE_ADMIN,
          status: coreConstant.STATUS_ACTIVE,
          email_verified: coreConstant.IS_VERIFIED,
        },
        {
          email: 'user@email.com',
          password: (
            await hashedPassword(coreConstant.COMMON_PASSWORD)
          ).toString(),
          first_name: 'Mr',
          last_name: 'User',
          user_name: 'user', // Changed from 'admin' to 'user' for a regular user.
          role: coreConstant.USER_ROLE_USER,
          status: coreConstant.STATUS_ACTIVE,
          email_verified: coreConstant.IS_VERIFIED,
        },
      ],
      skipDuplicates: true,
    });

    console.log('Initial seed completed successfully.');
  } catch (error) {
    console.error('Error seeding the database:', error);
    throw error; // Rethrow the error for proper error handling higher up the call stack.
  }
}
