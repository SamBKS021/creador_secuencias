import { FileUp, Search } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'

function UploadDropzone({ onBrowse, disabled, blendySourceId }) {
  return (
    <div className="rounded-[28px] bg-[var(--surface-container-high)] px-6 py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-[var(--primary)]">
        <FileUp size={24} />
      </div>
      <h3 className="font-headline mt-6 text-3xl font-extrabold text-[var(--primary)]">
        Suelta aquí tus archivos `.docx`
      </h3>
      <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-[var(--on-surface-variant)]">
        Importa documentos fuente en formato `.docx` para detectar varios cantos, revisar coincidencias y confirmarlos
        antes de guardarlos en la biblioteca activa.
      </p>
      <div className="mt-8">
        <Button onClick={onBrowse} disabled={disabled} data-blendy-from={blendySourceId}>
          <Search size={16} />
          Explorar archivos
        </Button>
      </div>
    </div>
  )
}

export default UploadDropzone
