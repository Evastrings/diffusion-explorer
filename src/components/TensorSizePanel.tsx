import {
  formatElements,
  getTensorsForStage,
  type StageId,
} from '../data/pipeline'
import './stages.css'

interface TensorSizePanelProps {
  stage: StageId
  title?: string
  compact?: boolean
}

export function TensorSizePanel({
  stage,
  title = 'Tensor shapes at this stage',
  compact = false,
}: TensorSizePanelProps) {
  const tensors = getTensorsForStage(stage)

  if (compact) {
    return (
      <div className="tensor-compact-row">
        {tensors.map((t) => (
          <div key={t.name} className="tensor-chip">
            <span className="tensor-chip-name">{t.name}</span>
            <span className="tensor-chip-shape mono">{t.shape}</span>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="card tensor-panel">
      <h3>{title}</h3>
      <div className="tensor-table-wrap">
        <table className="tensor-table">
          <thead>
            <tr>
              <th>Tensor</th>
              <th>Shape</th>
              <th>Dtype</th>
              <th>Elements</th>
            </tr>
          </thead>
          <tbody>
            {tensors.map((t) => (
              <tr key={t.name}>
                <td>
                  <span className="tensor-name">{t.name}</span>
                  <span className="tensor-note">{t.note}</span>
                </td>
                <td className="mono tensor-shape">{t.shape}</td>
                <td className="mono">{t.dtype}</td>
                <td className="mono tensor-els">{formatElements(t.elements)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}