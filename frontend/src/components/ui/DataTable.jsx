import { useState, useMemo, useEffect, useId } from 'react';

// VI: DataTable component với sorting, filtering, và pagination
export default function DataTable({
  columns,
  data = [],
  loading = false,
  onRowClick,
  emptyMessage = 'Không có dữ liệu',
  pageSize = 10,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  getRowId = (row) => row.id,
}) {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const searchId = useId();
  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  // Handle sorting
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Search filter
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((val) =>
          String(val).toLowerCase().includes(lowerSearch)
        )
      );
    }

    // Sort
    if (sortConfig.key) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchTerm, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(processedData.length / pageSize);
  const paginatedData = processedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );
  const selectableRows = paginatedData.filter((row) => getRowId(row));
  const allPageSelected =
    selectableRows.length > 0 &&
    selectableRows.every((row) => selectedSet.has(getRowId(row)));

  const updateSelection = (ids) => {
    onSelectionChange?.(Array.from(new Set(ids)));
  };

  const toggleRowSelection = (event, row) => {
    event.stopPropagation();
    const rowId = getRowId(row);
    if (!rowId) return;
    if (selectedSet.has(rowId)) {
      updateSelection(selectedIds.filter((id) => id !== rowId));
      return;
    }
    updateSelection([...selectedIds, rowId]);
  };

  const togglePageSelection = (event) => {
    event.stopPropagation();
    const pageIds = selectableRows.map((row) => getRowId(row));
    if (allPageSelected) {
      updateSelection(selectedIds.filter((id) => !pageIds.includes(id)));
      return;
    }
    updateSelection([...selectedIds, ...pageIds]);
  };

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const safeTotalPages = Math.max(totalPages, 1);
    setCurrentPage((page) => Math.min(page, safeTotalPages));
  }, [totalPages]);

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200/60 bg-white/50 backdrop-blur-sm">
      {/* Search */}
      <div className="flex flex-col gap-3 border-b border-slate-200/60 bg-transparent px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <label htmlFor={searchId} className="sr-only">
            Tìm kiếm trong bảng
          </label>
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            id={searchId}
            type="text"
            placeholder="Tìm kiếm..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200/60 bg-white/80 py-2.5 pl-10 pr-4 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 transition-all"
          />
        </div>
        <span className="text-sm text-gray-500">
          {processedData.length} kết quả
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              {selectable && (
                <th className="w-12" onClick={(event) => event.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label="Select page rows"
                    data-testid="select-page-rows"
                    checked={allPageSelected}
                    onChange={togglePageSelection}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th key={col.key}>
                  {col.sortable !== false ? (
                    <button
                      type="button"
                      onClick={() => handleSort(col.key)}
                      className="flex items-center gap-2 text-left font-bold"
                      aria-sort={
                        sortConfig.key === col.key
                          ? sortConfig.direction === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : 'none'
                      }
                    >
                      {col.title}
                      {sortConfig.key === col.key && (
                        <span className="text-primary-500" aria-hidden="true">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">{col.title}</div>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8">
                  <div className="spinner w-6 h-6 mx-auto"></div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selectable ? 1 : 0)} className="text-center py-8 text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              paginatedData.map((row, i) => (
                <tr
                  key={row.id || i}
                  onClick={() => onRowClick?.(row)}
                  className={onRowClick ? 'cursor-pointer' : ''}
                >
                  {selectable && (
                    <td onClick={(event) => event.stopPropagation()}>
                      <input
                        type="checkbox"
                        aria-label="Select row"
                        data-testid="row-select"
                        checked={selectedSet.has(getRowId(row))}
                        onChange={(event) => toggleRowSelection(event, row)}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                  )}
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200/60 bg-slate-50/50 px-4 py-3 backdrop-blur-sm">
          <span className="text-sm text-gray-500">
            Trang {currentPage} / {totalPages}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="rounded-lg border border-slate-200/60 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="rounded-lg border border-slate-200/60 bg-white px-3 py-1.5 text-slate-600 transition-colors hover:bg-slate-100 disabled:opacity-50"
            >
              →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
