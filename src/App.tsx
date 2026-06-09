import { useState } from 'react'
import { DEFAULT_PROMPT, STAGES, type StageId } from './data/pipeline'
import { OverviewStage } from './components/OverviewStage'
import { ClipStage } from './components/ClipStage'
import { CrossAttentionStage } from './components/CrossAttentionStage'
import { UnetStage } from './components/UnetStage'
import { VaeStage } from './components/VaeStage'
import './App.css'

function App() {
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT)
  const [stage, setStage] = useState<StageId>('overview')

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <h1>Diffusion Explorer</h1>
          <p>Visual guide to how Stable Diffusion turns text into images</p>
        </div>
      </header>

      <div className="prompt-bar">
        <label>
          <span>Your prompt</span>
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Describe an image…"
          />
        </label>
      </div>

      <nav className="stage-nav" aria-label="Pipeline stages">
        {STAGES.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`stage-btn ${stage === s.id ? 'active' : ''}`}
            onClick={() => setStage(s.id)}
          >
            {s.shortLabel}
          </button>
        ))}
      </nav>

      <main className="main">
        {stage === 'overview' && <OverviewStage prompt={prompt} />}
        {stage === 'clip' && <ClipStage prompt={prompt} />}
        {stage === 'crossattn' && <CrossAttentionStage prompt={prompt} />}
        {stage === 'unet' && <UnetStage prompt={prompt} />}
        {stage === 'vae' && <VaeStage prompt={prompt} />}
      </main>

      <footer className="footer">
        Educational visualization — simplified for clarity, not exact model internals
      </footer>
    </div>
  )
}

export default App