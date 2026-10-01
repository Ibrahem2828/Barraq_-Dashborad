"use client";

import { FormEvent, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { api } from "@/lib/api/client";
import { endpoints } from "@/lib/api/endpoints";
import { useDictionary } from "@/lib/i18n/useDictionary";
import { toast } from "@/lib/ui/toast";

export interface AudienceOption {
  /** "org:<public_id>" for the whole organization, "class:<public_id>" for one class. */
  value: string;
  label: string;
}

export interface Option {
  value: string;
  label: string;
}

const MAX_BYTES = 50 * 1024 * 1024;
const ACCEPT = ".pdf,.txt,.docx,.pptx,.mp3,.m4a,.wav";

/**
 * Upload one file to the Classroom Shared Library.
 *
 * The audience list holds only targets the backend returned for this
 * account; the backend still re-resolves the target against the caller's
 * scope and refuses anything else.
 */
export function LibraryUploadModal({
  open,
  onClose,
  onUploaded,
  audiences,
  subjects,
  categories
}: {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  audiences: AudienceOption[];
  subjects: Option[];
  categories: Option[];
}) {
  const dictionary = useDictionary();
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("handout");
  const [audience, setAudience] = useState("");
  const [subject, setSubject] = useState("");
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setFile(null);
    setTitle("");
    setDescription("");
    setCategory("handout");
    setAudience(audiences.length === 1 ? audiences[0].value : "");
    setSubject("");
    setProgress(null);
    setError(null);
  }, [open, audiences]);

  const busy = progress !== null;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file) return setError(dictionary.libFileRequired);
    if (file.size > MAX_BYTES) return setError(dictionary.libTooLarge);
    if (!audience) return setError(dictionary.libChooseAudience);
    const [kind, id] = audience.split(":");
    const form = new FormData();
    form.append("file", file);
    form.append("title", title.trim() || file.name.replace(/\.[^.]+$/, ""));
    form.append("description", description.trim());
    form.append("category", category);
    form.append(kind === "class" ? "classroom" : "organization", id);
    if (subject) form.append("subject", subject);
    setError(null);
    setProgress(0);
    try {
      await api.upload(endpoints.admin.classLibrary, form, setProgress);
      toast.success(dictionary.libUploaded);
      onUploaded();
      onClose();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : dictionary.actionFailed);
    } finally {
      setProgress(null);
    }
  }

  return (
    <Modal open={open} title={dictionary.libUpload} onClose={busy ? () => undefined : onClose}>
      <form className="resource-form" onSubmit={submit}>
        {error ? (
          <div className="inline-error" role="alert">
            {error}
          </div>
        ) : null}
        <label className="resource-form__field">
          <span>{dictionary.libFile} *</span>
          <input
            type="file"
            accept={ACCEPT}
            required
            disabled={busy}
            onChange={(event) => {
              const chosen = event.target.files?.[0] ?? null;
              setFile(chosen);
              if (chosen && !title) setTitle(chosen.name.replace(/\.[^.]+$/, ""));
            }}
          />
          <small className="muted">{dictionary.libFileHint}</small>
        </label>
        <label className="resource-form__field">
          <span>{dictionary.libTitleLabel} *</span>
          <input value={title} required maxLength={255} disabled={busy} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="resource-form__field">
          <span>{dictionary.libAudience} *</span>
          <select value={audience} required disabled={busy} onChange={(event) => setAudience(event.target.value)}>
            <option value="">{dictionary.libChooseAudience}</option>
            {audiences.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="resource-form__field">
          <span>{dictionary.libCategory}</span>
          <select value={category} disabled={busy} onChange={(event) => setCategory(event.target.value)}>
            {categories.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="resource-form__field">
          <span>{dictionary.libSubject}</span>
          <select value={subject} disabled={busy} onChange={(event) => setSubject(event.target.value)}>
            <option value="">{dictionary.libNoSubject}</option>
            {subjects.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <small className="muted">{dictionary.libSubjectHint}</small>
        </label>
        <label className="resource-form__field">
          <span>{dictionary.libDescriptionLabel}</span>
          <textarea value={description} rows={3} disabled={busy} onChange={(event) => setDescription(event.target.value)} />
        </label>
        {busy ? (
          <div className="upload-progress" role="status" aria-live="polite">
            <div className="upload-progress__track">
              <div className="upload-progress__bar" style={{ inlineSize: `${Math.round((progress ?? 0) * 100)}%` }} />
            </div>
            <span>
              {dictionary.libUploading} {Math.round((progress ?? 0) * 100)}%
            </span>
          </div>
        ) : null}
        <div className="resource-form__actions">
          <Button type="button" variant="ghost" onClick={onClose} disabled={busy}>
            {dictionary.cancel}
          </Button>
          <Button type="submit" disabled={busy}>
            {busy ? dictionary.libUploading : dictionary.libUpload}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
