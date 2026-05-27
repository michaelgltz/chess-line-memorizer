export default function VariationManager({
  builtInVariations = [],
  openingName,
  savedForOpening,
  selectedOpeningId,
  selectedVariationIndex,
  editingVariationIndex,
  editingVariationName,
  editingVariationLine,
  manualVariationName,
  manualVariationLine,
  onAddManualVariation,
  onCancelEditingSavedVariation,
  onClearAllSavedVariations,
  onClearSavedVariationsForOpening,
  onDeleteSavedVariation,
  onDuplicateSavedVariation,
  onEditingVariationNameChange,
  onEditingVariationLineChange,
  onExportSavedVariations,
  onImportSavedVariations,
  onManualVariationLineChange,
  onManualVariationNameChange,
  onSaveEditedVariation,
  onSelectVariation,
  onStartEditingSavedVariation,
}) {
  const savedVariationStartIndex = builtInVariations.length;

  return (
    <div className="variation-manager">
      <div className="manager-header">
        <div>
          <h3>Variation Manager</h3>
          <p className="muted">Pick a built-in line or manage saved browser variations for {openingName}.</p>
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
          <h4>Built-in lines</h4>
          {builtInVariations.length === 0 ? (
            <p className="muted">No built-in lines for this opening yet.</p>
          ) : (
            <div className="saved-variation-list">
              {builtInVariations.map((variation, index) => (
                <div
                  key={`${variation.line}-${index}`}
                  className={`saved-variation-item ${selectedVariationIndex === index ? "selected-variation-item" : ""}`}
                >
                  <div>
                    <div className="variation-title-row">
                      <strong>{variation.name}</strong>
                      {index === 0 && <span className="line-type-pill">Main line</span>}
                      {selectedVariationIndex === index && <span className="line-type-pill active-line-pill">Current</span>}
                    </div>
                    <code>{variation.line}</code>
                  </div>
                  <div className="saved-variation-actions">
                    <button type="button" onClick={() => onSelectVariation(index)}>
                      {selectedVariationIndex === index ? "Restart this line" : "Practice"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <h4>Saved variations</h4>
          {savedForOpening.length === 0 ? (
            <p className="muted">No saved variations for this opening yet.</p>
          ) : (
            <div className="saved-variation-list">
              {savedForOpening.map((variation, index) => (
                <div
                  key={`${variation.line}-${index}`}
                  className={`saved-variation-item ${selectedVariationIndex === savedVariationStartIndex + index ? "selected-variation-item" : ""}`}
                >
                  {editingVariationIndex === index ? (
                    <div className="saved-variation-edit">
                      <label>Variation name</label>
                      <input
                        value={editingVariationName}
                        onChange={(event) => onEditingVariationNameChange(event.target.value)}
                      />
                      <label>PGN-style line</label>
                      <textarea
                        value={editingVariationLine}
                        onChange={(event) => onEditingVariationLineChange(event.target.value)}
                        rows={4}
                      />
                      <div className="saved-variation-actions">
                        <button type="button" onClick={onSaveEditedVariation}>Save changes</button>
                        <button type="button" onClick={onCancelEditingSavedVariation}>Cancel</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <div className="variation-title-row">
                          <strong>{variation.name}</strong>
                          {selectedVariationIndex === savedVariationStartIndex + index && <span className="line-type-pill active-line-pill">Current</span>}
                        </div>
                        <code>{variation.line}</code>
                      </div>
                      <div className="saved-variation-actions">
                        <button type="button" onClick={() => onSelectVariation(savedVariationStartIndex + index)}>
                          {selectedVariationIndex === savedVariationStartIndex + index ? "Restart this line" : "Practice"}
                        </button>
                        <button type="button" onClick={() => onStartEditingSavedVariation(index)}>Edit</button>
                        <button type="button" onClick={() => onDuplicateSavedVariation(index)}>Duplicate</button>
                        <button type="button" className="danger-utility" onClick={() => onDeleteSavedVariation(selectedOpeningId, index)}>Delete</button>
                      </div>
                    </>
                  )}
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
