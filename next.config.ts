import type { NextConfig } from "next";
import type { Configuration as WebpackConfig } from 'webpack';

const nextConfig: NextConfig = {
  webpack: (config: WebpackConfig, { isServer }) => {
    // 只在客戶端打包時處理 opencv-js
    if (!isServer) {
      config.resolve = {
        ...config.resolve,
        fallback: {
          ...(config.resolve?.fallback || {}),
          fs: false,  // opencv-js 嘗試使用 fs 模組，但我們在瀏覽器中不需要它
        },
      };
    }
    return config;
  },
};

export default nextConfig;
