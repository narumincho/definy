/// @ts-check

/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    compiler: {
        emotion: true,
    },
    distDir: "./next-dist"
};

module.exports = nextConfig;
