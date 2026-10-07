// Mounts the PulseHR screens carousel into the static page. js/main.js imports the
// built file (islands/pulsehr-gallery.js) when the Projects section comes near, so
// visitors who never scroll there never download React.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { CoverflowCarousel } from "@/components/ui/coverflow-carousel";
import { PULSEHR_SLIDES } from "./pulsehr-slides";
import "@/styles/islands.css";

const host = document.querySelector<HTMLElement>('[data-island="pulsehr-gallery"]');

if (host && !host.dataset.mounted) {
  host.dataset.mounted = "true";
  // Replaces the plain thumbnail grid that is shown until now (and without JavaScript).
  createRoot(host).render(
    <StrictMode>
      <CoverflowCarousel
        slides={PULSEHR_SLIDES}
        cardWidth="clamp(170px, 26vw, 300px)"
        showCaption
        showNavigation
        label="PulseHR screens"
      />
    </StrictMode>,
  );
}
