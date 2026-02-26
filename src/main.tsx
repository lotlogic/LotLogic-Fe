import ErrorBoundary from "@/components/ui/ErrorBoundary";
import { APP_CONTENT } from "@/constants/content.ts";
import { initializeMixpanel } from "@/lib/analytics/mixpanel.ts";
import { type BrandQueryParams, getCurrentBrand } from "@/lib/api/lotApi.ts";
import { adminAuth } from "@/lib/auth/adminAuth.ts";
import {
  applyBrandTheme,
  clearBrandThemeOverrides,
  loadBrandFonts,
} from "@/lib/theme/brandTheme.ts";
import { setRuntimeConfig } from "@/lib/runtime/runtimeConfig.ts";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./styles/App.scss";
import "./styles/tailwind.css";

function setFavicon(url: string) {
  let link = document.querySelector(
    "link[rel~='icon']"
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

const resolveBrandQuery = (): BrandQueryParams | undefined => {
  if (typeof window === "undefined") {
    return undefined;
  }

  const { pathname, search } = window.location;
  const isPrototypeRoute = pathname.startsWith("/prototype");
  const isEmbedRoute = pathname.startsWith("/embed");

  if (!isPrototypeRoute && !isEmbedRoute) {
    return undefined;
  }

  const params = new URLSearchParams(search);
  const brandGuid = params.get("brand") || undefined;
  const estateIdFromQuery = params.get("estateId") || undefined;

  let estateIdFromPath: string | undefined;
  if (isEmbedRoute) {
    const pathParts = pathname.split("/").filter(Boolean);
    const encodedEstateId = pathParts[1];
    if (encodedEstateId) {
      try {
        estateIdFromPath = decodeURIComponent(encodedEstateId);
      } catch {
        estateIdFromPath = encodedEstateId;
      }
    }
  }

  const estateId = estateIdFromQuery ?? estateIdFromPath;

  if (brandGuid || estateId) {
    return { guid: brandGuid, estateId };
  }

  return undefined;
};

async function bootstrap() {
  try {
    const currentBrand = await getCurrentBrand(resolveBrandQuery());
    const prototypeEstateId =
      typeof currentBrand?.estateId === "string"
        ? currentBrand.estateId.trim() || undefined
        : undefined;
    setRuntimeConfig({ prototypeEstateId });

    if (currentBrand?.logoUrl) {
      setFavicon(currentBrand.logoUrl);
    }
    document.title = currentBrand?.name ?? "Lotlogic";

    APP_CONTENT.app.name = currentBrand?.name ?? APP_CONTENT.app.name;
    APP_CONTENT.brand.logo = currentBrand?.logoUrl ?? APP_CONTENT.brand.logo;
    APP_CONTENT.brand.favicon =
      currentBrand?.logoUrl ?? APP_CONTENT.brand.favicon;
    APP_CONTENT.brand.title = currentBrand?.title ?? APP_CONTENT.brand.title;
    APP_CONTENT.header.title = currentBrand?.name ?? APP_CONTENT.header.title;

    APP_CONTENT.colors.primary =
      currentBrand?.primaryColor ?? APP_CONTENT.colors.primary;
    APP_CONTENT.colors.accent =
      currentBrand?.secondaryColor ?? APP_CONTENT.colors.accent;
    APP_CONTENT.colors.text.primary =
      currentBrand?.textPrimaryColor ?? APP_CONTENT.colors.text.primary;
    APP_CONTENT.colors.text.secondary =
      currentBrand?.textSecondaryColor ?? APP_CONTENT.colors.text.secondary;
    APP_CONTENT.colors.background.primary =
      currentBrand?.bgPrimaryColor ?? APP_CONTENT.colors.background.primary;
    APP_CONTENT.colors.background.secondary =
      currentBrand?.bgSecondaryColor ?? APP_CONTENT.colors.background.secondary;

    APP_CONTENT.typography.fontFamily.primary =
      currentBrand?.fontFamilyPrimary ??
      APP_CONTENT.typography.fontFamily.primary;
    APP_CONTENT.typography.fontFamily.secondary =
      currentBrand?.fontFamilySecondary ??
      APP_CONTENT.typography.fontFamily.secondary;
  } catch (err) {
    console.error("Brand init failed", err);
  }
  if (typeof window !== "undefined" && window.location.pathname.startsWith("/admin")) {
    clearBrandThemeOverrides();
  } else {
    loadBrandFonts();
    applyBrandTheme();
  }

  try {
    // Process MSAL redirect responses before routing drops the hash fragment.
    await adminAuth.initialize();
  } catch (err) {
    console.error("Admin auth init failed", err);
  }

  // Initialize Mixpanel analytics
  initializeMixpanel();

  const container = document.getElementById("root")!;
  const root = createRoot(container);
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
      </ErrorBoundary>
    </StrictMode>
  );
}

bootstrap();
