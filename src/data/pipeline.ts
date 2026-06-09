export type StageId = 'overview' | 'clip' | 'crossattn' | 'unet' | 'vae'

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
    id: 'crossattn',
    label: 'Cross-Attention',
    shortLabel: 'Cross-Attn',
    summary: 'See how latent pixels query CLIP text keys/values to steer what appears where.',
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

export interface TensorInfo {
  name: string
  shape: string
  dtype: string
  elements: number | null
  note: string
  stage: StageId | 'all'
}

export const PIPELINE_TENSORS: TensorInfo[] = [
  {
    name: 'Prompt text',
    shape: 'string',
    dtype: '—',
    elements: null,
    note: 'Raw user input before any encoding',
    stage: 'clip',
  },
  {
    name: 'Token IDs',
    shape: '[1, 77]',
    dtype: 'int32',
    elements: 77,
    note: 'BPE token indices, padded to 77 slots',
    stage: 'clip',
  },
  {
    name: 'CLIP text embeddings',
    shape: '[1, 77, 768]',
    dtype: 'float32',
    elements: 59136,
    note: 'Context tensor fed to every cross-attention block',
    stage: 'clip',
  },
  {
    name: 'Initial latent noise',
    shape: '[1, 4, 64, 64]',
    dtype: 'float32',
    elements: 16384,
    note: 'Random Gaussian noise in VAE latent space',
    stage: 'unet',
  },
  {
    name: 'Timestep embedding',
    shape: '[1, 320]',
    dtype: 'float32',
    elements: 320,
    note: 'Sinusoidal encoding of denoising step t',
    stage: 'unet',
  },
  {
    name: 'U-Net latent input zₜ',
    shape: '[1, 4, 64, 64]',
    dtype: 'float32',
    elements: 16384,
    note: 'Noisy latent at timestep t (batch × channels × H × W)',
    stage: 'unet',
  },
  {
    name: 'Cross-attn Q (spatial)',
    shape: '[1, 4096, 320]',
    dtype: 'float32',
    elements: 1310720,
    note: 'Queries from flattened 64×64 latent features (one U-Net layer)',
    stage: 'crossattn',
  },
  {
    name: 'Cross-attn K (text)',
    shape: '[1, 77, 320]',
    dtype: 'float32',
    elements: 24640,
    note: 'Keys projected from CLIP context embeddings',
    stage: 'crossattn',
  },
  {
    name: 'Cross-attn V (text)',
    shape: '[1, 77, 320]',
    dtype: 'float32',
    elements: 24640,
    note: 'Values projected from CLIP context embeddings',
    stage: 'crossattn',
  },
  {
    name: 'Attention scores',
    shape: '[1, 4096, 77]',
    dtype: 'float32',
    elements: 315392,
    note: 'softmax(QKᵀ / √d) — each pixel scores every token',
    stage: 'crossattn',
  },
  {
    name: 'Cross-attn output',
    shape: '[1, 4096, 320]',
    dtype: 'float32',
    elements: 1310720,
    note: 'Weighted sum of values, reshaped back to spatial features',
    stage: 'crossattn',
  },
  {
    name: 'Predicted noise ε',
    shape: '[1, 4, 64, 64]',
    dtype: 'float32',
    elements: 16384,
    note: 'U-Net output subtracted from zₜ each step',
    stage: 'unet',
  },
  {
    name: 'Denoised latent z₀',
    shape: '[1, 4, 64, 64]',
    dtype: 'float32',
    elements: 16384,
    note: 'Final latent after all denoising steps',
    stage: 'vae',
  },
  {
    name: 'VAE decoded image',
    shape: '[1, 3, 512, 512]',
    dtype: 'float32',
    elements: 786432,
    note: '8× upscaled RGB pixels — the image you see',
    stage: 'vae',
  },
]

export function formatElements(n: number | null): string {
  if (n === null) return '—'
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export function getTensorsForStage(stage: StageId): TensorInfo[] {
  if (stage === 'overview') return PIPELINE_TENSORS
  return PIPELINE_TENSORS.filter((t) => t.stage === stage || t.stage === 'all')
}

function cellWeight(token: string, x: number, y: number, gridSize: number): number {
  if (token.includes('lake') || token.includes('water')) {
    return y > gridSize * 0.45 ? 0.9 - (y / gridSize) * 0.3 : 0.1
  }
  if (token.includes('sun') || token.includes('set')) {
    return y < gridSize * 0.35 && x > gridSize * 0.55 ? 0.95 : 0.15
  }
  if (token.includes('mount') || token.includes('back')) {
    return y < gridSize * 0.5 && y > gridSize * 0.15 ? 0.85 : 0.12
  }
  if (token.includes('serene') || token === 'a') return 0.35
  return 0.25 + ((x + y) % 3) * 0.1
}

/** Per-token per-cell attention weights (demo, softmax-normalized per cell). */
export function getAttentionWeights(
  tokens: string[],
  gridSize: number,
): number[][] {
  const semantic = tokens.filter((t) => !t.startsWith('<|') && t.length > 0)
  const numCells = gridSize * gridSize
  const raw: number[][] = semantic.map((token) =>
    Array.from({ length: numCells }, (_, i) => {
      const x = i % gridSize
      const y = Math.floor(i / gridSize)
      return cellWeight(token, x, y, gridSize)
    }),
  )

  const cellTotals = Array.from({ length: numCells }, (_, c) =>
    raw.reduce((sum, row) => sum + row[c], 0),
  )

  return raw.map((row) =>
    row.map((w, c) => w / (cellTotals[c] || 1)),
  )
}

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
        const weight = cellWeight(token, x, y, gridSize)
        if (weight > 0.55) cells.push(y * gridSize + x)
      }
    }
    map[i] = cells.length ? cells : [band * gridSize + Math.floor(gridSize / 2)]
  })

  return map
}