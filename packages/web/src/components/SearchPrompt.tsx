import { useState } from 'react'
import { TextInput, ActionIcon, Group } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

export function SearchPrompt({ onSearch, loading }: { onSearch: (prompt: string) => void; loading: boolean }) {
  const [value, setValue] = useState('dark aggressive trap vocal around 140 bpm')
  return (
    <Group gap="xs" wrap="nowrap">
      <TextInput
        size="lg" radius="md" flex={1} value={value}
        placeholder="Describe the sample you're hunting for…"
        onChange={(e) => setValue(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
      />
      <ActionIcon size={50} radius="md" loading={loading} onClick={() => onSearch(value)} aria-label="Search">
        <IconSearch size={22} />
      </ActionIcon>
    </Group>
  )
}
