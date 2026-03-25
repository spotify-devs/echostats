import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://spotify-devs.github.io",
  base: "/echostats",
  integrations: [
    starlight({
      title: "EchoStats",
      logo: {
        src: "./src/assets/logo.svg",
      },
      favicon: "/favicon.svg",
      description: "Self-hosted Spotify analytics dashboard documentation",
      social: {
        github: "https://github.com/spotify-devs/echostats",
      },
      head: [
        { tag: "script", attrs: { src: "/echostats/particles.js", defer: true } },
        { tag: "script", attrs: { src: "https://unpkg.com/@lottiefiles/lottie-player@latest/dist/lottie-player.js", defer: true } },
      ],
      sidebar: [
        { label: "Getting Started", autogenerate: { directory: "getting-started" } },
        { label: "User Guide", autogenerate: { directory: "user-guide" } },
        { label: "API Reference", autogenerate: { directory: "api" } },
        { label: "Contributing", autogenerate: { directory: "contributing" } },
        { label: "Troubleshooting", autogenerate: { directory: "troubleshooting" } },
      ],
      customCss: [],
    }),
  ],
});
