import theme from './tailwind.theme.mjs';

export default {
  content: [
    `bazel-out/*-fastbuild/bin/{java,js}/**/*.{js,ts,jsx,tsx}`,
    `external/dev_april_corgi~/{java,js}/**/*.{js,ts,jsx,tsx}`,
    `{java,js}/**/*.{js,ts,jsx,tsx}`,
  ],
  theme,
  plugins: [],
};
