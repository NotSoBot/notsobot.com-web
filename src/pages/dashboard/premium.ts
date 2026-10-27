import { translate, type TranslationKey } from '@/i18n';
import { EntitlementProviders, UserPremiumTypes, type Entitlement } from '@/lib/api';
import { toDate } from '@/lib/utils';
import { isOwner } from '@/auth/permissions';


const LABELS: Record<number, TranslationKey> = {
  [UserPremiumTypes.NONE]: 'premium_type.free',
  [UserPremiumTypes.PREMIUM_FREE]: 'premium_type.complimentary',
  [UserPremiumTypes.PREMIUM]: 'premium_type.premium',
  [UserPremiumTypes.PREMIUM_PLUS]: 'premium_type.plus',
  [UserPremiumTypes.PREMIUM_PLUS_AI]: 'premium_type.plus_ai',
};


// Plus AI's perks, which complimentary premium and bot owners get too (the api's `has_premium_plus_ai`)
export function hasPremiumPlusAI(user: {flags: number, premium_type: number} | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return isOwner(user) || user.premium_type === UserPremiumTypes.PREMIUM_PLUS_AI || user.premium_type === UserPremiumTypes.PREMIUM_FREE;
}


// Plus's perks (the api's `has_premium_plus`), Plus AI includes them
export function hasPremiumPlus(user: {flags: number, premium_type: number} | null | undefined): boolean {
  if (!user) {
    return false;
  }
  return hasPremiumPlusAI(user) || user.premium_type === UserPremiumTypes.PREMIUM_PLUS;
}


export function premiumLabel(premiumType: number): string {
  return translate(LABELS[premiumType] ?? 'premium_type.free');
}


// the tiers an entitlement can give (PREMIUM_FREE has no sku, it's only ever set by hand)
export const ENTITLEMENT_TIERS: ReadonlyArray<{value: number, label: string}> = [
  {value: UserPremiumTypes.PREMIUM, label: premiumLabel(UserPremiumTypes.PREMIUM)},
  {value: UserPremiumTypes.PREMIUM_PLUS, label: premiumLabel(UserPremiumTypes.PREMIUM_PLUS)},
  {value: UserPremiumTypes.PREMIUM_PLUS_AI, label: premiumLabel(UserPremiumTypes.PREMIUM_PLUS_AI)},
];

export function entitlementTierLabel(entitlement: Entitlement): string {
  return (entitlement.premium_type === null) ? translate('premium_type.unknown_sku') : premiumLabel(entitlement.premium_type);
}


export const ENTITLEMENT_PROVIDERS: ReadonlyArray<{value: string, label: string}> = [
  {value: EntitlementProviders.DISCORD, label: 'Discord'},
  {value: EntitlementProviders.MANUAL, label: 'Staff grant'},
];

export function entitlementProviderLabel(provider: string): string {
  const key = (provider === EntitlementProviders.DISCORD) ? 'entitlement.discord' : (provider === EntitlementProviders.MANUAL) ? 'entitlement.manual' : null;
  return (key) ? translate(key) : provider;
}


export type EntitlementTone = 'neutral' | 'danger' | 'warning' | 'success' | 'brand';

// mirrors `Entitlement.is_valid` on the api, but says why one doesn't count
export function entitlementStatus(entitlement: Entitlement, now = Date.now()): {label: string, tone: EntitlementTone} {
  if (entitlement.active) {
    return {label: translate('entitlement.active'), tone: 'success'};
  }
  if (entitlement.deleted) {
    // manual grants are marked deleted when staff change or take away the premium
    return (entitlement.provider === EntitlementProviders.MANUAL) ? {label: translate('entitlement.removed'), tone: 'neutral'} : {label: translate('entitlement.cancelled'), tone: 'danger'};
  }
  if (entitlement.consumed) {
    return {label: translate('entitlement.used'), tone: 'neutral'};
  }
  if (entitlement.starts_at !== null && now < toDate(entitlement.starts_at).getTime()) {
    return {label: translate('entitlement.starts_later'), tone: 'brand'};
  }
  if (entitlement.ends_at !== null && toDate(entitlement.ends_at).getTime() < now) {
    return {label: translate('entitlement.expired'), tone: 'warning'};
  }
  return {label: translate('entitlement.inactive'), tone: 'neutral'};
}
