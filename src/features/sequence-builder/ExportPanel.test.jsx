import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import ExportPanel from './ExportPanel.jsx'
import SongUsageChart from '../library/SongUsageChart.jsx'
import { exportSequenceDocx, getSequenceExportStatuses, saveSongCategories } from '../../services/mockWorkspace.js'

vi.mock('sileo', () => ({
  sileo: {
    show: vi.fn(() => 'toast-1'),
    dismiss: vi.fn(),
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}))

describe('ExportPanel y descarga sin notas', () => {
  it('propaga withoutNotes=false por defecto y withoutNotes=true al activar el checkbox', async () => {
    const onCheckExisting = vi.fn().mockResolvedValue({ exists: false, fileName: 'domingo_sin_notas.docx' })
    const onExport = vi.fn().mockResolvedValue({
      fileName: 'domingo_sin_notas.docx',
      filePath: 'exports/domingo_sin_notas.docx',
      exportedAt: '2026-04-05T10:00:00Z',
      overwritten: false,
    })
    const onOpenDocument = vi.fn().mockResolvedValue({ ok: true })

    render(
      <ExportPanel
        exportResult={null}
        exportStatus={{
          exists: true,
          fileName: 'domingo.docx',
          withoutNotesExists: true,
          withoutNotesFileName: 'domingo_sin_notas.docx',
        }}
        onCheckExisting={onCheckExisting}
        onExport={onExport}
        onOpenDocument={onOpenDocument}
        disabled={false}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Abrir documento' }))
    expect(onOpenDocument).toHaveBeenCalledWith(false)

    const checkbox = screen.getByLabelText(/Descargar sin notas/i)
    fireEvent.click(checkbox)

    fireEvent.click(screen.getByRole('button', { name: /Exportar DOCX sin notas/i }))

    await waitFor(() => {
      expect(onCheckExisting).toHaveBeenCalledWith(true)
      expect(onExport).toHaveBeenCalledWith(false, true)
    })

    fireEvent.click(screen.getByRole('button', { name: 'Abrir documento' }))
    expect(onOpenDocument).toHaveBeenLastCalledWith(true)
  })
})

describe('mockWorkspace exportaciones y categorías', () => {
  it('mantiene archivos separados para exportación normal y _sin_notas', async () => {
    localStorage.clear()
    const normal = await exportSequenceDocx('secuencia-0001', false, false)
    const clean = await exportSequenceDocx('secuencia-0001', false, true)
    const statuses = await getSequenceExportStatuses()
    const target = statuses.find((item) => item.sequenceId === 'secuencia-0001')

    expect(normal.fileName).toMatch(/\.docx$/)
    expect(normal.fileName).not.toMatch(/_sin_notas\.docx$/)
    expect(clean.fileName).toMatch(/_sin_notas\.docx$/)
    expect(target?.exists).toBe(true)
    expect(target?.withoutNotesExists).toBe(true)
  })

  it('deduplica categorías sin distinguir mayúsculas y minúsculas', async () => {
    localStorage.clear()
    const saved = await saveSongCategories(['Adoración', 'adoración', 'Himnos', 'HIMNOS'])
    expect(saved).toEqual(['Adoración', 'Himnos'])
  })
})

describe('SongUsageChart', () => {
  it('permite cambiar entre años con historial de uso', () => {
    const currentYear = new Date().getFullYear()
    render(<SongUsageChart fechasUso={['2024-01-10', '2024-02-15', `${currentYear}-03-01`]} />)

    expect(screen.getByRole('heading', { name: String(currentYear) })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '2024' }))
    expect(screen.getByRole('heading', { name: '2024' })).toBeInTheDocument()
  })
})
