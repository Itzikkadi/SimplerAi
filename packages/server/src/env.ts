import { z } from 'zod'

const schema = z.object({
  DEEPSEEK_API_KEY: z.string().min(1, 'DEEPSEEK_API_KEY is required'),
  FREESOUND_API_KEY: z.string().min(1, 'FREESOUND_API_KEY is required'),
  PORT: z.coerce.number().default(8787),
  SQLITE_PATH: z.string().default('./packages/server/data/simpler.sqlite'),
})

const parsed = schema.safeParse(process.env)
if (!parsed.success) {
  console.error('[simpler] Invalid environment:\n' + parsed.error.issues.map((i) => ` - ${i.message}`).join('\n'))
  process.exit(1)
}

export const env = parsed.data
