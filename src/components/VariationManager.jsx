export default function VariationManager({
  openingName,
  savedForOpening,
  selectedOpeningId,
  manualVariationName,
  manualVariationLine,
  onAddManualVariation,
  onClearAllSavedVariations,
  onClearSavedVariationsForOpening,
  onDeleteSavedVariation,
  onExportSavedVariations,
  onImportSavedVariations,
  onManualVariationLineChange,
  onManualVariationNameChange,
  onSelectSavedVariation,
}) {
  return (
    <div className="variation-manager">
      <div className="manager-header">
        <div>
          <h3>Variation Manager</h3>
          <p className="muted">View, add, select, or delete saved browser variations for {openingName}.</p>
        </div>
      </div>

      <div className="manager-tools">
        <button className="utility-button" onClick={onExportSavedVariations}>Export saved variations</button>
        <label className="import-button utility-button">
          Import variations
          <input type="file" accept="application/json,.json" onChange={onImportSavedVariations} />
        </label>
        <button className="utility-button danger-utility" onClick={onClearSavedVariationsForOpening}>Clear this opening</button>
        <button className="utility-button danger-utility" onClick={onClearAllSavedVariations}>Clear all saved variations</button>
      </div>

      <div className="manager-grid">
        <div className="manager-section">
          <h4>Saved variations</h4>
          {savedForOpening.length === 0 ? (
            <p className="muted">No saved variations for this opening yet.</p>
          ) : (
            <div className="saved-variation-list">
              {savedForOpening.map((variation, index) => (
                <div key={`${variation.line}-${index}`} className="saved-variation-item">
                  <div>
                    <strong>{variation.name}</strong>
                    <code>{variation.line}</code>
                  </div>
                  <div className="saved-variation-actions">
                    <button type="button" onClick={() => onSelectSavedVariation(index)}>Practice</button>
                    <button type="button" className="danger-utility" onClick={() => onDeleteSavedVariation(selectedOpeningId, index)}>Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="manager-section">
          <h4>Add variation from scratch</h4>
          <label>Variation name</label>
          <input
            value={manualVariationName}
            onChange={(event) => onManualVariationNameChange(event.target.value)}
            placeholder="e.g. Englund Bf4 alternate"
          />
          <label>PGN-style line</label>
          <textarea
            value={manualVariationLine}
            onChange={(event) => onManualVariationLineChange(event.target.value)}
            rows={4}
            placeholder="1. d4 e5 2. dxe5 Nc6 3. Bf4"
          />
          <button type="button" onClick={onAddManualVariation}>Add variation</button>
        </div>
      </div>
    </div>
  );
}
