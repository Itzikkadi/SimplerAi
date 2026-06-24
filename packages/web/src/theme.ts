import { createTheme, type MantineColorsTuple } from '@mantine/core'

const teal: MantineColorsTuple = [
  '#e3fbf1', '#c2f0dd', '#9ee6c8', '#78dcb2', '#57d3a0',
  '#1D9E75', '#198a67', '#147157', '#0e5944', '#074031',
]

export const theme = createTheme({
  primaryColor: 'teal',
  primaryShade: 5,
  fontFamily: 'Outfit, system-ui, sans-serif',
  defaultRadius: 'md',
  colors: { teal },
})
