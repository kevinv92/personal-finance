// For more info, see https://github.com/storybookjs/eslint-plugin-storybook#configuration-flat-config-format
import storybook from "eslint-plugin-storybook";

import nextConfig from "@personal-finance/eslint-config/next";

export default [
  ...nextConfig,
  {
    ignores: ["next-env.d.ts"],
  },
  ...storybook.configs["flat/recommended"],
];
