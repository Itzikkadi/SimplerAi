import { TextInput, ActionIcon, Group } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'

interface Props {
  value: string
  onChange: (value: string) => void
  onSearch: (prompt: string) => void
  loading: boolean
}

export function SearchPrompt({ value, onChange, onSearch, loading }: Props) {
  return (
    <Group gap="xs" wrap="nowrap">
      <TextInput
        size="lg" radius="md" flex={1} value={value}
        placeholder="Describe the sample you're hunting for…"
        onChange={(e) => onChange(e.currentTarget.value)}
        onKeyDown={(e) => e.key === 'Enter' && onSearch(value)}
      />
      <ActionIcon size={50} radius="md" loading={loading} onClick={() => onSearch(value)} aria-label="Search">
        <IconSearch size={22} />
      </ActionIcon>
    </Group>
  )
}
