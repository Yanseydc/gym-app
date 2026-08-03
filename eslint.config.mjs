import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// eslint-config-next's main export (index.js) is a legacy eslintrc-shaped
// object ({ extends, parser, parserOptions, overrides, env, ... }), not a
// flat-config array - spreading it directly into a flat config (the
// previous approach here) is what triggered
// @rushstack/eslint-patch/modern-module-resolution's "calling module was
// not recognized" crash under eslint 9: that patch is only meant to be
// loaded through legacy .eslintrc-style resolution, not a bare ESM import.
// FlatCompat is the officially documented bridge (matches current
// create-next-app scaffolding) that resolves "next/core-web-vitals" and
// "next/typescript" through eslint-config-next's legacy resolution
// machinery correctly, then converts the result into real flat-config
// objects.
const compat = new FlatCompat({
  baseDirectory: __dirname,
});

export default [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [".next/**", "node_modules/**"],
  },
];
