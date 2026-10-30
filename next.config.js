/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  env: {
    // Versión del despliegue actual. Permite avisar al móvil cuando hay una
    // actualización pendiente sin necesidad de un service worker.
    NEXT_PUBLIC_APP_VERSION: process.env.VERCEL_GIT_COMMIT_SHA || process.env.VERCEL_DEPLOYMENT_ID || "dev",
  },
};

module.exports = nextConfig;
