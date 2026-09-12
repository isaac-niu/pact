import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";

export default [
   js.configs.recommended,
    {
     files: ["**/*.{js,jsx}"],
     languageOptions: {
       ecmaVersion: 2024,
       sourceType: "module",
       parserOptions: {
         ecmaFeatures: { jsx: true },
        },
       globals: {
          ...globals.browser,
          ...globals.es2024,
          ...globals.node,
          expect: "readonly",
        },
      },
     plugins: {
       react,
       "react-hooks": reactHooks,
      },
     rules: {
        ...react.configs.recommended.rules,
        ...reactHooks.configs.recommended.rules,
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "no-unused-vars": ["warn", { varsIgnorePattern: "^_", argsIgnorePattern: "^_" }],
      },
     },
    {
     ignores: ["node_modules/", "dist/", "vite.config.js"],
    },
];
