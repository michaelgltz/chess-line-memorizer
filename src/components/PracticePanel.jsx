import VariationManager from "./VariationManager.jsx";

export default function PracticePanel({
  customLineText,
  editingVariationIndex,
  editingVariationLine,
  editingVariationName,
  manualVariationLine,
  manualVariationName,
  openings,
  quizSide,
  savedForOpening,
  selectedOpening,
  selectedOpeningId,
  showCustomEditor,
  showVariationManager,
  onAddManualVariation,
  onChooseOpening,
  onClearAllSavedVariations,
  onClearSavedVariationsForOpening,
  onCustomLineTextChange,
  onCancelEditingSavedVariation,
  onDeleteSavedVariation,
  onDuplicateSavedVariation,
  onEditingVariationLineChange,
  onEditingVariationNameChange,
  onExportSavedVariations,
  onImportSavedVariations,
  onManualVariationLineChange,
  onManualVariationNameChange,
  onResetMainLine,
  onResetQuiz,
  onSaveEditedVariation,
  onSelectSavedVariation,
  onSetQuizSide,
  onStartEditingSavedVariation,
  onToggleVariationManager,
}) {
  return (
    <section className="practice-panel card">
      <div className="practice-header clean-practice-header">
        <div className="practice-title-block">
          <h2>Practice...</h2>
          <p className="muted">Choose an opening and which color to play, then drill a main line or a random saved variation.</p>
        </div>
      </div>

      <div className="practice-actions refined-actions">
        <button className="primary-action" onClick={onResetMainLine}>Restart main line</button>
        <button onClick={() => onResetQuiz(true)}>Restart random variation</button>
        <div className="utility-actions">
          <button className="utility-button" onClick={onToggleVariationManager}>
            {showVariationManager ? "Hide manager" : "Variation manager"}
          </button>
        </div>
      </div>

      <div className="opening-select-row">
        <label htmlFor="opening-select">Opening</label>
        <select
          id="opening-select"
          value={selectedOpeningId}
          onChange={(event) => onChooseOpening(event.target.value)}
        >
          {openings.map((opening) => (
            <option key={opening.id} value={opening.id}>
              {opening.name}
            </option>
          ))}
          <option value="custom">Custom Line</option>
        </select>
        <p className="opening-select-description">
          {selectedOpeningId === "custom" ? "Paste any PGN-style move sequence and play either color." : selectedOpening.description}
        </p>
      </div>

      {selectedOpeningId !== "custom" && (
        <div className="opening-side-selector">
          <span>Play color</span>
          <button
            className={quizSide === "White" ? "active" : ""}
            onClick={() => {
              onSetQuizSide("White");
              onResetQuiz(true);
            }}
          >
            White
          </button>
          <button
            className={quizSide === "Black" ? "active" : ""}
            onClick={() => {
              onSetQuizSide("Black");
              onResetQuiz(true);
            }}
          >
            Black
          </button>
        </div>
      )}

      {showVariationManager && selectedOpeningId !== "custom" && (
        <VariationManager
          openingName={selectedOpening.name}
          savedForOpening={savedForOpening}
          selectedOpeningId={selectedOpeningId}
          editingVariationIndex={editingVariationIndex}
          editingVariationName={editingVariationName}
          editingVariationLine={editingVariationLine}
          manualVariationName={manualVariationName}
          manualVariationLine={manualVariationLine}
          onAddManualVariation={onAddManualVariation}
          onCancelEditingSavedVariation={onCancelEditingSavedVariation}
          onClearAllSavedVariations={onClearAllSavedVariations}
          onClearSavedVariationsForOpening={onClearSavedVariationsForOpening}
          onDeleteSavedVariation={onDeleteSavedVariation}
          onDuplicateSavedVariation={onDuplicateSavedVariation}
          onEditingVariationLineChange={onEditingVariationLineChange}
          onEditingVariationNameChange={onEditingVariationNameChange}
          onExportSavedVariations={onExportSavedVariations}
          onImportSavedVariations={onImportSavedVariations}
          onManualVariationLineChange={onManualVariationLineChange}
          onManualVariationNameChange={onManualVariationNameChange}
          onSaveEditedVariation={onSaveEditedVariation}
          onSelectSavedVariation={onSelectSavedVariation}
          onStartEditingSavedVariation={onStartEditingSavedVariation}
        />
      )}

      {selectedOpeningId === "custom" && showCustomEditor && (
        <div className="custom-editor">
          <label>Custom repertoire line</label>
          <textarea
            value={customLineText}
            onChange={(event) => {
              onCustomLineTextChange(event.target.value);
              onResetQuiz(false);
            }}
            rows={5}
          />
          <div className="button-row">
            <button className={quizSide === "White" ? "active" : ""} onClick={() => onSetQuizSide("White")}>
              Play White
            </button>
            <button className={quizSide === "Black" ? "active" : ""} onClick={() => onSetQuizSide("Black")}>
              Play Black
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
