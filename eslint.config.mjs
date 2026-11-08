import nextConfig from 'eslint-config-next';

export default [
  ...nextConfig,
  {
    ignores: [
      '.next/**',
      'dist/**',
      'node_modules/**',
      'public/',
      'next-env.d.ts',
      '.vercel/',
    ],
  },
];
