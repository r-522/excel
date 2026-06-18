import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        excel: {
          green: '#217346',
          'green-dark': '#185c37',
          'green-light': '#e9f5ef',
          blue: '#0078d4',
          'blue-light': '#deecf9',
          'blue-select': '#b8d4f0',
          gray: '#f2f2f2',
          'gray-dark': '#d9d9d9',
          border: '#c0c0c0',
          header: '#f2f2f2',
        },
      },
      fontFamily: {
        excel: ['Calibri', 'Arial', 'sans-serif'],
      },
      fontSize: {
        'cell': '11px',
      },
    },
  },
  plugins: [],
};

export default config;
