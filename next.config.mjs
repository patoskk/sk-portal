/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Oculta el indicador/herramientas de desarrollo de Next (el botón flotante con
  // theme propio que no afecta al portal). Solo aplica en dev; en prod no aparece.
  devIndicators: false,
  async headers() {
    return [
      {
        // La letra de la marca la usan el portal Y la lección, que se lee en un
        // iframe aislado (sandbox sin allow-same-origin = origen opaco). Para el
        // navegador ese iframe es otro sitio, y una letra de otro sitio solo se
        // carga si la respuesta lo permite: sin este header la lección vuelve a
        // la letra del sistema sin avisar.
        source: "/fuentes/:file*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};
export default nextConfig;
