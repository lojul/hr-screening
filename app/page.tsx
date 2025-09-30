'use client'

import { useState, useEffect } from 'react'
import { Users, FileText, CheckCircle, XCircle, Clock, Download } from 'lucide-react'
import { Candidate } from '@/lib/database.types'
import FileUpload from '@/components/FileUpload'
import CompactFileUpload from '@/components/CompactFileUpload'
import SkillsModal from '@/components/SkillsModal'

export default function Home() {
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [skillFilter, setSkillFilter] = useState('')
  const [reprocessing, setReprocessing] = useState(false)
  const [skillsModal, setSkillsModal] = useState<{
    isOpen: boolean
    skills: string[]
    title: string
    badgeColor: string
    textColor: string
  }>({
    isOpen: false,
    skills: [],
    title: '',
    badgeColor: '',
    textColor: ''
  })

  useEffect(() => {
    fetchCandidates()
  }, [statusFilter, searchTerm, skillFilter])

  const fetchCandidates = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (searchTerm) params.append('search', searchTerm)
      if (skillFilter) params.append('skills', skillFilter)

      console.log('Fetching candidates with params:', params.toString())
      const response = await fetch(`/api/candidates?${params}`)
      const data = await response.json()
      console.log('Candidates API response:', data)
      
      // Ensure match_score is available on items (API provides it when skills param is present)
      const list = (data.candidates || [])
      console.log('Setting candidates list:', list.length, 'candidates')
      // If match scores exist, keep API order (already sorted by score); otherwise, default order
      setCandidates(list)
    } catch (error) {
      console.error('Error fetching candidates:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    console.log('Starting file upload:', file.name)
    setUploading(true)
    const formData = new FormData()
    formData.append('file', file)
    formData.append('candidateName', file.name.split('.')[0])

    try {
      console.log('Sending upload request...')
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })

      console.log('Upload response status:', response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error('Upload failed:', errorText)
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const result = await response.json()
      console.log('Upload result:', result)
      
      if (result.success) {
        console.log('Upload successful, refreshing candidates...')
        // Refresh the candidate list
        await fetchCandidates()
        // Extra refresh shortly after to account for any eventual consistency
        setTimeout(() => {
          fetchCandidates()
        }, 800)
        alert('CV uploaded and processed successfully!')
      } else {
        console.error('Upload failed:', result.error)
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error('Upload error:', error)
      alert(`Failed to upload CV: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setUploading(false)
    }
  }

  const updateCandidateStatus = async (id: string, status: string) => {
    try {
      const response = await fetch('/api/candidates', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })

      if (response.ok) {
        fetchCandidates()
      }
    } catch (error) {
      console.error('Error updating status:', error)
    }
  }

  const deleteCandidate = async (id: string) => {
    if (!confirm('Are you sure you want to delete this candidate?')) return

    try {
      const response = await fetch(`/api/candidates?id=${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        fetchCandidates()
      }
    } catch (error) {
      console.error('Error deleting candidate:', error)
    }
  }

  const reprocessAll = async () => {
    if (!confirm('Reprocess all CVs now? This may take a while.')) return
    setReprocessing(true)
    try {
      const res = await fetch('/api/reprocess', { method: 'POST', headers: { 'Content-Type': 'application/json' } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')
      fetchCandidates()
      alert('Reprocess completed')
    } catch (e) {
      alert('Reprocess failed')
    } finally {
      setReprocessing(false)
    }
  }

  const openSkillsModal = (skills: string[], title: string, badgeColor: string, textColor: string) => {
    console.log('Opening skills modal:', { skills, title, badgeColor, textColor })
    setSkillsModal({
      isOpen: true,
      skills,
      title,
      badgeColor,
      textColor
    })
  }

  const closeSkillsModal = () => {
    setSkillsModal({
      isOpen: false,
      skills: [],
      title: '',
      badgeColor: '',
      textColor: ''
    })
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-100 text-blue-800'
      case 'screening': return 'bg-yellow-100 text-yellow-800'
      case 'interview': return 'bg-purple-100 text-purple-800'
      case 'hired': return 'bg-green-100 text-green-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="w-4 h-4" />
      case 'screening': return <FileText className="w-4 h-4" />
      case 'interview': return <Users className="w-4 h-4" />
      case 'hired': return <CheckCircle className="w-4 h-4" />
      case 'rejected': return <XCircle className="w-4 h-4" />
      default: return <Clock className="w-4 h-4" />
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <h1 className="text-2xl font-bold text-gray-900">HR Screening System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={reprocessAll}
                disabled={reprocessing}
                className={`px-3 py-2 rounded-lg text-white ${reprocessing ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'} transition-colors`}
              >
                {reprocessing ? 'Reprocessing…' : 'Reprocess All CVs'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search by Name/Email
              </label>
              <input
                type="text"
                placeholder="Search candidates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filter by Skills
              </label>
              <input
                type="text"
                placeholder="e.g., React, Python, JavaScript (comma-separated)"
                value={skillFilter}
                onChange={(e) => setSkillFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status Filter
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="new">New</option>
                <option value="screening">Screening</option>
                <option value="interview">Interview</option>
                <option value="hired">Hired</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Candidates List */}
        <div className="bg-white rounded-lg shadow-sm">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading candidates...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No candidates found</h3>
              <p className="text-gray-600 mb-6">Upload a CV to get started</p>
              {/* Upload section in center when no candidates */}
              <div className="max-w-md mx-auto">
                <FileUpload onFileSelect={handleFileUpload} uploading={uploading} />
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Candidate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Position
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    {skillFilter && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Match
                      </th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Skills
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Soft Skills
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12"></th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {candidates.map((candidate: any) => (
                    <tr key={candidate.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {candidate.name}
                          </div>
                          <div className="text-sm text-gray-500">
                            {new Date(candidate.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{candidate.email || '-'}</div>
                        <div className="text-sm text-gray-500">{candidate.phone || '-'}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {candidate.position_applied || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={candidate.status}
                          onChange={(e) => updateCandidateStatus(candidate.id, e.target.value)}
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(candidate.status)}`}
                        >
                          <option value="new">New</option>
                          <option value="screening">Screening</option>
                          <option value="interview">Interview</option>
                          <option value="hired">Hired</option>
                          <option value="rejected">Rejected</option>
                        </select>
                      </td>
                      {skillFilter && (
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {typeof candidate.match_score === 'number' ? `${candidate.match_score}%` : '-'}
                          </span>
                        </td>
                      )}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {candidate.candidate_details?.[0]?.skills?.slice(0, 3).map((skill: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.candidate_details?.[0]?.skills?.length > 3 && (
                            <button
                              onClick={() => {
                                console.log('Button clicked, skills:', candidate.candidate_details[0].skills)
                                openSkillsModal(
                                  candidate.candidate_details[0].skills,
                                  'Technical Skills',
                                  'bg-blue-100',
                                  'text-blue-800'
                                )
                              }}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer select-none"
                              style={{ pointerEvents: 'auto' }}
                            >
                              +{candidate.candidate_details[0].skills.length - 3} more
                            </button>
                          )}
                          {(!candidate.candidate_details?.[0]?.skills || candidate.candidate_details[0].skills.length === 0) && (
                            <span className="text-xs text-gray-400">No skills detected</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {candidate.candidate_details?.[0]?.soft_skills?.slice(0, 3).map((skill: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                            >
                              {skill}
                            </span>
                          ))}
                          {candidate.candidate_details?.[0]?.soft_skills?.length > 3 && (
                            <button
                              onClick={() => {
                                console.log('Soft skills button clicked, skills:', candidate.candidate_details[0].soft_skills)
                                openSkillsModal(
                                  candidate.candidate_details[0].soft_skills,
                                  'Soft Skills',
                                  'bg-purple-100',
                                  'text-purple-800'
                                )
                              }}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors cursor-pointer select-none"
                              style={{ pointerEvents: 'auto' }}
                            >
                              +{candidate.candidate_details[0].soft_skills.length - 3} more
                            </button>
                          )}
                          {(!candidate.candidate_details?.[0]?.soft_skills || candidate.candidate_details[0].soft_skills.length === 0) && (
                            <span className="text-xs text-gray-400">No soft skills detected</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <button
                          onClick={async () => {
                            try {
                              const res = await fetch('/api/cv-download', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ candidateId: candidate.id })
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Download failed')
                              const a = document.createElement('a')
                              a.href = data.url
                              a.download = data.filename || 'cv'
                              document.body.appendChild(a)
                              a.click()
                              a.remove()
                            } catch (e) {
                              alert('No CV available for download')
                            }
                          }}
                          className="text-blue-600 hover:text-blue-900"
                          title="Download latest CV"
                        >
                          <Download className="w-5 h-5" />
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-3">
                        <button
                          onClick={() => deleteCandidate(candidate.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm('Reprocess this candidate\'s CV(s)?')) return
                            setReprocessing(true)
                            try {
                              const res = await fetch('/api/reprocess', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ candidateId: candidate.id })
                              })
                              const data = await res.json()
                              if (!res.ok) throw new Error(data.error || 'Failed')
                              fetchCandidates()
                              alert('Reprocessed candidate successfully')
                            } catch (e) {
                              alert('Reprocess failed')
                            } finally {
                              setReprocessing(false)
                            }
                          }}
                          className="text-green-700 hover:text-green-900"
                        >
                          Reprocess
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Floating Upload Section - Mobile Optimized */}
        {candidates.length > 0 && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-white rounded-full shadow-lg border p-2 group hover:shadow-xl transition-all duration-200">
              <CompactFileUpload onFileSelect={handleFileUpload} uploading={uploading} />
            </div>
          </div>
        )}

        {/* Skills Modal */}
        <SkillsModal
          isOpen={skillsModal.isOpen}
          onClose={closeSkillsModal}
          skills={skillsModal.skills}
          title={skillsModal.title}
          badgeColor={skillsModal.badgeColor}
          textColor={skillsModal.textColor}
        />
      </main>
    </div>
  )
}
