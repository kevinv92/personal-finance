import nextConfig from "@personal-finance/eslint-config/next";

export default [
  ...nextConfig,
  {
    ignores: ["next-env.d.ts"],
  },
];
