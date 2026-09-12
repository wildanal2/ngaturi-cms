import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const eslintConfig = [
  ...coreWebVitals,
  ...typescript,
  {
    ignores: [
      ".agent-input/**",
      ".next/**",
      "node_modules/**",
      "src/lib/db/migrations/**",
    ],
  },
];

export default eslintConfig;
