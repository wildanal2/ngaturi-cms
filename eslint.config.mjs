import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".agent-input/**",
      ".next/**",
      ".vinext/**",
      ".wrangler/**",
      "dist/**",
      "node_modules/**",
      "src/lib/db/migrations/**",
      "worker-configuration.d.ts",
    ],
  },
];

export default eslintConfig;
