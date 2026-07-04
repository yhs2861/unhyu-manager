type SummaryPanelProps = {
  pausedCount: number;
  checkingCount: number;
  totalCount: number;
};

function SummaryPanel({ pausedCount, checkingCount, totalCount }: SummaryPanelProps) {
  return (
    <section className="summary-panel" aria-label="운휴 요약">
      <div>
        <p>운휴 차량</p>
        <strong>{pausedCount}</strong>
      </div>
      <div>
        <p>점검 중</p>
        <strong>{checkingCount}</strong>
      </div>
      <div>
        <p>전체 등록</p>
        <strong>{totalCount}</strong>
      </div>
    </section>
  );
}

export default SummaryPanel;
