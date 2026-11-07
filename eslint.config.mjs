import next from "eslint-config-next";

const config = [
  ...next,
  // Copy is written with natural apostrophes; React renders them safely.
  { rules: { "react/no-unescaped-entities": "off" } },
  { ignores: [".next/**", "node_modules/**", ".data/**", "next-env.d.ts"] },
];
export default config;
