import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // En-tetes de securite de base (sans CSP stricte : le site charge des images/polices externes, une CSP mal reglee casserait l'affichage)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
