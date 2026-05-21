import { Chessboard } from "react-chessboard";

export default function BoardWithEval({ chessboardOptions, engineEval, evalHeight, evalStatus, formatEval }) {
  return (
    <div className="board-card">
      <div className="board-with-eval">
        <div className="eval-wrap">
          <div className="eval-number">{evalStatus === "loading" ? "..." : formatEval(engineEval)}</div>
          <div
            className="eval-bar"
            title="Local Stockfish evaluation"
            style={{
              "--black-eval-size": `${100 - evalHeight}%`,
              "--white-eval-size": `${evalHeight}%`,
            }}
          >
            <div className="eval-black" />
            <div className="eval-white" />
          </div>
          <div className="eval-source">
            {evalStatus === "ready" && engineEval?.depth ? `SF d${engineEval.depth}` : evalStatus === "analyzing" ? "SF..." : evalStatus === "unavailable" ? "no SF" : "SF"}
          </div>
        </div>
        <div className="board-shell"><Chessboard options={chessboardOptions} /></div>
      </div>
    </div>
  );
}
