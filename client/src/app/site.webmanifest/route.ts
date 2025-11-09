import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
  try {
    const manifestPath = path.join(process.cwd(), "public", "site.webmanifest");
    const manifestContent = fs.readFileSync(manifestPath, "utf-8");
    const manifest = JSON.parse(manifestContent);

    return NextResponse.json(manifest, {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=31536000, immutable",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("Error reading site.webmanifest:", error);
    // Return a default manifest if file read fails
    return NextResponse.json(
      {
        name: "E-Learning Platform",
        short_name: "E-Learning",
        icons: [
          {
            src: "/android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
        theme_color: "#125093",
        background_color: "#ffffff",
        display: "standalone",
      },
      {
        headers: {
          "Content-Type": "application/manifest+json",
          "Cache-Control": "public, max-age=31536000, immutable",
          "Access-Control-Allow-Origin": "*",
        },
      }
    );
  }
}

