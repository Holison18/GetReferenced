'use client'

import { useState, useEffect } from 'react'
import { Search, User, Star, Sparkles } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { supabase } from '@/lib/supabase'

interface Lecturer {
  id: string
  first_name: string
  last_name: string
  department: string
  rank: string
  affiliated_departments?: string[]
}

interface LecturerSelectionProps {
  selectedLecturers: string[]
  onSelectionChange: (lecturerIds: string[]) => void
  requestPurpose?: string
  maxSelection?: number
}

export default function LecturerSelection({ 
  selectedLecturers, 
  onSelectionChange, 
  requestPurpose,
  maxSelection = 2 
}: LecturerSelectionProps) {
  const [lecturers, setLecturers] = useState<Lecturer[]>([])
  const [filteredLecturers, setFilteredLecturers] = useState<Lecturer[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([])

  useEffect(() => {
    fetchLecturers()
  }, [])

  useEffect(() => {
    filterLecturers()
  }, [searchTerm, lecturers])

  useEffect(() => {
    if (requestPurpose && lecturers.length > 0) {
      generateAISuggestions()
    }
  }, [requestPurpose, lecturers])

  const fetchLecturers = async () => {
    try {
      const { data, error } = await supabase
        .from('lecturer_profiles')
        .select(`
          id,
          department,
          affiliated_departments,
          rank,
          profiles!inner(
            first_name,
            last_name
          )
        `)

      if (error) throw error

      const formattedLecturers = data.map(lecturer => ({
        id: lecturer.id,
        first_name: lecturer.profiles.first_name,
        last_name: lecturer.profiles.last_name,
        department: lecturer.department,
        rank: lecturer.rank,
        affiliated_departments: lecturer.affiliated_departments
      }))

      setLecturers(formattedLecturers)
    } catch (error) {
      console.error('Error fetching lecturers:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterLecturers = () => {
    if (!searchTerm) {
      setFilteredLecturers(lecturers)
      return
    }

    const filtered = lecturers.filter(lecturer => {
      const fullName = `${lecturer.first_name} ${lecturer.last_name}`.toLowerCase()
      const department = lecturer.department.toLowerCase()
      const search = searchTerm.toLowerCase()
      
      return fullName.includes(search) || department.includes(search)
    })

    setFilteredLecturers(filtered)
  }

  const generateAISuggestions = async () => {
    // Simple AI suggestion logic based on purpose and department relevance
    // In a real implementation, this would call OpenAI API
    const suggestions: string[] = []
    
    if (requestPurpose === 'school') {
      // Prioritize senior lecturers and professors
      const seniorLecturers = lecturers.filter(l => 
        l.rank.toLowerCase().includes('professor') || 
        l.rank.toLowerCase().includes('senior')
      )
      suggestions.push(...seniorLecturers.slice(0, 3).map(l => l.id))
    } else if (requestPurpose === 'job') {
      // Prioritize lecturers with industry connections (simplified)
      suggestions.push(...lecturers.slice(0, 3).map(l => l.id))
    } else if (requestPurpose === 'scholarship') {
      // Prioritize research-focused lecturers
      const researchLecturers = lecturers.filter(l => 
        l.rank.toLowerCase().includes('professor') ||
        l.rank.toLowerCase().includes('research')
      )
      suggestions.push(...researchLecturers.slice(0, 3).map(l => l.id))
    }

    setAiSuggestions(suggestions.slice(0, 3))
  }

  const toggleLecturerSelection = (lecturerId: string) => {
    if (selectedLecturers.includes(lecturerId)) {
      onSelectionChange(selectedLecturers.filter(id => id !== lecturerId))
    } else if (selectedLecturers.length < maxSelection) {
      onSelectionChange([...selectedLecturers, lecturerId])
    }
  }

  const isSelected = (lecturerId: string) => selectedLecturers.includes(lecturerId)
  const isAISuggested = (lecturerId: string) => aiSuggestions.includes(lecturerId)

  if (loading) {
    return <div className="text-center py-8">Loading lecturers...</div>
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Search lecturers by name or department..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* AI Suggestions */}
      {aiSuggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-lg">
              <Sparkles className="h-5 w-5 text-blue-500" />
              <span>AI Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Based on your request purpose, we recommend these lecturers:
            </p>
            <div className="grid gap-3">
              {aiSuggestions.map(lecturerId => {
                const lecturer = lecturers.find(l => l.id === lecturerId)
                if (!lecturer) return null

                return (
                  <div
                    key={lecturer.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      isSelected(lecturer.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => toggleLecturerSelection(lecturer.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <User className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium">
                            {lecturer.first_name} {lecturer.last_name}
                          </p>
                          <p className="text-sm text-gray-600">
                            {lecturer.rank} • {lecturer.department}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className="text-xs">
                          <Star className="h-3 w-3 mr-1" />
                          Recommended
                        </Badge>
                        {isSelected(lecturer.id) && (
                          <Badge variant="default" className="text-xs">
                            Selected
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Status */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          Selected {selectedLecturers.length} of {maxSelection} lecturers
        </p>
        {selectedLecturers.length === maxSelection && (
          <p className="text-sm text-amber-600">
            Maximum selection reached
          </p>
        )}
      </div>

      {/* Lecturer List */}
      <div className="grid gap-3 max-h-96 overflow-y-auto">
        {filteredLecturers.map(lecturer => (
          <div
            key={lecturer.id}
            className={`p-4 border rounded-lg cursor-pointer transition-colors ${
              isSelected(lecturer.id)
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            } ${
              selectedLecturers.length >= maxSelection && !isSelected(lecturer.id)
                ? 'opacity-50 cursor-not-allowed'
                : ''
            }`}
            onClick={() => {
              if (selectedLecturers.length < maxSelection || isSelected(lecturer.id)) {
                toggleLecturerSelection(lecturer.id)
              }
            }}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-gray-600" />
                </div>
                <div>
                  <p className="font-medium">
                    {lecturer.first_name} {lecturer.last_name}
                  </p>
                  <p className="text-sm text-gray-600">
                    {lecturer.rank} • {lecturer.department}
                  </p>
                  {lecturer.affiliated_departments && lecturer.affiliated_departments.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Also affiliated: {lecturer.affiliated_departments.join(', ')}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {isAISuggested(lecturer.id) && (
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="h-3 w-3 mr-1" />
                    AI Pick
                  </Badge>
                )}
                {isSelected(lecturer.id) && (
                  <Badge variant="default" className="text-xs">
                    Selected
                  </Badge>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredLecturers.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No lecturers found matching your search.
        </div>
      )}
    </div>
  )
}