import { baseApi, API_TAGS } from '@/api/baseApi';
import { FREE_SHIPPING_THRESHOLD, SHIPPING_FEE } from '@/shared/constants/shipping';

/** Delivery numbers set in Admin (owner rule Q6). */
export interface ShippingSettings {
  freeShippingFrom: number;
  freeShippingAfterDiscounts: boolean;
  shippingCost: number;
}

/** Used only until the shop's own settings have loaded. */
export const DEFAULT_SHIPPING_SETTINGS: ShippingSettings = {
  freeShippingFrom: FREE_SHIPPING_THRESHOLD,
  freeShippingAfterDiscounts: false,
  shippingCost: SHIPPING_FEE,
};

export const shopSettingsApi = baseApi.injectEndpoints({
  overrideExisting: false,
  endpoints: (builder) => ({
    getShopSettings: builder.query<ShippingSettings, void>({
      query: () => '/v1/shop-settings',
      transformResponse: (response: { data?: Partial<ShippingSettings> }) => ({
        freeShippingFrom: Number(response.data?.freeShippingFrom ?? DEFAULT_SHIPPING_SETTINGS.freeShippingFrom),
        freeShippingAfterDiscounts: Boolean(response.data?.freeShippingAfterDiscounts),
        shippingCost: Number(response.data?.shippingCost ?? DEFAULT_SHIPPING_SETTINGS.shippingCost),
      }),
      // Saving the settings in Admin refreshes them here too.
      providesTags: [API_TAGS.PricingSettings],
    }),
  }),
});

export const { useGetShopSettingsQuery } = shopSettingsApi;

/** The shop's delivery numbers, or the defaults while they load (or if the request fails). */
export function useShippingSettings(): ShippingSettings {
  const { data } = useGetShopSettingsQuery();
  return data ?? DEFAULT_SHIPPING_SETTINGS;
}
