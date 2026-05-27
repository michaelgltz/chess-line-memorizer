import { useMemo, useState } from "react";
import VariationManager from "./VariationManager.jsx";

const OPENING_CATEGORY_ORDER = ["White repertoire", "Black vs e4", "Black vs d4"];
const CUSTOM_OPTION_SEARCH_TEXT = "custom line custom practice paste any pgn-style move sequence play either color";

function openingMatchesSearch(opening, searchText) {
  const query = searchText.trim().toLowerCase();
  if (!query) return true;

  return [opening.name, opening.category, opening.description]
    .filter(Boolean)
    .some((value) => value.toLowerCase().includes(query));
}

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
  selectedVariationIndex,
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
  onSelectVariation,
  onSetQuizSide,
  onStartEditingSavedVariation,
  onToggleVariationManager,
}) {
  const [openingSearchText, setOpeningSearchText] = useState("");
  const [isOpeningPickerOpen, setIsOpeningPickerOpen] = useState(false);
  const groupedOpenings = useMemo(() => {
    const groups = new Map();

    openings
      .filter((opening) => openingMatchesSearch(opening, openingSearchText))
      .forEach((opening) => {
        const category = opening.category || "Other";
        if (!groups.has(category)) groups.set(category, []);
        groups.get(category).push(opening);
      });

    return [...groups.entries()].sort(([categoryA], [categoryB]) => {
      const indexA = OPENING_CATEGORY_ORDER.indexOf(categoryA);
      const indexB = OPENING_CATEGORY_ORDER.indexOf(categoryB);
      const safeIndexA = indexA === -1 ? OPENING_CATEGORY_ORDER.length : indexA;
      const safeIndexB = indexB === -1 ? OPENING_CATEGORY_ORDER.length : indexB;
      return safeIndexA - safeIndexB || categoryA.localeCompare(categoryB);
    });
  }, [openingSearchText, openings]);
  const customMatchesSearch = CUSTOM_OPTION_SEARCH_TEXT.includes(openingSearchText.trim().toLowerCase());
  const showCustomOption = !openingSearchText.trim() || customMatchesSearch;
  const selectedOpeningLabel = selectedOpeningId === "custom" ? "Custom Practice - paste your own line" : selectedOpening.name;

  function chooseOpeningFromPicker(openingId) {
    onChooseOpening(openingId);
    setOpeningSearchText("");
    setIsOpeningPickerOpen(false);
  }

  return (
    <section className="practice-panel card">
      <div className="practice-header clean-practice-header">
        <div className="practice-title-block">
          <h2>Practice...</h2>
          <p className="muted">Choose an opening and which color to play, then drill a main line, specific line, or random variation.</p>
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
        <label htmlFor="opening-picker">Opening</label>
        <div
          className="opening-picker"
          onBlur={(event) => {
            if (!event.currentTarget.contains(event.relatedTarget)) {
              setIsOpeningPickerOpen(false);
              setOpeningSearchText("");
            }
          }}
        >
          <input
            id="opening-picker"
            aria-label="Search and choose opening"
            aria-expanded={isOpeningPickerOpen}
            aria-controls="opening-picker-results"
            className="opening-search"
            value={isOpeningPickerOpen ? openingSearchText : selectedOpeningLabel}
            onChange={(event) => {
              setOpeningSearchText(event.target.value);
              setIsOpeningPickerOpen(true);
            }}
            onFocus={() => {
              setOpeningSearchText("");
              setIsOpeningPickerOpen(true);
            }}
            onClick={() => {
              setOpeningSearchText("");
              setIsOpeningPickerOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setOpeningSearchText("");
                setIsOpeningPickerOpen(false);
                event.currentTarget.blur();
              }
            }}
            placeholder="Search openings or groups"
            role="combobox"
          />
          {isOpeningPickerOpen && (
            <div id="opening-picker-results" className="opening-picker-results">
              {groupedOpenings.map(([category, categoryOpenings]) => (
                <div key={category} className="opening-picker-group">
                  <div className="opening-picker-group-label">{category}</div>
                  {categoryOpenings.map((opening) => (
                    <button
                      key={opening.id}
                      type="button"
                      className={`opening-picker-option ${selectedOpeningId === opening.id ? "selected" : ""}`}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => chooseOpeningFromPicker(opening.id)}
                    >
                      <span>{opening.name}</span>
                      <small>{opening.description}</small>
                    </button>
                  ))}
                </div>
              ))}
              {showCustomOption && (
                <div className="opening-picker-group opening-picker-custom-group">
                  <div className="opening-picker-group-label">Custom practice</div>
                  <button
                    type="button"
                    className={`opening-picker-option custom-opening-option ${selectedOpeningId === "custom" ? "selected" : ""}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => chooseOpeningFromPicker("custom")}
                  >
                    <span>Custom Line</span>
                    <small>Paste any PGN-style move sequence and play either color.</small>
                  </button>
                </div>
              )}
              {groupedOpenings.length === 0 && !showCustomOption && (
                <p className="opening-search-empty">No openings match that search.</p>
              )}
            </div>
          )}
        </div>
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
          builtInVariations={selectedOpening.variations || []}
          openingName={selectedOpening.name}
          savedForOpening={savedForOpening}
          selectedOpeningId={selectedOpeningId}
          selectedVariationIndex={selectedVariationIndex}
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
          onSelectVariation={onSelectVariation}
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
