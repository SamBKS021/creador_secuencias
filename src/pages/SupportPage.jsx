import {
  Bug,
  Copy,
  FileText,
  ImagePlus,
  Info,
  Lightbulb,
  Mail,
  Paperclip,
  Send,
  X
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { sileo } from "sileo";
import { useAppContext } from "../app/store/AppContext.jsx";
import Button from "../components/ui/Button.jsx";
import EditorialCard from "../components/ui/EditorialCard.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import service from "../services/workspaceService.js";

const REQUEST_OPTIONS = [
  {
    id: "bug",
    title: "Reportar un error",
    description:
      "Usa esta opcion si algo falla, se cierra o no responde como deberia.",
    icon: Bug
  },
  {
    id: "mejora",
    title: "Proponer una mejora",
    description:
      "Usa esta opcion para pedir cambios de flujo, interfaz o nuevas funciones.",
    icon: Lightbulb
  }
];

const SUBJECT_PLACEHOLDER = {
  bug: "[BUG]",
  mejora: "[MEJORA]"
};

function createInitialForm() {
  return {
    requestType: "bug",
    contactName: "",
    subject: "",
    message: ""
  };
}

function formatBytes(value) {
  if (!value) {
    return "0 KB";
  }

  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let index = 0;

  while (size >= 1024 && index < units.length - 1) {
    size /= 1024;
    index += 1;
  }

  return `${size >= 10 || index === 0 ? Math.round(size) : size.toFixed(1)} ${units[index]}`;
}

function mergeAttachments(current, incoming) {
  const byPath = new Map(current.map((item) => [item.filePath, item]));
  incoming.forEach((item) => {
    byPath.set(item.filePath, item);
  });
  return Array.from(byPath.values());
}

function readErrorMessage(error, fallback) {
  if (typeof error === "string" && error.trim()) {
    return error;
  }

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof error.message === "string" &&
    error.message.trim()
  ) {
    return error.message;
  }

  return fallback;
}

function SupportPage() {
  const { state } = useAppContext();
  const fileInputRef = useRef(null);
  const [form, setForm] = useState(() => createInitialForm());
  const [attachments, setAttachments] = useState([]);
  const [supportConfig, setSupportConfig] = useState({
    configured: false,
    recipientEmail: "",
    allowedExtensions: ["png", "jpg", "jpeg", "webp", "gif", "pdf", "docx"],
    maxAttachments: 5,
    maxTotalBytes: 20 * 1024 * 1024
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [sending, setSending] = useState(false);

  const totalAttachmentBytes = useMemo(
    () => attachments.reduce((sum, item) => sum + (item.sizeBytes || 0), 0),
    [attachments]
  );
  const canSubmit = Boolean(
    form.requestType &&
      String(form.contactName || "").trim() &&
      String(form.subject || "").trim() &&
      String(form.message || "").trim()
  );

  useEffect(() => {
    let active = true;

    async function loadSupportContext() {
      try {
        const config = await (service.getSupportConfig?.() ||
          Promise.resolve(null));

        if (!active) {
          return;
        }

        if (config) {
          setSupportConfig(config);
        }
      } catch {
        if (!active) {
          return;
        }
      } finally {
        if (active) {
          setLoadingConfig(false);
        }
      }
    }

    loadSupportContext();
    return () => {
      active = false;
    };
  }, []);

  async function handleCopyEmail() {
    if (!supportConfig.recipientEmail) {
      return;
    }

    try {
      await navigator.clipboard.writeText(supportConfig.recipientEmail);
      sileo.success({
        title: "Correo copiado",
        description: `${supportConfig.recipientEmail} ya esta en el portapapeles.`
      });
    } catch {
      sileo.error({
        title: "No se pudo copiar el correo",
        description: "Intentalo de nuevo desde este mismo panel."
      });
    }
  }

  async function handlePickAttachments() {
    if (attachments.length >= supportConfig.maxAttachments) {
      sileo.warning({
        title: "Limite alcanzado",
        description: `Solo puedes adjuntar hasta ${supportConfig.maxAttachments} archivos por envio.`
      });
      return;
    }

    if (state.platformMode === "tauri" && service.pickSupportAttachments) {
      try {
        const picked = await service.pickSupportAttachments();
        if (!picked?.length) {
          return;
        }

        setAttachments((current) => mergeAttachments(current, picked));
      } catch (error) {
        sileo.error({
          title: "No se pudieron adjuntar archivos",
          description: readErrorMessage(
            error,
            "Revisa los archivos seleccionados e intentalo de nuevo."
          )
        });
      }
      return;
    }

    fileInputRef.current?.click();
  }

  function handleWebAttachmentChange(event) {
    const files = Array.from(event.target.files || []);
    if (!files.length) {
      return;
    }

    const mapped = files.map((file) => ({
      fileName: file.name,
      filePath: `${file.name}:${file.size}:${file.lastModified}`,
      sizeBytes: file.size
    }));

    setAttachments((current) => mergeAttachments(current, mapped));
    event.target.value = "";
  }

  function removeAttachment(filePath) {
    setAttachments((current) =>
      current.filter((item) => item.filePath !== filePath)
    );
  }

  function validateBeforeSend() {
    const name = String(form.contactName || "").trim();
    const subject = String(form.subject || "").trim();
    const message = String(form.message || "").trim();

    if (!name) {
      sileo.warning({
        title: "Falta tu nombre",
        description:
          "Escribe tu nombre para que el asunto del correo se arme correctamente."
      });
      return false;
    }

    if (!subject) {
      sileo.warning({
        title: "Falta la cabecera",
        description: "Escribe un mensaje corto para identificar el asunto."
      });
      return false;
    }

    if (!message) {
      sileo.warning({
        title: "Falta tu mensaje",
        description: "Describe la mejora o el error dentro del editor."
      });
      return false;
    }

    if (attachments.length > supportConfig.maxAttachments) {
      sileo.warning({
        title: "Demasiados adjuntos",
        description: `El limite actual es de ${supportConfig.maxAttachments} archivos.`
      });
      return false;
    }

    if (totalAttachmentBytes > supportConfig.maxTotalBytes) {
      sileo.warning({
        title: "Adjuntos demasiado pesados",
        description: `Reduce el total a menos de ${formatBytes(supportConfig.maxTotalBytes)}.`
      });
      return false;
    }

    return true;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!validateBeforeSend()) {
      return;
    }

    setSending(true);

    try {
      await service.sendSupportRequest({
        requestType: form.requestType,
        contactName: form.contactName.trim(),
        subject: form.subject.trim(),
        message: form.message.trim(),
        attachments
      });

      sileo.success({
        title: "Solicitud enviada",
        description:
          "El correo de soporte se envio correctamente con los datos capturados."
      });

      setForm((current) => ({
        ...createInitialForm(),
        requestType: current.requestType,
        contactName: current.contactName
      }));
      setAttachments([]);
    } catch (error) {
      sileo.error({
        title: "No se pudo enviar la solicitud",
        description: readErrorMessage(
          error,
          "Intentalo de nuevo en unos momentos."
        )
      });
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Contacto"
        title="Soporte"
        description="Usa este canal para reportar errores o proponer mejoras. El sistema arma el asunto del correo por ti al momento de enviarlo."
      />

      <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div className="space-y-4 self-start xl:sticky xl:top-6">
          <EditorialCard className="space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--outline)]">
                Elegir tipo
              </p>
              <h2 className="mt-2 font-headline text-2xl font-extrabold text-[var(--primary)]">
                Que quieres enviar
              </h2>
            </div>

            <div className="space-y-3">
              {REQUEST_OPTIONS.map((option) => {
                const selected = form.requestType === option.id;
                const OptionIcon = option.icon;

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        requestType: option.id
                      }))
                    }
                    className={[
                      "w-full rounded-[22px] border px-4 py-4 text-left transition",
                      selected
                        ? "border-[rgba(31,111,235,0.24)] bg-[rgba(31,111,235,0.07)] text-[var(--primary)]"
                        : "border-[rgba(67,71,78,0.08)] bg-[var(--surface-container-lowest)] text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-low)]"
                    ].join(" ")}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5 flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                        <OptionIcon size={18} />
                      </div>
                      <div>
                        <p className="font-semibold">{option.title}</p>
                        <p className="mt-1 text-sm leading-6">
                          {option.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </EditorialCard>

          <EditorialCard className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <Mail size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--outline)]">
                  Buzon de destino
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
                  {loadingConfig
                    ? "Cargando..."
                    : supportConfig.recipientEmail || "Sin configurar"}
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
              Todo lo que envies desde aqui llega a un correo de soporte
              dedicado. Si hace falta, puedes copiar la direccion para
              compartirla fuera de la app.
            </p>
            <Button
              variant="outline"
              onClick={handleCopyEmail}
              disabled={!supportConfig.recipientEmail}
            >
              <Copy size={16} />
              Copiar correo
            </Button>
          </EditorialCard>

          <EditorialCard className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <Paperclip size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--outline)]">
                  Adjuntos permitidos
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
                  Imagenes, PDF y DOCX
                </p>
              </div>
            </div>
            <p className="text-sm leading-6 text-[var(--on-surface-variant)]">
              Puedes adjuntar hasta {supportConfig.maxAttachments} archivo(s)
              por envio, con un total de{" "}
              {formatBytes(supportConfig.maxTotalBytes)}.
            </p>
            <p className="text-xs leading-6 text-[var(--outline)]">
              Formatos: {(supportConfig.allowedExtensions || []).join(", ")}
            </p>
          </EditorialCard>

          <EditorialCard className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                <Info size={20} />
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--outline)]">
                  Como usar esta seccion
                </p>
                <p className="mt-1 text-sm font-semibold text-[var(--primary)]">
                  Flujo recomendado
                </p>
              </div>
            </div>
            <div className="space-y-2 text-sm leading-6 text-[var(--on-surface-variant)]">
              <p>1. Elige si vas a reportar un error o proponer una mejora.</p>
              <p>2. Escribe tu nombre y una cabecera corta.</p>
              <p>
                3. Redacta el mensaje y agrega adjuntos si ayudan a explicar el
                caso.
              </p>
            </div>
          </EditorialCard>
        </div>

        <EditorialCard className="space-y-5">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--outline)]">
              Formulario
            </p>
            <h2 className="mt-2 font-headline text-2xl font-extrabold text-[var(--primary)]">
              Redactar correo
            </h2>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--primary)]">
                Nombre
              </span>
              <input
                type="text"
                value={form.contactName}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    contactName: event.target.value
                  }))
                }
                placeholder="Tu nombre"
                className="w-full rounded-[20px] border border-[rgba(67,71,78,0.12)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-[var(--on-surface)] outline-none transition focus:border-[var(--primary)]"
                required
              />
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--primary)]">
                Cabecera del mensaje
              </span>
              <input
                type="text"
                value={form.subject}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    subject: event.target.value
                  }))
                }
                placeholder={SUBJECT_PLACEHOLDER[form.requestType]}
                className="w-full rounded-[20px] border border-[rgba(67,71,78,0.12)] bg-[var(--surface-container-lowest)] px-4 py-3 text-sm text-[var(--on-surface)] outline-none transition focus:border-[var(--primary)]"
                required
              />
              <p className="text-xs leading-6 text-[var(--outline)]">
                Al enviar, el asunto final se arma automaticamente con el tipo y
                tu nombre.
              </p>
            </label>

            <label className="space-y-2">
              <span className="text-sm font-semibold text-[var(--primary)]">
                Mensaje
              </span>
              <textarea
                value={form.message}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    message: event.target.value
                  }))
                }
                placeholder={
                  form.requestType === "bug"
                    ? "Explica que intentabas hacer, que paso y si puedes repetir el error."
                    : "Explica la mejora que propones, por que ayudaria y en que parte del flujo la imaginas."
                }
                className="min-h-[220px] w-full rounded-[24px] border border-[rgba(67,71,78,0.12)] bg-[var(--surface-container-lowest)] px-4 py-4 text-sm leading-7 text-[var(--on-surface)] outline-none transition focus:border-[var(--primary)]"
                required
              />
            </label>

            <div className="rounded-[24px] border border-dashed border-[rgba(67,71,78,0.16)] bg-[var(--surface-container-low)] px-4 py-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-[var(--primary)]">
                    Adjuntos
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[var(--on-surface-variant)]">
                    Agrega imagenes, archivos PDF o documentos DOCX. No es
                    obligatorio.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePickAttachments}
                  disabled={sending}
                >
                  <Paperclip size={16} />
                  Agregar archivos
                </Button>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,image/*"
                multiple
                className="hidden"
                onChange={handleWebAttachmentChange}
              />

              <div className="mt-4 space-y-3">
                {attachments.length ? (
                  attachments.map((item) => {
                    const isImage = /\.(png|jpg|jpeg|webp|gif)$/i.test(
                      item.fileName
                    );
                    return (
                      <div
                        key={item.filePath}
                        className="flex items-center justify-between gap-3 rounded-[20px] bg-[var(--surface-container-lowest)] px-4 py-3"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--surface-container-low)] text-[var(--primary)]">
                            {isImage ? (
                              <ImagePlus size={18} />
                            ) : (
                              <FileText size={18} />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-[var(--primary)]">
                              {item.fileName}
                            </p>
                            <p className="text-xs text-[var(--on-surface-variant)]">
                              {formatBytes(item.sizeBytes)}
                            </p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => removeAttachment(item.filePath)}
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[var(--outline)] transition hover:bg-[var(--hover-surface)] hover:text-[var(--error)]"
                          aria-label={`Quitar ${item.fileName}`}
                        >
                          <X size={16} />
                        </button>
                      </div>
                    );
                  })
                ) : (
                  <div className="rounded-[20px] bg-[var(--surface-container-lowest)] px-4 py-4 text-sm text-[var(--on-surface-variant)]">
                    Aun no has agregado archivos a este envio.
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-[22px] bg-[var(--surface-container-low)] px-4 py-4">
              <div className="text-sm leading-6 text-[var(--on-surface-variant)]">
                <p>
                  Total adjunto:{" "}
                  <strong className="text-[var(--primary)]">
                    {formatBytes(totalAttachmentBytes)}
                  </strong>
                </p>
              </div>

              <Button
                type="submit"
                disabled={sending || !canSubmit}
              >
                <Send size={16} />
                {sending ? "Enviando..." : "Enviar correo"}
              </Button>
            </div>
          </form>
        </EditorialCard>
      </div>
    </div>
  );
}

export default SupportPage;
