import { catalogStorageRewrites } from "./lib/catalog-storage.mjs";
/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  async rewrites() {
    return {beforeFiles: catalogStorageRewrites(), afterFiles: ['ai','auth','conversations','discover-saint','descubrir-saint','saints','prayers','miracles','health','popularity'].map(route => ({source:`/${route}/:path*`,destination:`/api/${route}/:path*`})), fallback: []}
  },
  async headers() {
    return [{source:'/:path*',headers:[
      ...(/^[a-f0-9]{40}$/i.test(process.env.RENDER_GIT_COMMIT || '') ? [{key:'X-App-Revision',value:process.env.RENDER_GIT_COMMIT}] : []),
      {key:'X-Content-Type-Options',value:'nosniff'},
      {key:'X-Frame-Options',value:'DENY'},
      {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
      {key:'Permissions-Policy',value:'camera=(), microphone=(), geolocation=()'},
      {key:'Content-Security-Policy',value:"frame-ancestors 'none'; base-uri 'self'; object-src 'none'"},
    ]}]
  },
}
export default nextConfig
