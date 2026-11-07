import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: ['.next/**', 'dist/**', 'node_modules/**', 'public/**', 'next-env.d.ts'],
  },
];

export default eslintConfig;
