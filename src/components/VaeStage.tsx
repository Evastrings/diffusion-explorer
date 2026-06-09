import { useEffect, useState } from 'react'
import { TensorSizePanel } from './TensorSizePanel'
import './stages.css'

interface VaeStageProps {
  prompt: string
}

export function VaeStage({ prompt }: VaeStageProps) {
  const [progress, setProgress] = useState(0)
  const [playing, setPlaying] = useState(false)

  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          setPlaying(false)
          return 100
        }
        return p + 2
      })
    }, 40)
    return () => clearInterval(id)
  }, [playing])

  const scale = 1 + (progress / 100) * 7

  return (
    <div className="stage-panel">
      <div className="stage-header">
        <h2>VAE Decoder — Latent to Image</h2>
        <p>
          After denoising, the 64×64×4 latent tensor is passed through the VAE decoder,
          which upsamples it 8× to a 512×512 RGB image with learned detail reconstruction.
        </p>
      </div>

      <div className="card vae-hero">
        <h3>8× spatial upscale</h3>
        <div className="vae-comparison">
          <div className="vae-side">
            <span className="vae-label">Latent (64×64×4)</span>
            <div className="latent-thumb">
              <div className="latent-thumb-inner" />
            </div>
            <span className="vae-dims mono">4 channels · compressed semantics</span>
          </div>

          <div className="vae-middle">
            <div className="vae-decoder-box">
              <span>VAE Decoder</span>
              <div className="decoder-layers">
                <div>Conv + upsample</div>
                <div>Conv + upsample</div>
                <div>Conv → RGB</div>
              </div>
            </div>
            <div className="scale-badge">×8</div>
          </div>

          <div className="vae-side">
            <span className="vae-label">Image (512×512×3)</span>
            <div
              className="image-thumb"
              style={{ '--p': progress / 100 } as React.CSSProperties}
            >
              <div className="image-scene">
                <div className="scene-sky" />
                <div className="scene-sun" />
                <div className="scene-mountains" />
                <div className="scene-lake" />
              </div>
              <div
                className="upscale-overlay"
                style={{ transform: `scale(${scale})`, opacity: 1 - progress / 100 }}
              />
            </div>
            <span className="vae-dims mono">3 channels · sRGB pixels</span>
          </div>
        </div>

        <div className="slider-row">
          <button
            type="button"
            className="play-btn"
            onClick={() => {
              setProgress(0)
              setPlaying(true)
            }}
            disabled={playing}
          >
            {playing ? 'Decoding…' : 'Animate upscale'}
          </button>
          <input
            type="range"
            min={0}
            max={100}
            value={progress}
            onChange={(e) => {
              setPlaying(false)
              setProgress(Number(e.target.value))
            }}
          />
          <output>{progress}% decoded</output>
        </div>
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>What the VAE learned</h3>
          <ul className="fact-list">
            <li>
              <span className="fact-label">Encoder</span>
              <span>Trained to squash images into a smooth latent space (used in training)</span>
            </li>
            <li>
              <span className="fact-label">Decoder</span>
              <span>Reconstructs plausible pixels from latent codes — adds texture & color</span>
            </li>
            <li>
              <span className="fact-label">Not in the loop</span>
              <span>During generation, only the decoder runs; the U-Net never sees RGB</span>
            </li>
          </ul>
        </div>

        <div className="card">
          <h3>Final output</h3>
          <p className="prompt-display mono">&ldquo;{prompt || '…'}&rdquo;</p>
          <div className="final-image-frame">
            <div className="image-scene large">
              <div className="scene-sky" />
              <div className="scene-sun" />
              <div className="scene-mountains" />
              <div className="scene-lake" />
            </div>
          </div>
          <div className="callout">
            <strong>Result:</strong> A 512×512 image whose global layout was shaped by
            denoising in latent space and whose fine details were filled in by the VAE decoder.
          </div>
        </div>
      </div>

      <TensorSizePanel stage="vae" />
    </div>
  )
}