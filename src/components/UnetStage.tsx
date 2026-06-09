import { useEffect, useMemo, useState } from 'react'
import { DENOISE_STEPS, getAttentionMap, tokenizePrompt } from '../data/pipeline'
import './stages.css'

interface UnetStageProps {
  prompt: string
}

const GRID = 16
const TOKEN_COLORS = ['#7c6cf0', '#4ecdc4', '#f4a261', '#ef6461', '#a8dadc', '#e9c46a']

export function UnetStage({ prompt }: UnetStageProps) {
  const tokens = useMemo(
    () => tokenizePrompt(prompt).filter((t) => !t.startsWith('<|')),
    [prompt],
  )
  const attentionMap = useMemo(() => getAttentionMap(tokens, GRID), [tokens])
  const [stepIdx, setStepIdx] = useState(0)
  const [selectedToken, setSelectedToken] = useState(0)
  const [playing, setPlaying] = useState(false)

  const step = DENOISE_STEPS[stepIdx]
  const activeCells = attentionMap[selectedToken] ?? []

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setStepIdx((prev) => {
        if (prev >= DENOISE_STEPS.length - 1) {
          setPlaying(false)
          return prev
        }
        return prev + 1
      })
    }, 900)
    return () => clearInterval(id)
  }, [playing])

  return (
    <div className="stage-panel">
      <div className="stage-header">
        <h2>U-Net Denoising in Latent Space</h2>
        <p>
          The U-Net operates on a 64×64×4 latent tensor. At each timestep it predicts noise
          to remove. Cross-attention layers let text tokens influence specific spatial regions.
        </p>
      </div>

      <div className="grid-2 unet-grid">
        <div className="card">
          <h3>Latent grid (64×64 → shown as 16×16)</h3>
          <div
            className="latent-grid"
            style={{ '--noise': step.noise } as React.CSSProperties}
          >
            {Array.from({ length: GRID * GRID }, (_, i) => {
              const x = i % GRID
              const y = Math.floor(i / GRID)
              const attended = activeCells.includes(i)
              const structure =
                step.noise < 0.8
                  ? (y > GRID * 0.5 ? 0.15 : 0) +
                    (y < GRID * 0.4 && x > GRID * 0.5 ? 0.2 : 0) +
                    (y < GRID * 0.45 && y > GRID * 0.2 ? 0.12 : 0)
                  : 0

              return (
                <div
                  key={i}
                  className={`latent-cell ${attended ? 'attended' : ''}`}
                  style={{
                    opacity: 1 - step.noise * 0.65 + structure,
                    background: attended
                      ? `color-mix(in srgb, ${TOKEN_COLORS[selectedToken % TOKEN_COLORS.length]} 70%, transparent)`
                      : undefined,
                  }}
                />
              )
            })}
          </div>

          <div className="slider-row">
            <button
              type="button"
              className="play-btn"
              onClick={() => {
                if (stepIdx >= DENOISE_STEPS.length - 1) setStepIdx(0)
                setPlaying(true)
              }}
              disabled={playing}
            >
              {playing ? 'Running…' : 'Animate denoising'}
            </button>
            <input
              type="range"
              min={0}
              max={DENOISE_STEPS.length - 1}
              value={stepIdx}
              onChange={(e) => {
                setPlaying(false)
                setStepIdx(Number(e.target.value))
              }}
            />
            <output>
              {step.label} ({step.step}/50)
            </output>
          </div>
        </div>

        <div className="card">
          <h3>Cross-attention: text → space</h3>
          <p className="attn-hint">
            Click a token to see which latent regions it attends to (simplified demo).
          </p>
          <div className="token-attn-list">
            {tokens.map((token, i) => (
              <button
                key={`${token}-${i}`}
                type="button"
                className={`attn-token-btn ${selectedToken === i ? 'active' : ''}`}
                style={{ '--token-color': TOKEN_COLORS[i % TOKEN_COLORS.length] } as React.CSSProperties}
                onClick={() => setSelectedToken(i)}
              >
                <span className="mono">{token}</span>
                <svg className="attn-lines" viewBox="0 0 120 40" aria-hidden="true">
                  <path
                    d={`M 0 20 Q 40 ${10 + (i % 3) * 10} 80 20`}
                    fill="none"
                    stroke={TOKEN_COLORS[i % TOKEN_COLORS.length]}
                    strokeWidth="2"
                    opacity={selectedToken === i ? 1 : 0.25}
                  />
                  <circle
                    cx="110"
                    cy="20"
                    r="6"
                    fill={TOKEN_COLORS[i % TOKEN_COLORS.length]}
                    opacity={selectedToken === i ? 1 : 0.25}
                  />
                </svg>
              </button>
            ))}
          </div>

          <div className="unet-arch">
            <div className="arch-block">Noisy latent zₜ</div>
            <div className="arch-arrow">+</div>
            <div className="arch-block highlight">Timestep t</div>
            <div className="arch-arrow">+</div>
            <div className="arch-block highlight">Text context</div>
            <div className="arch-arrow">→</div>
            <div className="arch-block">U-Net blocks</div>
            <div className="arch-arrow">→</div>
            <div className="arch-block">Predicted noise ε</div>
          </div>

          <div className="callout">
            <strong>Classifier-free guidance:</strong> The model runs twice — once with
            your prompt, once with an empty prompt — then steers the result toward the
            text-conditioned prediction. That&apos;s why prompts have such strong effect.
          </div>
        </div>
      </div>

      <div className="card">
        <h3>Inside a U-Net block</h3>
        <div className="block-diagram">
          <div className="block-col">
            <span className="block-title">Spatial (self-attn)</span>
            <div className="block-visual self">
              {Array.from({ length: 9 }, (_, i) => (
                <div key={i} className="mini-cell" />
              ))}
            </div>
            <span className="block-caption">Pixels attend to each other</span>
          </div>
          <div className="block-connector">→</div>
          <div className="block-col">
            <span className="block-title">Cross-attn (text)</span>
            <div className="block-visual cross">
              <div className="cross-text">
                {tokens.slice(0, 3).map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>
              <div className="cross-arrows">⇅</div>
              <div className="cross-grid">
                {Array.from({ length: 9 }, (_, i) => (
                  <div key={i} className="mini-cell lit" />
                ))}
              </div>
            </div>
            <span className="block-caption">Q from image, K/V from CLIP</span>
          </div>
          <div className="block-connector">→</div>
          <div className="block-col">
            <span className="block-title">Feed-forward</span>
            <div className="block-visual ffn">
              <div className="ffn-bar" />
              <div className="ffn-bar" />
              <div className="ffn-bar" />
            </div>
            <span className="block-caption">Refine features per cell</span>
          </div>
        </div>
      </div>
    </div>
  )
}