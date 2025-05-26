// packages/client/next.config.mjs

const nextConfig = {
    reactStrictMode: true,
    transpilePackages: [
        'react-dnd',
        'react-dnd-html5-backend',
        '@react-dnd/invariant'
    ],
};

export default nextConfig;