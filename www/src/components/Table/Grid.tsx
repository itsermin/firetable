import React, { lazy, Suspense } from "react";
import EmptyTable from "./EmptyTable";
import { editable } from "./grid-fns";
import { DraggableHeader } from "react-data-grid-addons";
import isEqual from "lodash/isEqual";
const ReactDataGrid = lazy(() => import("react-data-grid"));
const { DraggableContainer } = DraggableHeader;
const Grid = (props: any) => {
  const {
    onHeaderDrop,
    rowHeight,
    columns,
    RowRenderer,
    handleRowGetter,

    tableHeight,
    onGridRowsUpdated,
    rows,
    resizeColumn,
    loadingRows,
    addRow,
    setSelectedCell,
  } = props;
  return (
    <Suspense fallback={<div>Loading table...</div>}>
      <DraggableContainer onHeaderDrop={onHeaderDrop}>
        <ReactDataGrid
          headerRowHeight={45}
          rowRenderer={RowRenderer}
          rowHeight={rowHeight}
          columns={columns}
          enableCellSelect={true} // makes text based cells editable
          rowGetter={handleRowGetter}
          rowsCount={rows.length}
          onGridRowsUpdated={onGridRowsUpdated}
          minHeight={tableHeight}
          onCellSelected={(coordinates: { rowIdx: number; idx: number }) => {
            const row = rows[coordinates.rowIdx];
            const column = columns[coordinates.idx];
            // if (editable(column.type)) {
            // only editable fields are stored selectedCell, temporary fix for custom fields
            setSelectedCell({ row, column });
            //}
          }}
          onColumnResize={(idx: number, width: number) =>
            //tableActions.column.resize(idx, width)
            resizeColumn(idx, width)
          }
          emptyRowsView={() => (
            <EmptyTable
              //isLoading={tableState.loadingRows}
              isLoading={loadingRows}
              tableHeight={tableHeight}
              addRow={addRow}
            />
          )}
        />
      </DraggableContainer>
    </Suspense>
  );
};

export default React.memo(Grid, (prevProps, nextProps) => {
  console.log(nextProps, isEqual(prevProps.columns, nextProps.columns));
  return (
    isEqual(prevProps.columns, nextProps.columns) ||
    isEqual(prevProps.rows, nextProps.rows)
    // || prevProps.rowHeight === nextProps.rowHeight ||
    // prevProps.tableHeight === nextProps.tableHeight
  );
});

//export default Grid;
