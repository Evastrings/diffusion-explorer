import { useMemo, useState } from 'react'
import {
  getAttentionWeights,
  tokenizePrompt,
} from '../data/pipeline'
import { TensorSizePanel } from './TensorSizePanel'
import './stages.css'

interface CrossAttentionStageProps {
  prompt: string
}

const GRID = 12
const TOKEN_COLORS = ['#7c6cf0', '#4ecdc4', '#f4a261', '#ef6461', '#a8dadc', '#e9c46a']

const MECHANISM_STEPS = [
  {
    symbol: 'Q',
    source: 'Latent features',
    shape: '[4096, 320]',
    desc: 'Each of the 64×64 spatial positions projects its feature vector into a query.',
    color: '#f4a261',
  },
  {
    symbol: 'K',
    source: 'CLIP text embeddings',
    shape: '[77, 320]',
    desc: 'Each of the 77 token embeddings is projected into a key vector.',
    color: '#4ecdc4',
  },
  {
    symbol: 'V',
    source: 'CLIP text embeddings',
    shape: '[77, 320]',
    desc: 'Same tokens also produce value vectors — the content to inject.',
    color: '#7c6cf0',
  },
]

export function CrossAttentionStage({ prompt }: CrossAttentionStageProps) {
  const tokens = useMemo(
    () => tokenizePrompt(prompt).filter((t) => !t.startsWith('<|')),
    [prompt],
  )
  const weights = useMemo(() => getAttentionWeights(tokens, GRID), [tokens])
  const [selectedToken, setSelectedToken] = useState(0)
  const [hoverCell, setHoverCell] = useState<number | null>(null)

  const tokenWeights = weights[selectedToken] ?? []
  const maxWeight = Math.max(...tokenWeights, 0.01)

  const cellTokenScores =
    hoverCell !== null
      ? weights.map((row) => row[hoverCell] ?? 0)
      : null

  return (
    <div className="stage-panel">
      <div className="stage-header">
        <h2>Cross-Attention Mechanism</h2>
        <p>
          Cross-attention is how text steers image generation. Spatial latent features
          <em> query</em> CLIP text keys, softmax-normalize scores, then blend value vectors
          back into the image representation.
        </p>
      </div>

      <div className="card cross-formula">
        <h3>The equation</h3>
        <div className="formula-box mono">
          Attention(Q, K, V) = softmax( QK<sup>T</sup> / √d<sub>k</sub> ) · V
        </div>
        <div className="formula-legend">
          <span><strong className="q-color">Q</strong> from image · <strong className="k-color">K</strong>/<strong className="v-color">V</strong> from text · d<sub>k</sub>=320 per head</span>
        </div>
      </div>

      <div className="card">
        <h3>Q, K, V projections</h3>
        <div className="qkv-grid">
          {MECHANISM_STEPS.map((step) => (
            <div
              key={step.symbol}
              className="qkv-card"
              style={{ '--qkv-color': step.color } as React.CSSProperties}
            >
              <span className="qkv-symbol">{step.symbol}</span>
              <span className="qkv-source">{step.source}</span>
              <span className="qkv-shape mono">{step.shape}</span>
              <p>{step.desc}</p>
            </div>
          ))}
        </div>
        <div className="qkv-flow">
          <div className="qkv-flow-node latent-node">
            <span>Latent zₜ</span>
            <span className="mono">[1, 4, 64, 64]</span>
          </div>
          <div className="qkv-flow-arrow">→ project → <strong className="q-color">Q</strong></div>
          <div className="qkv-flow-node scores-node">
            <span>Scores</span>
            <span className="mono">[4096, 77]</span>
          </div>
          <div className="qkv-flow-arrow">× <strong className="v-color">V</strong> →</div>
          <div className="qkv-flow-node out-node">
            <span>Updated features</span>
            <span className="mono">[1, 4096, 320]</span>
          </div>
        </div>
        <div className="qkv-flow text-branch">
          <div className="qkv-flow-node text-node">
            <span>CLIP context</span>
            <span className="mono">[1, 77, 768]</span>
          </div>
          <div className="qkv-flow-arrow">→ project → <strong className="k-color">K</strong> + <strong className="v-color">V</strong></div>
        </div>
      </div>

      <div className="grid-2 cross-grid">
        <div className="card">
          <h3>Attention heatmap (token → space)</h3>
          <p className="attn-hint">
            Rows = text tokens, columns = spatial bands (12-wide slice of 64×64).
            Brighter = higher attention weight after softmax.
          </p>
          <div className="heatmap-wrap">
            <div
              className="heatmap-labels-y"
              style={{ '--rows': tokens.length } as React.CSSProperties}
            >
              {tokens.map((t, i) => (
                <button
                  key={`${t}-${i}`}
                  type="button"
                  className={`heatmap-token-label ${selectedToken === i ? 'active' : ''}`}
                  style={{ color: TOKEN_COLORS[i % TOKEN_COLORS.length] }}
                  onClick={() => setSelectedToken(i)}
                >
                  {t}
                </button>
              ))}
            </div>
            <div
              className="heatmap heatmap-scroll"
              style={{
                gridTemplateColumns: `repeat(${GRID}, 1fr)`,
                gridTemplateRows: `repeat(${tokens.length}, 1fr)`,
              }}
            >
              {tokens.map((_, ti) =>
                Array.from({ length: GRID }, (_, col) => {
                  const rowWeights = Array.from({ length: GRID }, (_, row) =>
                    weights[ti]?.[row * GRID + col] ?? 0,
                  )
                  const w = rowWeights.reduce((a, b) => a + b, 0) / GRID
                  const bright = selectedToken === ti ? w / maxWeight : w * 0.5
                  return (
                    <div
                      key={`${ti}-${col}`}
                      className={`heatmap-cell ${selectedToken === ti ? 'row-active' : ''}`}
                      style={{
                        background: TOKEN_COLORS[ti % TOKEN_COLORS.length],
                        opacity: 0.08 + bright * 0.92,
                      }}
                      title={`${tokens[ti]} → col ${col}: ${(w * 100).toFixed(1)}%`}
                    />
                  )
                }),
              )}
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Spatial view — selected token</h3>
          <p className="attn-hint">
            Token <span className="mono" style={{ color: TOKEN_COLORS[selectedToken % TOKEN_COLORS.length] }}>{tokens[selectedToken]}</span>
            {' '}— hover cells to see which tokens compete for that region.
          </p>
          <div
            className="spatial-attn-grid"
            style={{ gridTemplateColumns: `repeat(${GRID}, 1fr)` }}
          >
            {Array.from({ length: GRID * GRID }, (_, ci) => {
              const w = tokenWeights[ci] ?? 0
              const intensity = w / maxWeight
              return (
                <div
                  key={ci}
                  className="spatial-attn-cell"
                  style={{
                    background: TOKEN_COLORS[selectedToken % TOKEN_COLORS.length],
                    opacity: 0.1 + intensity * 0.9,
                    outline: hoverCell === ci ? '2px solid var(--accent-2)' : undefined,
                  }}
                  onMouseEnter={() => setHoverCell(ci)}
                  onMouseLeave={() => setHoverCell(null)}
                />
              )
            })}
          </div>

          {hoverCell !== null && cellTokenScores && (
            <div className="cell-breakdown">
              <span className="breakdown-title">
                Token mix at cell ({hoverCell % GRID}, {Math.floor(hoverCell / GRID)}):
              </span>
              <div className="breakdown-bars">
                {tokens.map((t, i) => (
                  <div key={t} className="breakdown-row">
                    <span className="mono" style={{ color: TOKEN_COLORS[i % TOKEN_COLORS.length] }}>{t}</span>
                    <div className="breakdown-track">
                      <div
                        className="breakdown-fill"
                        style={{
                          width: `${(cellTokenScores[i] ?? 0) * 100}%`,
                          background: TOKEN_COLORS[i % TOKEN_COLORS.length],
                        }}
                      />
                    </div>
                    <span className="mono breakdown-pct">
                      {((cellTokenScores[i] ?? 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="callout">
            <strong>Why cross-attention?</strong> Self-attention only mixes image regions
            with each other. Cross-attention opens a channel from text to every spatial
            position — &ldquo;sunset&rdquo; literally boosts features in the sky region.
          </div>
        </div>
      </div>

      <TensorSizePanel stage="crossattn" title="Tensor sizes in cross-attention (per layer)" />
    </div>
  )
}