export default function VariationManager({
  builtInVariationRows = [],
  openingName,
  savedVariationRows = [],
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
  const duplicateSavedCount = savedVariationRows.filter((row) => row.duplicateOf).length;

  function duplicateLabel(row) {
    if (!row.duplicateOf) return "";
    return row.duplicateOf.saved ? "Duplicate saved line" : "Already built in";
  }

  return (
    <div className="variation-manager">
      <div className="manager-header">
        <div>
          <h3>Variation Manager</h3>
          <p className="muted">Pick a built-in line or manage saved browser variations for {openingName}.</p>
          {duplicateSavedCount > 0 && (
            <p className="muted">Duplicate saved line{duplicateSavedCount === 1 ? "" : "s"} stay stored here, but are skipped during random practice.</p>
          )}
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
          {builtInVariationRows.length === 0 ? (
            <p className="muted">No built-in lines for this opening yet.</p>
          ) : (
            <div className="saved-variation-list">
              {builtInVariationRows.map((row) => (
                <div
                  key={`${row.variation.line}-${row.sourceIndex}`}
                  className={`saved-variation-item ${row.duplicateOf ? "duplicate-variation-item" : ""} ${!row.duplicateOf && selectedVariationIndex === row.playableIndex ? "selected-variation-item" : ""}`}
                >
                  <div>
                    <div className="variation-title-row">
                      <strong>{row.variation.name}</strong>
                      {row.sourceIndex === 0 && <span className="line-type-pill">Main line</span>}
                      {row.duplicateOf && <span className="line-type-pill duplicate-line-pill">{duplicateLabel(row)}</span>}
                      {!row.duplicateOf && selectedVariationIndex === row.playableIndex && <span className="line-type-pill active-line-pill">Current</span>}
                    </div>
                    <code>{row.variation.line}</code>
                  </div>
                  <div className="saved-variation-actions">
                    {row.duplicateOf ? (
                      <span className="duplicate-note">Uses {row.duplicateOf.name} for practice.</span>
                    ) : (
                      <button type="button" onClick={() => onSelectVariation(row.playableIndex)}>
                        {selectedVariationIndex === row.playableIndex ? "Restart this line" : "Practice"}
                      </button>
                    )}
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
              {savedVariationRows.map((row) => (
                <div
                  key={`${row.variation.line}-${row.sourceIndex}`}
                  className={`saved-variation-item ${row.duplicateOf ? "duplicate-variation-item" : ""} ${!row.duplicateOf && selectedVariationIndex === row.playableIndex ? "selected-variation-item" : ""}`}
                >
                  {editingVariationIndex === row.sourceIndex ? (
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
                          <strong>{row.variation.name}</strong>
                          {row.duplicateOf && <span className="line-type-pill duplicate-line-pill">{duplicateLabel(row)}</span>}
                          {!row.duplicateOf && selectedVariationIndex === row.playableIndex && <span className="line-type-pill active-line-pill">Current</span>}
                        </div>
                        <code>{row.variation.line}</code>
                        {row.duplicateOf && <p className="duplicate-note">Already covered by {row.duplicateOf.name}, so this line is skipped in random practice.</p>}
                      </div>
                      <div className="saved-variation-actions">
                        {!row.duplicateOf && (
                          <button type="button" onClick={() => onSelectVariation(row.playableIndex)}>
                            {selectedVariationIndex === row.playableIndex ? "Restart this line" : "Practice"}
                          </button>
                        )}
                        <button type="button" onClick={() => onStartEditingSavedVariation(row.sourceIndex)}>Edit</button>
                        <button type="button" onClick={() => onDuplicateSavedVariation(row.sourceIndex)}>Duplicate</button>
                        <button type="button" className="danger-utility" onClick={() => onDeleteSavedVariation(selectedOpeningId, row.sourceIndex)}>Delete</button>
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
