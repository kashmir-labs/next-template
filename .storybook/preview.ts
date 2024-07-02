import { type Preview, type ReactRenderer } from "@storybook/react";
import { withThemeByClassName } from '@storybook/addon-themes';
import '../src/styles/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: 'system',
      values: [
        {
          name: 'system',
          value: 'hsl(var(--background))',
        },
        {
          name: 'light',
          value: 'hsl(var(--background-light))',
        },
        {
          name: 'dark',
          value: 'hsl(var(--background-dark))',
        },
      ]
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
  decorators: [
    withThemeByClassName<ReactRenderer>({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
    }),
  ]
} satisfies Preview;

export default preview;
