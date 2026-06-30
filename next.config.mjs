/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Oculta el indicador/herramientas de desarrollo de Next (el botón flotante con
  // theme propio que no afecta al portal). Solo aplica en dev; en prod no aparece.
  devIndicators: false,
};
export default nextConfig;
