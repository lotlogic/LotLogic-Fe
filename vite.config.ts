import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// https://vite.dev/config/

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    // Temporarily disable manual chunk splitting to fix module initialization issues
    // rollupOptions: {
    //   output: {
    //     manualChunks: (id) => {
    //       // Vendor chunks
    //       if (id.includes('node_modules')) {
    //         if (id.includes('react') || id.includes('react-dom')) {
    //           return 'react-vendor';
    //         }
    //         if (id.includes('mapbox-gl')) {
    //           return 'mapbox-vendor';
    //         }
    //         if (id.includes('@turf')) {
    //           return 'turf-vendor';
    //         }
    //         if (id.includes('lucide-react')) {
    //           return 'ui-vendor';
    //         }
    //         if (id.includes('@tanstack/react-query')) {
    //           return 'query-vendor';
    //         }
    //         if (id.includes('zustand')) {
    //           return 'zustand-vendor';
    //         }
    //         // Group other node_modules
    //         return 'vendor';
    //       }

    //       // Component chunks
    //       if (id.includes('components/features/map/')) {
    //         return 'map-components';
    //       }
    //       if (id.includes('components/features/lots/') || id.includes('components/features/facades/')) {
    //         return 'sidebar-components';
    //       }
    //       if (id.includes('components/features/quote/')) {
    //         return 'quote-components';
    //       }

    //       // Default chunk
    //       return 'index';
    //     }
    //   }
    // },
    chunkSizeWarningLimit: 2000, // Increase limit to accommodate Mapbox
  },
});
