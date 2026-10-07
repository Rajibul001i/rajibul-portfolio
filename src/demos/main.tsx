// Dev-only preview of the shadcn demo (npm run demo). Not part of the published site.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./demo.css";
import DemoOne from "./coverflow-carousel-demo";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <DemoOne />
  </StrictMode>,
);
