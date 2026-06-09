export type StageId = 'overview' | 'clip' | 'unet' | 'vae'

export interface Stage {
  id: StageId
  label: string
  shortLabel: string
  summary: string
}

export const STAGES: Stage[] = [
  {
    id: 'overview',
    label: 'Full Pipeline',
    shortLabel: 'Overview',
    summary: 'See how text becomes tokens, guides denoising in latent space, and scales to a final image.',
  },
  {
    id: 'clip',
    label: 'CLIP Tokenization',
    shortLabel: 'CLIP',
    summary: 'Your prompt is split into sub-word tokens, embedded, and fed to the U-Net as conditioning.',
  },
  {
    id: 'unet',
    label: 'U-Net Denoising',
    shortLabel: 'U-Net',
    summary: 'Cross-attention maps each token to spatial regions while noise is removed step by step.',
  },
  {
    id: 'vae',
    label: 'VAE Decoder',
    shortLabel: 'VAE',
    summary: 'The 64×64 latent tensor is decoded and upscaled into a full-resolution RGB image.',
  },
]

export const DEFAULT_PROMPT = 'a serene lake at sunset, mountains in the background'

/** Simplified BPE-style tokenization for education (not exact CLIP output). */
export function tokenizePrompt(prompt: string): string[] {
  const normalized = prompt.trim().toLowerCase()
  if (!normalized) return ['<|startoftext|>', '<|endoftext|>']

  const words = normalized.split(/\s+/)
  const tokens: string[] = ['<|startoftext|>']

  for (const word of words) {
    if (word.length <= 4) {
      tokens.push(word)
      continue
    }
    const mid = Math.ceil(word.length / 2)
    tokens.push(word.slice(0, mid))
    if (mid < word.length) tokens.push(word.slice(mid))
  }

  tokens.push('<|endoftext|>')
  return tokens
}

export const DENOISE_STEPS = [
  { step: 0, label: 'Pure noise', noise: 1.0 },
  { step: 10, label: 'Early structure', noise: 0.78 },
  { step: 25, label: 'Shapes emerge', noise: 0.52 },
  { step: 40, label: 'Details forming', noise: 0.28 },
  { step: 50, label: 'Clean latent', noise: 0.05 },
]

/** Which latent grid cells each semantic token tends to attend (demo mapping). */
export function getAttentionMap(
  tokens: string[],
  gridSize: number,
): Record<number, number[]> {
  const semantic = tokens.filter(
    (t) => !t.startsWith('<|') && t.length > 0,
  )
  const map: Record<number, number[]> = {}

  semantic.forEach((token, i) => {
    const cells: number[] = []
    const band = Math.floor((i / Math.max(semantic.length, 1)) * gridSize)

    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        let weight = 0
        if (token.includes('lake') || token.includes('water')) {
          weight = y > gridSize * 0.45 ? 0.9 - (y / gridSize) * 0.3 : 0.1
        } else if (token.includes('sun') || token.includes('set')) {
          weight =
            y < gridSize * 0.35 && x > gridSize * 0.55
              ? 0.95
              : 0.15
        } else if (token.includes('mount') || token.includes('back')) {
          weight =
            y < gridSize * 0.5 && y > gridSize * 0.15
              ? 0.85
              : 0.12
        } else if (token.includes('serene') || token === 'a') {
          weight = 0.35
        } else {
          weight = 0.25 + ((x + y) % 3) * 0.1
        }
        if (weight > 0.55) cells.push(y * gridSize + x)
      }
    }
    map[i] = cells.length ? cells : [band * gridSize + Math.floor(gridSize / 2)]
  })

  return map
}