import { copyFile, mkdir } from "node:fs/promises";

await mkdir("public", { recursive: true });

// Keep the standalone Command Centre available as a named Preview page.
await copyFile("index.html", "public/command-centre.html");

// Make the complete Hybrid Enterprise Platform the Preview root page.
// The original Hybrid file remains available at /hybrid-preview.
await copyFile("public/hybrid-preview.html", "public/index.html");
