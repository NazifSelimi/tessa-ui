/**
 * Prefer a value entered during activation. Imported invitations frequently
 * contain empty strings, which must not replace the stylist's form input.
 */
export function resolveActivationField(
  formValue: string | undefined,
  invitationValue: string | null,
): string | undefined {
  return formValue?.trim() ? formValue : (invitationValue || undefined);
}
