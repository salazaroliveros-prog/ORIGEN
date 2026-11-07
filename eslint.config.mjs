import nextConfig from 'eslint-config-next';

const eslintConfig = [
  ...nextConfig,
  {
    ignores: [
      '.next/**',
      'dist/**',
      'node_modules/**',
      'public/**',
      'next-env.d.ts',
      'components/ErrorBoundary.tsx',
    ],
  },
  {
    rules: {
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/immutability': 'off',
      'react-hooks/components-and-hooks-must-be-pure': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
];

export default eslintConfig;
