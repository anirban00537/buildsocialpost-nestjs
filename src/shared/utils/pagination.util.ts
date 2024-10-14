import { PrismaService } from '../../modules/prisma/prisma.service';

export interface PaginationOptions {
  page?: number;
  pageSize?: number;
  orderBy?: { [key: string]: 'asc' | 'desc' };
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    currentPage: number;
    pageSize: number;
    totalCount: number;
    totalPages: number;
  };
}

export async function paginatedQuery<T>(
  prisma: PrismaService,
  model: any,
  where: any,
  options: PaginationOptions = {}
): Promise<PaginatedResult<T>> {
  const { page = 1, pageSize = 10, orderBy = { createdAt: 'desc' } } = options;
  const skip = (page - 1) * pageSize;

  const [items, totalCount] = await Promise.all([
    prisma[model].findMany({
      where,
      skip,
      take: pageSize,
      orderBy,
    }),
    prisma[model].count({ where }),
  ]);

  const totalPages = Math.ceil(totalCount / pageSize);

  return {
    items,
    pagination: {
      currentPage: page,
      pageSize,
      totalCount,
      totalPages,
    },
  };
}
