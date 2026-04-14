import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
	plugins: [
		react(),
		VitePWA({
			registerType: "autoUpdate",
			workbox: {
				maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
				globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
				runtimeCaching: [
					{
						urlPattern: /^https:\/\/.*\.jw-cdn\.org\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "jw-cdn-cache",
							expiration: { maxEntries: 200, maxAgeSeconds: 7 * 24 * 60 * 60 },
						},
					},
					{
						urlPattern: /^https:\/\/.*\.jw-api\.org\/.*/i,
						handler: "CacheFirst",
						options: {
							cacheName: "jw-api-cache",
							expiration: { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
						},
					},
				],
			},
			manifest: {
				name: "JW Video",
				short_name: "JW Video",
				description: "Watch videos from JW.org — Netflix style",
				theme_color: "#1a1a2e",
				background_color: "#1a1a2e",
				display: "standalone",
				orientation: "landscape",
				icons: [
					{ src: "/icon-192.png", sizes: "192x192", type: "image/png" },
					{ src: "/icon-512.png", sizes: "512x512", type: "image/png" },
				],
			},
		}),
	],
	server: {
		proxy: {
			"/api": { target: "http://127.0.0.1:8000", changeOrigin: true },
		},
	},
});
