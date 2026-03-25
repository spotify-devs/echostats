import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

export default defineConfig({
  site: "https://spotify-devs.github.io",
  base: "/echostats",
  integrations: [
    starlight({
      title: "EchoStats",
      description: "Self-hosted Spotify analytics dashboard documentation",
      social: {
        github: "https://github.com/spotify-devs/echostats",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            { label: "Introduction", slug: "getting-started/introduction" },
            { label: "Installation", slug: "getting-started/installation" },
            { label: "Spotify App Setup", slug: "getting-started/spotify-setup" },
            { label: "Configuration", slug: "getting-started/configuration" },
          ],
        },
        {
          label: "User Guide",
          items: [
            { label: "Dashboard", slug: "user-guide/dashboard" },
            { label: "Analytics", slug: "user-guide/analytics" },
            { label: "Importing History", slug: "user-guide/importing-history" },
            { label: "Playlists", slug: "user-guide/playlists" },
          ],
        },
        {
          label: "API Reference",
          items: [
            { label: "Overview", slug: "api/overview" },
            { label: "Authentication", slug: "api/authentication" },
            { label: "Endpoints", slug: "api/endpoints" },
          ],
        },
        {
          label: "Contributing",
          items: [
            { label: "Development Setup", slug: "contributing/development" },
            { label: "Guidelines", slug: "contributing/guidelines" },
          ],
        },
        {
          label: "Troubleshooting",
          items: [
            { label: "FAQ", slug: "troubleshooting/faq" },
            { label: "Common Issues", slug: "troubleshooting/common-issues" },
          ],
        },
      ],
      customCss: [],
    }),
  ],
});
