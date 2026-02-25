let googleMapsPromise: Promise<any> | null = null;

function waitForGoogleMapsReady(resolve: (g: any) => void, reject: (e: Error) => void) {
  const start = Date.now();
  const maxWaitMs = 8000;

  const check = () => {
    const g = (window as any).google;
    if (g?.maps?.Map && g?.maps?.OverlayView) {
      resolve(g);
      return;
    }
    if (Date.now() - start > maxWaitMs) {
      reject(
        new Error(
          "Google Maps failed to initialize. Check API key, HTTP referrer restrictions, billing, and enabled APIs."
        )
      );
      return;
    }
    setTimeout(check, 50);
  };

  check();
}

export function loadGoogleMaps() {
  if (typeof window === "undefined") return Promise.reject(new Error("Google Maps can only be loaded in the browser"));

  const key = (process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "").trim();
  if (!key) return Promise.reject(new Error("Missing NEXT_PUBLIC_GOOGLE_MAPS_API_KEY"));

  const w = window as any;
  if (w.google?.maps?.Map && w.google?.maps?.OverlayView) return Promise.resolve(w.google);
  if (w.google?.maps) {
    return new Promise((resolve, reject) => {
      try {
        waitForGoogleMapsReady(resolve, reject);
      } catch (err: any) {
        reject(new Error(err?.message || "Google Maps failed to initialize"));
      }
    });
  }

  if (googleMapsPromise) return googleMapsPromise;

  googleMapsPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-google-maps="1"]') as HTMLScriptElement | null;
    if (existing) {
      if (existing.dataset.googleMapsFailed === "1") {
        try { existing.remove(); } catch {}
      } else {
        existing.addEventListener(
          "load",
          () => {
            try {
              waitForGoogleMapsReady(resolve, (e) => {
                googleMapsPromise = null;
                reject(e);
              });
            } catch (err: any) {
              googleMapsPromise = null;
              reject(new Error(err?.message || "Google Maps failed to initialize"));
            }
          },
          { once: true }
        );
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
    script.onload = () => {
      try {
        waitForGoogleMapsReady(resolve, (e) => {
          googleMapsPromise = null;
          try { script.dataset.googleMapsFailed = "1"; } catch {}
          reject(e);
        });
      } catch (err: any) {
        googleMapsPromise = null;
        try { script.dataset.googleMapsFailed = "1"; } catch {}
        reject(new Error(err?.message || "Google Maps failed to initialize"));
      }
    };
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
