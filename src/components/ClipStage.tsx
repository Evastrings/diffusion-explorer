import { tokenizePrompt } from '../data/pipeline'
import { TensorSizePanel } from './TensorSizePanel'
import './stages.css'

interface ClipStageProps {
  prompt: string
}

const TOKEN_COLORS = [
  '#7c6cf0',
  '#4ecdc4',
  '#f4a261',
  '#ef6461',
  '#a8dadc',
  '#e9c46a',
  '#9b5de5',
  '#00bbf9',
]

export function ClipStage({ prompt }: ClipStageProps) {
  const tokens = tokenizePrompt(prompt)
  const semanticTokens = tokens.filter((t) => !t.startsWith('<|'))

  return (
    <div className="stage-panel">
      <div className="stage-header">
        <h2>CLIP Text Encoding</h2>
        <p>
          CLIP&apos;s tokenizer splits your prompt into sub-word tokens (BPE). Each token
          maps to a learned embedding vector that the U-Net attends to spatially.
        </p>
      </div>

      <div className="card">
        <h3>Step 1 — Raw prompt</h3>
        <div className="text-pipeline">
          <div className="pipeline-box input-box">
            <span className="box-label">Input string</span>
            <code>{prompt || '(empty)'}</code>
          </div>
          <div className="pipeline-arrow">↓</div>
          <div className="pipeline-box">
            <span className="box-label">CLIP Tokenizer (BPE)</span>
            <span className="box-hint">Splits on vocabulary; max 77 tokens</span>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Step 2 — Token sequence</h3>
        <div className="token-stream">
          {tokens.map((token, i) => {
            const isSpecial = token.startsWith('<|')
            const colorIdx = semanticTokens.indexOf(token)
            return (
              <div
                key={`${token}-${i}`}
                className={`token-chip ${isSpecial ? 'special' : ''}`}
                style={
                  !isSpecial
                    ? ({ '--chip-color': TOKEN_COLORS[colorIdx % TOKEN_COLORS.length] } as React.CSSProperties)
                    : undefined
                }
              >
                <span className="token-idx">{i}</span>
                <span className="token-text mono">{token}</span>
              </div>
            )
          })}
        </div>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: '#3d4258' }} />
            Special tokens (start / end)
          </div>
          <div className="legend-item">
            <span className="legend-swatch" style={{ background: TOKEN_COLORS[0] }} />
            Semantic tokens → unique embedding each
          </div>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Step 3 — Token embeddings</h3>
          <div className="embedding-viz">
            {semanticTokens.slice(0, 6).map((token, i) => (
              <div key={token} className="embed-row">
                <span className="embed-label mono">{token}</span>
                <div className="embed-bars">
                  {Array.from({ length: 24 }, (_, j) => (
                    <div
                      key={j}
                      className="embed-bar"
                      style={{
                        height: `${20 + Math.sin(i * 2.1 + j * 0.7) * 15 + ((i + j) % 5) * 4}%`,
                        background: TOKEN_COLORS[i % TOKEN_COLORS.length],
                        opacity: 0.5 + (j % 4) * 0.12,
                      }}
                    />
                  ))}
                </div>
                <span className="embed-dim">768-d</span>
              </div>
            ))}
            {semanticTokens.length > 6 && (
              <p className="embed-more">+ {semanticTokens.length - 6} more token vectors…</p>
            )}
          </div>
        </div>

        <div className="card">
          <h3>Step 4 — Context tensor</h3>
          <div className="context-matrix">
            <div className="matrix-grid">
              {Array.from({ length: 77 * 4 }, (_, i) => {
                const row = Math.floor(i / 4)
                const active = row < tokens.length
                return (
                  <div
                    key={i}
                    className={`matrix-cell ${active ? 'active' : 'pad'}`}
                    style={{
                      opacity: active ? 0.3 + (i % 7) * 0.1 : 0.08,
                    }}
                  />
                )
              })}
            </div>
            <div className="matrix-labels">
              <span>77 tokens</span>
              <span>×</span>
              <span>768 dimensions</span>
            </div>
          </div>
          <div className="callout">
            <strong>Output:</strong> A tensor of shape{' '}
            <span className="mono">[1, 77, 768]</span> passed to every cross-attention
            block in the U-Net. Padding tokens are masked out.
          </div>
        </div>
      </div>

      <TensorSizePanel stage="clip" />
    </div>
  )
}