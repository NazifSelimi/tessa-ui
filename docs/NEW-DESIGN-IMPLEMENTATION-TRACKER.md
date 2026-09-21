# Stylist and client redesign — implementation tracker

Updated: 2026-09-21. Branch: `codex/stylist-client-new-design` in `tessa-ui`.
Reference: `/Users/xix/Downloads/tessa-new-look.zip`.

The archive is a visual prototype. Its example users, inventory, orders, payment confirmations, reviews, and prices are not production data. The implementation uses the existing application APIs and role guards. No backend files were changed for this redesign. Existing locale, SEO, and legal-page work was present before this branch. The required application foundation is preserved in this UI release; unrelated server configuration changes are excluded.

## Implemented

- [x] Separate customer header and stylist sidebar with responsive bottom navigation, current cart count, account, language and support access.
- [x] Original `LoadingScreen.tsx` and its animation preserved. Initial persistence restore now uses that same loader instead of a plain “Loading…” label.
- [x] Customer home: blush/lilac hero, collection entry points, real catalog cards and the existing hair quiz.
- [x] Stylist workspace: real most recent order, working reorder/detail actions, brands/categories, quick restocking and offers.
- [x] Catalog: URL-backed search, categories, brand, collection, price range, stock filter, sort and server pagination. Mobile filter drawer and empty/error/retry states.
- [x] Product cards: actual API images with a valid local fallback, role-aware prices, stock-aware add and quantity controls. Product links and cart buttons are separate interactive elements.
- [x] Quick order: API-backed search and color restock, quantity entry/Enter-to-add, remaining-stock limits, request retry, desktop summary and mobile summary above navigation.
- [x] Fixed the quick-order effect aborting its own request during React StrictMode mounting; replaced it with a declarative RTK Query subscription. Filter changes reset pagination and stale results are not actionable.
- [x] Account profile banner and shortcuts, retaining profile/password forms and adding a logout action available on mobile.
- [x] Order history cards on both desktop and mobile; real server pagination replaces pagination over only the first API page. Reorder and detail links retained.
- [x] Existing cart, shipping validation, discounts, bundle application, cash-on-delivery checkout, quiz and recommendation flows retained within the new theme.
- [x] New copy translated into Macedonian, Albanian and English. Localized routes, SEO and legal/contact links retained.
- [x] No artificial ratings, completed orders, free-shipping promises, clickable fake notifications, or demo audience/permission switches copied into the live app.

## Gaps requiring follow-up

| Priority | Status | Finding / effect | Where to fix / next step |
| --- | --- | --- | --- |
| P1 | Existing setup blocker | A fresh isolated SQLite migration fails at `2026_02_11_230000_add_missing_coupon_fields`: it alters `coupons`, but no base table exists. Local MySQL was not running when verification began. Full live API verification is not established by this task. | `tessa-api/database/migrations`, `tessa-api/schema.json`. Supply the supported baseline schema/import workflow or complete the base migrations, then run real end-to-end tests. No real database was modified. |
| P1 | Existing pricing behavior; reproduced | A product added as a guest keeps its frozen retail price after stylist login. Catalog and quick-order display the professional price, but the cart keeps the older snapshot; adding more of that same product keeps the old unit price too. | `src/hooks/useCart.ts`, `src/features/cart/slice.ts`, `src/App.tsx` auth bootstrap. Define when to refresh role-specific snapshots, reconcile with server checkout, and test guest→stylist and logout transitions. Existing frozen-price rules were preserved rather than silently changed. |
| P1 | Existing stock inconsistency | The central cart `addItem` reducer accumulates quantities without a stock cap. New card/quick-order controls prevent over-adding through those screens, but reorder, bundles and other entry points can still exceed the last-known stock before server validation. | `src/features/cart/slice.ts`, `src/hooks/useReorder.ts`, `src/components/BundleDealRail.tsx`. Centralize stock enforcement and verify bundle quantities represent bundle composition rather than available inventory. |
| P1 | Existing missing-price edge case | `useCart` and `PriceDisplay` treat an absent professional price as zero. API data normally supplies it, but a malformed/partial product can show or store a zero price. | `src/hooks/useCart.ts`, `src/components/PriceDisplay.tsx`. Agree on unavailable-price handling and enforce the same rule in every cart entry point. |
| P2 | Missing feature in prototype | Persistent favorites / wishlist do not have a connected product API. Prototype hearts only update local component state. | Add user-specific persistence and API support before exposing favorite controls or a favorites filter. No nonfunctional hearts were added. |
| P2 | Partial: color restock works; matrix missing | The prototype has a shade matrix with hard-coded shade codes and a fixed price. Current product/quick-order contracts do not expose a verified shade-family/SKU mapping. | `src/types/index.ts`, `src/features/quickorder/api.ts`, `tessa-api/app/Models/Product.php`. Add structured shades, current stock/prices and batch cart behavior. Current color search/restock remains functional. |
| P2 | Missing feature in prototype | Notification bell has no connected notification list/read-state API. | Implement notifications before displaying unread dots or opening a notification center. |
| P2 | Partial content | Five collection definitions remain `launchState: 'planned'`, and collection pages include temporary campaign-image/content slots. Home still links to the existing collection pages. | `src/shared/config/storefrontCollections.ts`, `src/pages/CollectionPage.tsx`. Finish verified product mapping, approved imagery and customer-facing copy for each collection. |
| P2 | Partial payment options | Live checkout submits `payment_method: 'cod'`. Prototype card/bank payment choices are presentation only. | `src/pages/CheckoutPage.tsx` and backend payment integration. Cash on delivery remains the supported path. |
| P2 | Missing backend filtering | The order API uses `paginate(15)` and does not apply the frontend's optional status/per-page query fields. Working page navigation is now implemented; prototype status tabs are not exposed as fake filters. | `tessa-api/app/Services/OrderService.php`, `src/features/orders/api.ts`. Add validated server status filtering before adding tabs. |
| P2 | Stub endpoint | Available-coupon query always returns `[]`. Coupon validation is separately connected and retained. | `src/features/coupons/api.ts:getAvailableCoupons`. Add a real available-coupons endpoint if discoverable offers are required. |
| P2 | Partial localization | Some inherited bundle/status/account/form copy remains hard-coded English. Newly introduced redesign and quick-order copy has all three translations. | `src/components/BundleDealRail.tsx`, `src/components/StatusBadge.tsx`, older account/auth components. Complete a dedicated localization pass. |
| P3 | Visual parity/content | The reference contains CSS product illustrations, not a production photography library. The app uses available API images, abstract collection artwork, and a clearly generic fallback when a product image is unavailable. | Supply approved campaign images and current transparent packshots for final content polish. |
| P3 | Maintenance | Existing Ant Design components produce deprecation warnings (`direction`, `message`, drawer `width`, static message context). Existing jsdom cannot parse some Ant Design 6 stylesheet syntax. | Migrate deprecated props and update the test DOM environment in a separate dependency pass; distinguish these warnings from failing behavior. |

## Verification

Browser checks use a disposable local fixture API, not the production catalog or a real payment/order service. Fixtures are outside the repository and must be stopped after checks. They do not ship with the app.

Completed observations so far:

- Customer homepage: desktop and 390px mobile, all collection/quiz links present, no horizontal overflow.
- Customer cart: add from a card, count/line update, shipping calculation and mobile checkout entry.
- Checkout: mobile shipping form and required-field validation remain active.
- Catalog: mobile filter drawer, category selection, live result count and disabled out-of-stock add action.
- Stylist: sign-in redirect to workspace, real-order fixture rendering, professional product prices, desktop sidebar and phone bottom navigation.
- Quick order: quantity increment, add feedback and cart update. At 375px the summary ends at y=745 and navigation starts at y=745: no overlap. Desktop summary uses a separate side column.

Final release verification (2026-09-21):

- `npm test -- --run`: 7 suites, 19 tests passed, including quick-order StrictMode loading/retry, remaining-stock limits, search history, checkout payloads, and auth return routes.
- `SEO_API_URL=https://staging.tessa.mk/api npm run build`: TypeScript, Vite production build, and static generation passed; staging returned 129 products and 144 localized route variants were generated.
- Phone, tablet, desktop checks covered widths 320, 375, 390, 820 and 1440px. Account at 320px had no horizontal overflow; tablet workspace and desktop quick-order layout were checked.
- Original loader component and animation files have no changes.
- Authenticated staging purchases and account mutations have not been performed. Existing pricing/stock edge cases above remain follow-up work; fixture checks are not represented as live end-to-end validation.

