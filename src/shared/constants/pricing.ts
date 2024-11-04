export type PlanId = 'starter' | 'pro';

export interface PricingPlan {
  id: PlanId;
  name: string;
  description: string;
  price: number;
  limits: {
    aiWordsPerMonth: number;
  };
  features: string[];
  variants: {
    monthly: string;
    yearly: string;
  };
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for getting started',
    price: 9,
    limits: {
      aiWordsPerMonth: 10000,
    },
    features: [
      'Up to 10,000 words per month',
      'Basic features',
    ],
    variants: {
      monthly: '525061',
      yearly: '525062'
    }
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For power users',
    price: 29,
    limits: {
      aiWordsPerMonth: 50000,
    },
    features: [
      'Up to 50,000 words per month',
      'Advanced features',
    ],
    variants: {
      monthly: '585057',
      yearly: '585058'
    }
  }
];

export const getPlanByVariantId = (variantId: string): PlanId | null => {
  const plan = PRICING_PLANS.find(
    (plan) => plan.variants.monthly === variantId || plan.variants.yearly === variantId
  );
  return plan?.id || null;
};

export const getVariantId = (planId: PlanId): string | null => {
  const plan = PRICING_PLANS.find(p => p.id === planId);
  return plan?.variants.monthly || null;
};

export const getPlanById = (planId: PlanId): PricingPlan | null => {
  return PRICING_PLANS.find(p => p.id === planId) || null;
};
