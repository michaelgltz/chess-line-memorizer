export default function CurrentLineCard({
  currentIndex,
  currentMove,
  currentSide,
  dynamicAnalysis,
  dynamicAnalysisStatus,
  extensionBaseMoves,
  extensionMode,
  extensionMoveMode,
  extensionMoves,
  extensionName,
  extensionThresholdCp,
  extensionTopMoveStatus,
  feedback,
  filteredExtensionTopMoves,
  freePlayMode,
  freePlayMoves,
  historyItems,
  isDone,
  isQuizTurn,
  isReviewing,
  lesson,
  lessonStep,
  moves,
  opponentThinking,
  progress,
  quizSide,
  savedForOpening,
  selectedOpening,
  selectedOpeningId,
  selectedVariation,
  showAnswer,
  shownFen,
  viewIndex,
  wrongAttemptsThisMove,
  formatTopMoveOption,
  moveNumberForIndex,
  onAdvance,
  onCancelExtensionMode,
  onClearReview,
  onOpenLesson,
  onResetQuiz,
  onSaveExtendedVariation,
  onSavePlayableAlternative,
  onSetExtensionMoveMode,
  onSetExtensionName,
  onSetExtensionThresholdCp,
  onSetLesson,
  onSetLessonStep,
  onSetShowAnswer,
  onSetViewIndex,
  onStartExtensionFromPlayableAlternative,
  onStartFreePlay,
  onStopFreePlay,
}) {
  return (
    <div className="card">
      <div className="quiz-header">
        <div>
          <p className="eyebrow">Current line</p>
          <h2>{selectedOpeningId === "custom" ? "Custom Line" : selectedOpening.name}</h2>
          {selectedOpeningId !== "custom" && <p className="variation-name">Variation: {selectedVariation.name}{selectedVariation.saved ? " · saved" : ""}</p>}
          {selectedOpeningId !== "custom" && savedForOpening.length > 0 && (
            <p className="variation-name">Saved variations: {savedForOpening.length}</p>
          )}
        </div>
        <span>{progress}% complete</span>
      </div>

      <div className="side-row">
        <span className="pill">Playing {quizSide}</span>
        <span className="pill muted-pill">Move {Math.min(currentIndex + 1, moves.length || 1)} of {moves.length}</span>
        {isReviewing && <button className="small-button" onClick={onClearReview}>Return to current position</button>}
      </div>

      <div className="progress-bar"><div style={{ width: `${progress}%` }} /></div>

      <div className="moves-box">
        <div className="label">Moves played — click any move to review that position</div>
        <div className="move-history">
          {historyItems.length === 0 ? (
            <span className="moves-text">Start position</span>
          ) : (
            historyItems.map((item) => (
              <button
                key={item.index}
                className={`move-chip ${viewIndex === item.index + 1 ? "selected" : ""}`}
                onClick={() => {
                  onSetViewIndex(item.index + 1);
                  onSetLesson(null);
                }}
              >
                {item.side === "White" && `${item.moveNo}. `}{item.label}
              </button>
            ))
          )}
        </div>
        {extensionMode && (
          <div className="freeplay-history">
            <div className="label">Extension line</div>
            <div className="move-history">
              {[...extensionBaseMoves, ...extensionMoves].map((move, index) => (
                <span key={`${move}-${index}`} className="freeplay-chip">
                  {index % 2 === 0 && `${Math.floor(index / 2) + 1}. `}{move}
                </span>
              ))}
            </div>
          </div>
        )}
        {freePlayMoves.length > 0 && (
          <div className="freeplay-history">
            <div className="label">Free play continuation</div>
            <div className="move-history">
              {freePlayMoves.map((move, index) => (
                <span key={`${move}-${index}`} className="freeplay-chip">
                  {index % 2 === 0 && `${Math.floor(index / 2) + 1}. `}{move}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="status-area">
        {lesson ? (
          <div className="lesson-box">
            <strong>{lesson.title}</strong>
            <p>{lesson.text}</p>
            <code>{lesson.line}</code>
            <div className="button-row">
              <button onClick={() => onSetLessonStep((step) => Math.max(0, step - 1))}>Previous</button>
              <button onClick={() => onSetLessonStep((step) => Math.min(lesson.moves.length, step + 1))}>Next</button>
              <button onClick={onClearReview}>Back to drill</button>
            </div>
            <p className="muted">Lesson move {lessonStep} of {lesson.moves.length}</p>
          </div>
        ) : extensionMode ? (
          <div className="success-box">
            <strong>Extending saved variation.</strong>
            <p>Play both sides from the alternate move. Save when the position feels stable enough to train later.</p>
            <div className="extension-mode-controls">
              <span>Accepted moves</span>
              <button
                className={extensionMoveMode === "top1" ? "active" : ""}
                onClick={() => onSetExtensionMoveMode("top1")}
              >
                Top move only
              </button>
              <button
                className={extensionMoveMode === "top3" ? "active" : ""}
                onClick={() => onSetExtensionMoveMode("top3")}
              >
                Within range
              </button>
              <label className="threshold-control">
                Within
                <select
                  value={extensionThresholdCp}
                  onChange={(event) => onSetExtensionThresholdCp(Number(event.target.value))}
                  disabled={extensionMoveMode === "top1"}
                >
                  <option value={25}>0.25</option>
                  <option value={50}>0.50</option>
                  <option value={75}>0.75</option>
                  <option value={100}>1.00</option>
                  <option value={150}>1.50</option>
                </select>
                pawns of best
              </label>
            </div>
            <div className="extension-top-moves">
              <strong>Reference Stockfish options</strong>
              {extensionTopMoveStatus === "loading" && <p>Analyzing accepted moves...</p>}
              {extensionTopMoveStatus === "unavailable" && <p>No engine move list available yet.</p>}
              {extensionTopMoveStatus === "ready" && (
                <ol>
                  {filteredExtensionTopMoves.map((entry) => (
                    <li key={`${entry.multiPv}-${entry.bestMove}`}>
                      <span>{formatTopMoveOption(shownFen, entry)}</span>
                    </li>
                  ))}
                </ol>
              )}
            </div>
            <div className="ending-guidelines">
              <strong>When to end the variation</strong>
              <ul>
                <li>The tactical sequence is resolved.</li>
                <li>The queen or piece chase is over.</li>
                <li>Both sides have developed normally.</li>
                <li>The king is safe, castled, or clearly about to castle.</li>
                <li>There is no obvious forcing move left.</li>
                <li>The eval has stabilized and you understand the plan.</li>
              </ul>
            </div>
            <div className="extension-name-row">
              <label>Variation name</label>
              <input
                value={extensionName}
                onChange={(event) => onSetExtensionName(event.target.value)}
                placeholder="Name this variation"
              />
            </div>
            <div className="button-row">
              <button onClick={onSaveExtendedVariation}>Save extended variation</button>
              <button onClick={onCancelExtensionMode}>Cancel</button>
            </div>
          </div>
        ) : freePlayMode ? (
          <div className="success-box">
            <strong>Free play mode.</strong>
            <p>Keep playing legal moves from the final position. The eval bar will keep updating.</p>
            <div className="button-row">
              <button onClick={onStopFreePlay}>Exit free play</button>
            </div>
          </div>
        ) : isDone ? (
          <div className="success-box">
            <strong>Line complete.</strong>
            <p>Start free play to see how the position can continue.</p>
            <div className="button-row">
              <button onClick={onStartFreePlay}>Continue from here</button>
              <button onClick={() => onResetQuiz(true)}>New random variation</button>
            </div>
          </div>
        ) : !isQuizTurn ? (
          <div className="opponent-box"><p>Opponent to move. {opponentThinking ? "Thinking..." : "Playing move..."}</p></div>
        ) : isReviewing ? (
          <div className="answer-box"><p>You are reviewing a past position.</p><button onClick={onClearReview}>Return to current position</button></div>
        ) : (
          <div className="answer-box">
            <p>Your move: <strong>Move {moveNumberForIndex(currentIndex)} for {currentSide}</strong></p>
            <p className="muted">Drag and drop the piece where it belongs. Click-to-move still works too.</p>
            <div className="hint-row">
              {wrongAttemptsThisMove > 0 && <button type="button" onClick={() => onSetShowAnswer(true)}>Show answer</button>}
              {feedback?.explanation?.seeLine && <button type="button" onClick={() => onOpenLesson(feedback.explanation)}>See line</button>}
              {showAnswer && <button type="button" onClick={onAdvance}>Skip to next move</button>}
            </div>
            {showAnswer && <p className="answer-reveal">Correct move: <strong>{currentMove}</strong></p>}
          </div>
        )}
      </div>

      <div className="feedback-area">
        {feedback && (
          <div className={`feedback ${feedback.type}`}>
            {feedback.text}
            {feedback.explanation?.text && <p>{feedback.explanation.text}</p>}
            {dynamicAnalysisStatus === "loading" && <p>Analyzing with Stockfish...</p>}
            {dynamicAnalysisStatus === "unavailable" && <p>Dynamic analysis unavailable for this move.</p>}
            {dynamicAnalysisStatus === "ready" && dynamicAnalysis && (
              <div className={`dynamic-analysis ${dynamicAnalysis.isPlayableAlternative ? "playable" : ""}`}>
                <p><strong>{dynamicAnalysis.isPlayableAlternative ? "Playable alternate line" : "Engine comparison"}</strong></p>
                <p>You played: <strong>{dynamicAnalysis.playedSan}</strong></p>
                <p>Repertoire move: <strong>{dynamicAnalysis.repertoireMove}</strong></p>
                <p>Engine prefers: <strong>{dynamicAnalysis.bestSan}</strong></p>
                <p>Eval before: <strong>{dynamicAnalysis.evalBefore}</strong> - after your move: <strong>{dynamicAnalysis.evalAfter}</strong> ({dynamicAnalysis.swing})</p>
                <p>{dynamicAnalysis.explanation}</p>
                {dynamicAnalysis.isPlayableAlternative && selectedOpeningId !== "custom" && (
                  <button type="button" onClick={onSavePlayableAlternative}>
                    Add this as a saved variation
                  </button>
                )}
                {dynamicAnalysis.isPlayableAlternative && selectedOpeningId !== "custom" && (
                  <button type="button" onClick={onStartExtensionFromPlayableAlternative}>
                    Extend this variation
                  </button>
                )}
                {dynamicAnalysis.engineLineAfterMistake.length > 0 && (
                  <p>Line after your move: <code>{dynamicAnalysis.engineLineAfterMistake.join(" ")}</code></p>
                )}
                {dynamicAnalysis.engineLineBest.length > 0 && (
                  <p>Engine line with best move: <code>{dynamicAnalysis.engineLineBest.join(" ")}</code></p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
