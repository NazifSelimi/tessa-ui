import { App } from 'antd';

/**
 * Offers may share products: the customer picks which offer to use, so the
 * server only warns. After a save, list the offers that share products.
 */
export function useClashWarnings() {
  const { modal } = App.useApp();
  return (warnings?: string[]) => {
    if (!warnings?.length) return;
    modal.warning({
      title: 'These offers share products',
      content: (
        <div>
          <p>Saved. A customer gets only the offer they pick; if they pick two that need the same products, the last one is used.</p>
          <ul style={{ paddingLeft: 18, margin: 0 }}>{warnings.map((line) => <li key={line}>{line}</li>)}</ul>
        </div>
      ),
    });
  };
}
