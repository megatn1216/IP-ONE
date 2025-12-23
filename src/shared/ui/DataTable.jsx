import "../../styles/table.css";

export default function DataTable({
                                    columns = [],
                                    rows = [],
                                    selectedId,
                                    onSelect,
                                  }) {
  return (
      <div className="tableWrap">
        <table className="table">
          <thead>
          <tr>
            {columns.map((c) => {
              const thClass = [
                c.sticky ? "is-sticky" : "",
                // c.headerGrey ? "is-grey" : "", // CSS에 맞춰 headerGrey → is-grey
              ]
                  .filter(Boolean)
                  .join(" ");

              return (
                  <th key={c.key} className={thClass}>
                    {c.label}
                  </th>
              );
            })}
          </tr>
          </thead>

          <tbody>
          {rows.map((r, idx) => {
            const rowId = r?.id ?? String(idx);

            // ✅ CSS랑 맞추기: is-selectedRow 가 아니라 is-selected
            const trClass = [
              selectedId && rowId === selectedId ? "is-selected" : "",
              r?.__isDraft ? "is-draftRow" : "",
            ]
                .filter(Boolean)
                .join(" ");

            return (
                <tr
                    key={rowId}
                    className={trClass}
                    onClick={() => {
                      if (!onSelect) return;
                      if (r?.__isDraft) return; // draft 행은 선택 금지
                      // ✅ 행 전체 클릭 시 rowId 넘겨서 선택 처리
                      onSelect(rowId);
                    }}
                >
                  {columns.map((c) => {
                    const baseTd = c.sticky ? "is-sticky" : "";
                    const extra =
                        typeof c.tdClassName === "function"
                            ? c.tdClassName(r)
                            : c.tdClassName || "";
                    const tdClass = [baseTd, extra].filter(Boolean).join(" ");

                    const content = c.render
                        ? c.render(r)
                        : String(r?.[c.key] ?? "");

                    return (
                        <td key={c.key} className={tdClass}>
                          {content}
                        </td>
                    );
                  })}
                </tr>
            );
          })}

          {rows.length === 0 && (
              <tr>
                <td className="table__empty" colSpan={columns.length}>
                  데이터가 없습니다.
                </td>
              </tr>
          )}
          </tbody>
        </table>
      </div>
  );
}