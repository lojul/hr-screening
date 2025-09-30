'use client'

import { useState } from 'react'
import { X } from 'lucide-react'

interface SkillsModalProps {
  isOpen: boolean
  onClose: () => void
  skills: string[]
  title: string
  badgeColor: string
  textColor: string
}

export default function SkillsModal({ 
  isOpen, 
  onClose, 
  skills, 
  title, 
  badgeColor, 
  textColor 
}: SkillsModalProps) {
  console.log('SkillsModal render:', { isOpen, skills, title, badgeColor, textColor })
  
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {skills.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No {title.toLowerCase()} detected</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${badgeColor} ${textColor}`}
                >
                  {skill}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
