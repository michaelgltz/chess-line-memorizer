import BoardWithEval from "./BoardWithEval.jsx";
import CurrentLineCard from "./CurrentLineCard.jsx";
import MistakeReview from "./MistakeReview.jsx";
import PracticePanel from "./PracticePanel.jsx";
import "../styles/MobileLayout.css";

export default function MobileLayout({
  boardProps,
  currentLineProps,
  mistakeReviewProps,
  practicePanelProps,
}) {
  return (
    <>
      <PracticePanel {...practicePanelProps} />
      <section className="mobile-layout">
        <BoardWithEval {...boardProps} />
        <div className="mobile-current-line">
          <CurrentLineCard {...currentLineProps} />
        </div>
        <MistakeReview {...mistakeReviewProps} />
      </section>
    </>
  );
}
