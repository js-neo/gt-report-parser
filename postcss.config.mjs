// postcss.config.mjs

const config = {
  plugins: {
    '@tailwindcss/postcss': {
      config: './tailwind.config.ts'
    },
    'autoprefixer': {}
  }
};

export default config;
