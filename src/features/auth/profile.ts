import type { User } from '@/types';

function hasText(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isProfileComplete(user: User | null | undefined): boolean {
  if (!user) {
    return false;
  }

  return [
    user.firstName,
    user.lastName,
    user.email,
    user.phone,
    user.address,
    user.city,
    user.postcode,
  ].every(hasText);
}
