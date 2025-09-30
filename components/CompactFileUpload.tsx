'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, X } from 'lucide-react'

interface CompactFileUploadProps {
  onFileSelect: (file: File) => void
  uploading: boolean
}

export default function CompactFileUpload({ onFileSelect, uploading }: CompactFileUploadProps) {
  const [dragActive, setDragActive] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    }
  }

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0]
      if (validateFile(file)) {
        setSelectedFile(file)
        onFileSelect(file)
      }
    }
  }

  const validateFile = (file: File): boolean => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword'
    ]

    if (!allowedTypes.includes(file.type)) {
      alert('Please select a PDF or Word document')
      return false
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return false
    }

    return true
  }

  const removeFile = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <div className="relative">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          dragActive
            ? 'bg-blue-100 text-blue-600'
            : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
        } ${uploading ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !uploading && fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={uploading}
        />

        {uploading ? (
          <div className="w-4 h-4 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
        ) : selectedFile ? (
          <FileText className="w-4 h-4 text-green-600" />
        ) : (
          <Upload className="w-4 h-4" />
        )}
      </div>

      {/* File info tooltip */}
      {selectedFile && (
        <div className="absolute bottom-full right-0 mb-2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
          <div className="flex items-center space-x-1">
            <span>{selectedFile.name}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                removeFile()
              }}
              className="ml-1 hover:text-red-300"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
