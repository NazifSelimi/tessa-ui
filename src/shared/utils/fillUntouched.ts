import type { FormInstance } from 'antd';

/** What the server last sent for each form, to tell typed values from loaded ones. */
const lastServerValues = new WeakMap<object, Record<string, unknown>>();

/**
 * Puts server values into a form without wiping what is being typed: a field
 * is only replaced while it still holds the value the server sent last time.
 * Used where the data can refresh while the form is open (e.g. uploading a
 * logo refreshes the whole business profile), which used to reset every
 * unsaved field.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- works for any flat form
export function fillUntouched<T extends object>(form: FormInstance<any>, values: T): void {
  const previous = lastServerValues.get(form);
  const next = values as Record<string, unknown>;
  const update = previous
    ? Object.fromEntries(Object.entries(next).filter(([key]) => Object.is(form.getFieldValue(key), previous[key])
      || form.getFieldValue(key) === undefined))
    : next;
  lastServerValues.set(form, { ...next });
  form.setFieldsValue(update);
}
