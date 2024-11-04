// Define specific types for limits
type NumericLimit = number;  // -1 for unlimited, positive number for limit
type BooleanLimit = boolean; // true/false for feature availability

interface PlanLimits {
  linkedInProfiles: NumericLimit;
  workspaces: NumericLimit;
  postsPerMonth: NumericLimit;
  aiWordsPerMonth: NumericLimit;
  carouselsPerMonth: NumericLimit;
  scheduledPosts: BooleanLimit;
  fileUploads: BooleanLimit;
  videoUploads: BooleanLimit;
  documentUploads: BooleanLimit;
  customBranding: BooleanLimit;
}

interface PricingPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  features: string[];
  limits: PlanLimits;
}

export const PRICING_PLANS: PricingPlan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'Perfect for individual creators',
    price: 9,
    currency: 'USD',
    billingPeriod: 'month',
    features: [
      '1 LinkedIn Profile',
      '1 Workspace',
      'Unlimited posts',
      '50,000 AI words per month',
      'Basic scheduling',
      'Image posts',
      'Carousel posts',
      'Basic analytics',
      'Email support'
    ],
    limits: {
      linkedInProfiles: 1,
      workspaces: 1,
      postsPerMonth: -1, // unlimited
      aiWordsPerMonth: 50000,
      carouselsPerMonth: -1, // unlimited
      scheduledPosts: true,
      fileUploads: true,
      videoUploads: false,
      documentUploads: false,
      customBranding: false,
    }
  },
  {
    id: 'pro',
    name: 'Professional',
    description: 'Best for growing creators and teams',
    price: 19,
    currency: 'USD',
    billingPeriod: 'month',
    features: [
      '3 LinkedIn Profiles',
      '3 Workspaces',
      'Unlimited posts',
      '100,000 AI words per month',
      'Advanced scheduling',
      'Image & carousel posts',
      'Document uploads',
      'Video uploads',
      'Custom branding',
      'Advanced analytics',
      'Priority support'
    ],
    limits: {
      linkedInProfiles: 3,
      workspaces: 3,
      postsPerMonth: -1, // unlimited
      aiWordsPerMonth: 100000,
      carouselsPerMonth: -1, // unlimited
      scheduledPosts: true,
      fileUploads: true,
      videoUploads: true,
      documentUploads: true,
      customBranding: true,
    }
  }
];

export type PlanId = 'starter' | 'pro';

// Helper function to get plan by ID
export const getPlanById = (planId: PlanId): PricingPlan | undefined => {
  return PRICING_PLANS.find(plan => plan.id === planId);
};

// Type guard to check if a limit is numeric
const isNumericLimit = (limit: NumericLimit | BooleanLimit): limit is NumericLimit => {
  return typeof limit === 'number';
};

// Type guard to check if a limit is boolean
const isBooleanLimit = (limit: NumericLimit | BooleanLimit): limit is BooleanLimit => {
  return typeof limit === 'boolean';
};

// Helper function to check if a feature is available in a plan
export const isPlanFeatureAvailable = (planId: PlanId, feature: keyof PlanLimits): boolean => {
  const plan = getPlanById(planId);
  if (!plan) return false;

  const limit = plan.limits[feature];

  if (isBooleanLimit(limit)) {
    return limit;
  }

  if (isNumericLimit(limit)) {
    return limit === -1 || limit > 0;
  }

  return false;
};

// Helper function to get feature limit
export const getPlanFeatureLimit = (planId: PlanId, feature: keyof PlanLimits): number => {
  const plan = getPlanById(planId);
  if (!plan) return 0;

  const limit = plan.limits[feature];

  if (isNumericLimit(limit)) {
    return limit;
  }

  return 0;
};

// Helper function to check if a feature has unlimited usage
export const isUnlimitedFeature = (planId: PlanId, feature: keyof PlanLimits): boolean => {
  const plan = getPlanById(planId);
  if (!plan) return false;

  const limit = plan.limits[feature];
  return isNumericLimit(limit) && limit === -1;
};

// Helper function to check if a boolean feature is enabled
export const isBooleanFeatureEnabled = (planId: PlanId, feature: keyof PlanLimits): boolean => {
  const plan = getPlanById(planId);
  if (!plan) return false;

  const limit = plan.limits[feature];
  return isBooleanLimit(limit) && limit === true;
};
