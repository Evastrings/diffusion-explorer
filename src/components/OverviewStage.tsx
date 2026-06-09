import './stages.css'

interface OverviewStageProps {
  prompt: string
}

const STEPS = [
  { id: 1, title: 'Text Prompt', detail: 'User writes a natural-language description', color: '#7c6cf0' },
  { id: 2, title: 'CLIP Encoder', detail: 'Tokenizer → token embeddings (77 tokens max)', color: '#4ecdc4' },
  { id: 3, title: 'Latent Noise', detail: 'Random 64×64×4 tensor in latent space', color: '#8b92a8' },
  { id: 4, title: 'U-Net + CFG', detail: '~50 denoising steps with cross-attention to text', color: '#f4a261' },
  { id: 5, title: 'VAE Decoder', detail: 'Latent → 512×512 RGB image (8× upscale)', color: '#ef6461' },
]

export function OverviewStage({ prompt }: OverviewStageProps) {
  return (
    <div className="stage-panel">
      <div className="stage-header">
        <h2>The Stable Diffusion Pipeline</h2>
        <p>
          Text-to-image models don&apos;t paint pixels directly. They denoise a compact
          latent representation while CLIP text embeddings steer what appears where.
        </p>
      </div>

      <div className="card overview-flow">
        <h3>End-to-end flow</h3>
        <div className="flow-track">
          {STEPS.map((step, i) => (
            <div key={step.id} className="flow-node-wrap">
              <div className="flow-node" style={{ '--node-color': step.color } as React.CSSProperties}>
                <span className="flow-num">{step.id}</span>
                <strong>{step.title}</strong>
                <span className="flow-detail">{step.detail}</span>
              </div>
              {i < STEPS.length - 1 && <div className="flow-arrow" aria-hidden="true">→</div>}
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>Your prompt</h3>
          <p className="prompt-display mono">&ldquo;{prompt || '…'}&rdquo;</p>
          <div className="callout">
            <strong>Key idea:</strong> The prompt never touches pixels directly. CLIP turns
            it into a sequence of 768-dim vectors that the U-Net reads via cross-attention
            at every layer.
          </div>
        </div>

        <div className="card">
          <h3>Why latent space?</h3>
          <ul className="fact-list">
            <li>
              <span className="fact-label">512×512 RGB</span>
              <span>786,432 values per step — too slow</span>
            </li>
            <li>
              <span className="fact-label">64×64 latent</span>
              <span>16,384 values — 48× smaller, same semantics</span>
            </li>
            <li>
              <span className="fact-label">VAE</span>
              <span>Learned compressor/expander between pixel and latent worlds</span>
            </li>
          </ul>
        </div>
      </div>

      <div className="card diffusion-demo">
        <h3>Diffusion intuition</h3>
        <div className="noise-strip">
          {[1, 0.75, 0.5, 0.25, 0.05].map((noise, i) => (
            <div key={i} className="noise-frame">
              <div
                className="noise-visual"
                style={{ '--noise': noise } as React.CSSProperties}
              />
              <span>
                {i === 0 && 't = T (noise)'}
                {i === 4 && 't = 0 (signal)'}
                {i > 0 && i < 4 && `step ${i * 12}`}
              </span>
            </div>
          ))}
        </div>
        <p className="diffusion-caption">
          Forward process adds noise; the U-Net learns to reverse it. Each step predicts
          and removes a little noise, guided by your text embeddings.
        </p>
      </div>
    </div>
  )
}