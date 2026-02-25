let googleMapsPromise: Promise<any> | null = null;

export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps can only be loaded in the browser"));

  const key = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
  if (!key) return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));

  const w = window as any;
  if (w.google?.maps) return Promise.resolve(w.google);

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.googleMapsFailed === "1") {
        try { existing.remove(); } catch {}
      } else {
        existing.addEventListener("load", () => resolve((window as any).google), { once: true });
        existing.addEventListener(
          "error",
          () => {
            googleMapsPromise = null;
            try { existing.dataset.googleMapsFailed = "1"; } catch {}
            reject(new Error("Failed to load Google Maps script"));
          },
          { once: true }
        );
        return;
      }
    }

    const script = document.createElement("script");
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "1";
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(key)}&v=weekly&libraries=marker&loading=async`;
    script.onload = () => resolve((window as any).google);
    script.onerror = () => {
      googleMapsPromise = null;
      try { script.dataset.googleMapsFailed = "1"; } catch {}
      try { script.remove(); } catch {}
      reject(new Error("Failed to load Google Maps script"));
    };
    document.head.appendChild(script);
  });

  return googleMapsPromise;
}
