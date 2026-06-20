import { type ReactNode } from 'react'

interface Column<T> {
  key: string
  header: string
  render: (row: T) => ReactNode
}

interface DataTableProps<T> {
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty?: string
}

export function DataTable<T>({ columns, rows, rowKey, empty = 'No data.' }: DataTableProps<T>) {
  return (
    <table className="tbl">
      <thead>
        <tr>
          {columns.map(col => (
            <th key={col.key}>{col.header}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.length === 0 ? (
          <tr>
            <td colSpan={columns.length} style={{ textAlign: 'center', color: 'var(--secondaryText)', padding: '32px' }}>
              {empty}
            </td>
          </tr>
        ) : (
          rows.map(row => (
            <tr key={rowKey(row)}>
              {columns.map(col => (
                <td key={col.key}>{col.render(row)}</td>
              ))}
            </tr>
          ))
        )}
      </tbody>
    </table>
  )
}
