import { Drawer, Stack, Text, Group, ActionIcon, ScrollArea } from '@mantine/core'
import { IconTrash } from '@tabler/icons-react'
import type { SavedSample } from '@simpler/shared'
import { RightsBadge } from './RightsBadge'

interface Props {
  opened: boolean
  onClose: () => void
  saved: SavedSample[]
  onRemove: (savedId: number) => void
}

export function LibraryDrawer({ opened, onClose, saved, onRemove }: Props) {
  return (
    <Drawer opened={opened} onClose={onClose} title="Your library" position="right">
      <ScrollArea h="100%">
        <Stack gap="sm">
          {saved.length === 0 && <Text c="dimmed" size="sm">Nothing saved yet.</Text>}
          {saved.map((s) => (
            <Group key={s.savedId} justify="space-between" wrap="nowrap">
              <Text size="sm" truncate>{s.name}</Text>
              <Group gap="xs" wrap="nowrap">
                <RightsBadge license={s.license} />
                <ActionIcon variant="subtle" color="red" onClick={() => onRemove(s.savedId)} aria-label="Remove">
                  <IconTrash size={16} />
                </ActionIcon>
              </Group>
            </Group>
          ))}
        </Stack>
      </ScrollArea>
    </Drawer>
  )
}
