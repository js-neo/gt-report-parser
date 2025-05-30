// next.config.ts

const nextConfig = {
    reactStrictMode: true,
    transpilePackages: [
        'react-dnd',
        'react-dnd-html5-backend',
        '@react-dnd/invariant',
        'geist'
    ],
    experimental: {
        optimizePackageImports: ['geist', 'lucide-react'],
    },
};

export default nextConfig;

