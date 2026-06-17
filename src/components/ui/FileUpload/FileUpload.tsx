'use client';

import React, { useRef, useState, useEffect } from 'react';
import { UploadCloud, FileText, X } from 'lucide-react';
import styles from './FileUpload.module.css';

export interface FileUploadProps {
  label?: string;
  accept?: string;
  maxSizeMB?: number; // in MB
  onChange: (files: File[]) => void;
  value: File[];
  multiple?: boolean;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  label,
  accept = 'image/*,application/pdf,video/*',
  maxSizeMB = 10,
  onChange,
  value = [],
  multiple = false
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Manage object URLs for preview to avoid memory leaks
  const [previews, setPreviews] = useState<Record<string, string>>({});

  useEffect(() => {
    const newPreviews: Record<string, string> = {};
    value.forEach(file => {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        newPreviews[file.name] = URL.createObjectURL(file);
      }
    });
    setPreviews(newPreviews);

    return () => {
      // Cleanup object URLs when component unmounts or value changes
      Object.values(newPreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, [value]);

  const handleFiles = (files: FileList | File[]) => {
    setError(null);
    let validFiles: File[] = [];
    let hasError = false;

    Array.from(files).forEach(file => {
      if (file.size > maxSizeMB * 1024 * 1024) {
        hasError = true;
      } else {
        validFiles.push(file);
      }
    });

    if (hasError) {
      setError(`Algunos archivos superan el límite de ${maxSizeMB}MB y fueron ignorados.`);
    }

    if (!multiple && validFiles.length > 0) {
      // If single file mode, replace the array with just the first file
      onChange([validFiles[0]]);
    } else {
      // Append valid files to existing
      // Prevent duplicates by checking name and size
      const uniqueNewFiles = validFiles.filter(nf => !value.some(ef => ef.name === nf.name && ef.size === nf.size));
      onChange([...value, ...uniqueNewFiles]);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const removeFile = (e: React.MouseEvent, fileToRemove: File) => {
    e.stopPropagation();
    const updatedFiles = value.filter(f => f !== fileToRemove);
    onChange(updatedFiles);
    setError(null);
    if (inputRef.current && updatedFiles.length === 0) {
      inputRef.current.value = '';
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  return (
    <div className={styles.container}>
      {label && <span className={styles.label}>{label}</span>}
      
      {(!value.length || multiple) && (
        <div
          className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''}`}
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          onClick={onButtonClick}
        >
          <input
            ref={inputRef}
            type="file"
            className={styles.inputHidden}
            accept={accept}
            onChange={handleChange}
            multiple={multiple}
          />
          <div className={styles.iconWrapper}>
            <UploadCloud size={40} />
          </div>
          <div className={styles.textContainer}>
            <span className={styles.mainText}>Haz clic para subir o arrastra los archivos aquí</span>
            <span className={styles.subText}>Imágenes o PDFs de hasta {maxSizeMB}MB</span>
          </div>
        </div>
      )}
      
      {error && <span style={{ color: 'var(--error)', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>{error}</span>}

      {value.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
          {value.map((file, idx) => (
            <div key={`${file.name}-${idx}`} className={styles.fileContainer}>
              <div className={styles.fileInfo}>
                <div className={styles.fileDetails}>
                  <div className={styles.fileIcon}>
                    <FileText size={24} />
                  </div>
                  <div style={{ overflow: 'hidden' }}>
                    <div className={styles.fileName}>{file.name}</div>
                    <div className={styles.fileSize}>{formatBytes(file.size)}</div>
                  </div>
                </div>
                <button type="button" className={styles.removeButton} onClick={(e) => removeFile(e, file)} aria-label="Remove file">
                  <X size={16} />
                </button>
              </div>
              {previews[file.name] && (
                <div className={styles.previewContainer}>
                  {file.type.startsWith('video/') ? (
                    <video src={previews[file.name]} controls className={styles.previewImage} style={{ objectFit: 'contain', backgroundColor: '#000' }} />
                  ) : (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={previews[file.name]} alt="File preview" className={styles.previewImage} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
