// Shared Tailwind preset — every app extends this instead of redefining
// colors/type scale locally. Import in each app's tailwind.config.ts:
//
//   import octopusPreset from "@octopus/config/tailwind/preset";
//   export default { presets: [octopusPreset], content: [...] };
//
// Values are pulled from @octopus/ui tokens so there is exactly one source
// of truth for the brand system.

import type { Config } from "tailwindcss";
import { colors, typography } from "../../ui/src/tokens";

const preset: Partial<Config> = {
  theme: {
    extend: {
      colors: {
        "ocean-blue": colors.primary.oceanBlue,
        "octopus-violet": colors.primary.octopusViolet,
        "deep-navy": colors.primary.deepNavy,

        teal: colors.secondary.teal,
        coral: colors.secondary.coral,
        amber: colors.secondary.amber,
        mint: colors.secondary.mint,
        "sky-blue": colors.secondary.skyBlue,
        lilac: colors.secondary.lilac,

        gray: {
          50: colors.neutral.gray50,
          100: colors.neutral.gray100,
          200: colors.neutral.gray200,
          300: colors.neutral.gray300,
          500: colors.neutral.gray500,
          700: colors.neutral.gray700,
          900: colors.neutral.gray900,
        },

        success: colors.semantic.success,
        info: colors.semantic.info,
        warning: colors.semantic.warning,
        error: colors.semantic.error,
        accent: colors.semantic.accent,
        "alt-success": colors.semantic.altSuccess,
      },
      fontFamily: {
        latin: typography.fontFamily.latin.split(",").map((f) => f.trim()),
        arabic: typography.fontFamily.arabic.split(",").map((f) => f.trim()),
      },
      fontSize: {
        "display-1": [`${typography.typeScale.display1.size}px`, `${typography.typeScale.display1.lineHeight}px`],
        "display-2": [`${typography.typeScale.display2.size}px`, `${typography.typeScale.display2.lineHeight}px`],
        h1: [`${typography.typeScale.h1.size}px`, `${typography.typeScale.h1.lineHeight}px`],
        h2: [`${typography.typeScale.h2.size}px`, `${typography.typeScale.h2.lineHeight}px`],
        h3: [`${typography.typeScale.h3.size}px`, `${typography.typeScale.h3.lineHeight}px`],
        "body-lg": [`${typography.typeScale.bodyLarge.size}px`, `${typography.typeScale.bodyLarge.lineHeight}px`],
        body: [`${typography.typeScale.body.size}px`, `${typography.typeScale.body.lineHeight}px`],
        "body-sm": [`${typography.typeScale.bodySmall.size}px`, `${typography.typeScale.bodySmall.lineHeight}px`],
        caption: [`${typography.typeScale.caption.size}px`, `${typography.typeScale.caption.lineHeight}px`],
      },
    },
  },
};

export default preset;
