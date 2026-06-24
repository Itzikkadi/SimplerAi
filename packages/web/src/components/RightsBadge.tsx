import { Badge } from '@mantine/core'
import { licenseBadge } from '../lib/license'

export function RightsBadge({ license }: { license: string }) {
  const { label, color } = licenseBadge(license)
  return <Badge color={color} variant="light" size="sm">{label}</Badge>
}
