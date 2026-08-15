import type { Config } from "tailwindcss";
import octopusPreset from "../../packages/config/tailwind/preset";

export default {
  presets: [octopusPreset],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/**/*.{ts,tsx}"],
} satisfies Config;
