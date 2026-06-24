import { useRef, useState } from 'react'
import { Group, Button, Badge, NumberInput, TextInput, Loader } from '@mantine/core'
import { IconUpload } from '@tabler/icons-react'
import { detectBpm } from '../audio/analyze'
import { useStore } from '../store'

export function SeedBar() {
  const { seed, setSeed } = useStore()
  const [busy, setBusy] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function onFile(file: File) {
    setBusy(true)
    try {
      const bpm = await detectBpm(file)
      setSeed({ ...seed, bpm })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Group gap="sm">
      <input
        ref={inputRef} type="file" accept="audio/*" hidden
        onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
      />
      <Button
        variant="default" leftSection={busy ? <Loader size={14} /> : <IconUpload size={16} />}
        onClick={() => inputRef.current?.click()}
      >
        Seed from a track
      </Button>
      {seed?.bpm != null && (
        <>
          <NumberInput
            size="xs" w={110} label={undefined} value={seed.bpm} suffix=" bpm"
            onChange={(v) => setSeed({ ...seed, bpm: Number(v) })}
          />
          <TextInput
            size="xs" w={90} placeholder="key" value={seed.key ?? ''}
            onChange={(e) => setSeed({ ...seed, key: e.currentTarget.value })}
          />
          <Badge variant="dot" color="teal">seeded</Badge>
        </>
      )}
    </Group>
  )
}
