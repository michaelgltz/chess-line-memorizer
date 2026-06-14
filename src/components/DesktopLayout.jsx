import BoardWithEval from "./BoardWithEval.jsx";
import CurrentLineCard from "./CurrentLineCard.jsx";
import MistakeReview from "./MistakeReview.jsx";
import PracticePanel from "./PracticePanel.jsx";
import "../styles/DesktopLayout.css";

export default function DesktopLayout({
  boardProps,
  currentLineProps,
  mistakeReviewProps,
  practicePanelProps,
}) {
  return (
    <>
      <PracticePanel {...practicePanelProps} />
      <section className="desktop-layout">
        <div className="desktop-left-column">
          <CurrentLineCard {...currentLineProps} />
          <MistakeReview {...mistakeReviewProps} />
        </div>
        <BoardWithEval {...boardProps} />
      </section>
    </>
  );
}
