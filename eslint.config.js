//  @ts-check

import prettierConfig from "eslint-config-prettier"
import jsxA11yPlugin from "eslint-plugin-jsx-a11y"
import reactPlugin from "eslint-plugin-react"
import reactHooksPlugin from "eslint-plugin-react-hooks"
import convexPlugin from "@convex-dev/eslint-plugin"
import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  // Ignore generated Convex files
  {
    ignores: ["convex/_generated/**", "eslint.config.js"],
  },

  ...tanstackConfig,
  ...convexPlugin.configs.recommended,
  reactHooksPlugin.configs.flat.recommended,

  {
    name: "llmao/react",
    plugins: {
      react: reactPlugin,
      "jsx-a11y": jsxA11yPlugin,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React rules
      "react/jsx-key": "error",
      "react/jsx-no-useless-fragment": "warn",
      "react/no-children-prop": "error",
      "react/no-unescaped-entities": "error",
      "react/no-unused-class-component-methods": "warn",
      "react/void-dom-elements-no-children": "error",
      "react/self-closing-comp": "error",
      "react/jsx-fragments": ["error", "syntax"],
      "react/jsx-boolean-value": ["error", "never"],
      "react/button-has-type": "error",
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react/display-name": "off",
      "react/jsx-props-no-spreading": "off",
      "react/jsx-no-bind": "off",

      // React Hooks
      "react-hooks/exhaustive-deps": "warn",

      // JSX A11y
      "jsx-a11y/alt-text": "error",
      "jsx-a11y/no-redundant-roles": "error",
      "jsx-a11y/no-noninteractive-tabindex": "error",
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/no-noninteractive-element-interactions": "warn",
      "jsx-a11y/no-distracting-elements": "error",
      "jsx-a11y/no-access-key": "error",
      "jsx-a11y/no-autofocus": "warn",
      "jsx-a11y/aria-unsupported-elements": "error",
      "jsx-a11y/no-aria-hidden-on-focusable": "error",
      "jsx-a11y/anchor-has-content": "error",
      "jsx-a11y/anchor-is-valid": "error",
      "jsx-a11y/lang": "error",
      "jsx-a11y/iframe-has-title": "error",
      "jsx-a11y/media-has-caption": "warn",
      "jsx-a11y/img-redundant-alt": "error",
      "jsx-a11y/html-has-lang": "error",
      "jsx-a11y/click-events-have-key-events": "warn",
      "jsx-a11y/interactive-supports-focus": "warn",
    },
  },

  {
    name: "llmao/typescript",
    rules: {
      // Disable conflicting rules from tanstack config
      "import/order": "off",

      // TypeScript rules
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/explicit-module-boundary-types": "off",
      "@typescript-eslint/no-non-null-assertion": "warn",
      "@typescript-eslint/no-empty-interface": "warn",
      "@typescript-eslint/no-redeclare": "off",
      "@typescript-eslint/no-shadow": "error",
      "@typescript-eslint/dot-notation": "error",
      "@typescript-eslint/no-extra-non-null-assertion": "error",
      "@typescript-eslint/no-misused-new": "error",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unnecessary-type-constraint": "warn",
      "@typescript-eslint/no-unsafe-declaration-merging": "error",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unused-private-class-members": "error",
      "@typescript-eslint/no-useless-constructor": "error",
      "@typescript-eslint/no-useless-empty-export": "error",
      "@typescript-eslint/prefer-as-const": "warn",
      "@typescript-eslint/prefer-enum-initializers": "warn",
      "@typescript-eslint/consistent-type-exports": [
        "warn",
        { fixMixedExportsWithInlineTypeSpecifier: true },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "warn",
        { prefer: "type-imports", disallowTypeAnnotations: false },
      ],
      "@typescript-eslint/prefer-function-type": "warn",
      "@typescript-eslint/prefer-optional-chain": "warn",
      "@typescript-eslint/prefer-nullish-coalescing": [
        "warn",
        { ignoreConditionalTests: true, ignoreMixedLogicalExpressions: true },
      ],
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/only-throw-error": [
        "error",
        {
          allow: [
            {
              from: "package",
              name: ["redirect"],
              package: "@tanstack/react-router",
            },
          ],
        },
      ],
    },
  },

  prettierConfig,
]
