import { Badge, Tooltip } from '@mantine/core'
import { licenseBadge } from '../lib/license'

export function RightsBadge({ license }: { license: string }) {
  const { label, color, tooltip } = licenseBadge(license)
  return (
    <Tooltip label={tooltip} withArrow multiline w={220}>
      <Badge color={color} variant="light" size="sm" style={{ cursor: 'help' }}>
        {label}
      </Badge>
    </Tooltip>
  )
}
