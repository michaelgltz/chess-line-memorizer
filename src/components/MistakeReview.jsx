export default function MistakeReview({ mistakes }) {
  return (
    <div className="card">
      <h2>Mistake review</h2>
      {mistakes.length === 0 ? (
        <p className="muted">No mistakes yet.</p>
      ) : (
        <div className="mistakes">
          {mistakes.slice(0, 8).map((mistake, index) => (
            <div key={index} className="mistake">
              <strong>Move {mistake.moveNumber}, {mistake.side}: {mistake.correct}</strong>
              <div>You played: {mistake.guessed}</div>
              {mistake.explanationTitle && <small>{mistake.explanationTitle}</small>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
