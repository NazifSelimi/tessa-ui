/**
 * AntdProvider — lazy-loadable wrapper for antd's ConfigProvider + App.
 *
 * By keeping this in its own file (and lazy-loading it), the entire antd
 * theme engine stays out of the initial blocking bundle. It only loads
 * once the first route that needs it renders.
 */

import { ConfigProvider, App as AntApp } from 'antd';
import type { ReactNode } from 'react';

export default function AntdProvider({ children }: { children: ReactNode }) {
  return (
    <ConfigProvider theme={{ cssVar: { prefix: 'ant' } }}>
      <AntApp>{children}</AntApp>
    </ConfigProvider>
  );
}
