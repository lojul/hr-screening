export interface Database {
  public: {
    Tables: {
      candidates: {
        Row: {
          id: string
          created_at: string
          updated_at: string
          name: string
          email: string | null
          phone: string | null
          position_applied: string | null
          status: 'new' | 'screening' | 'interview' | 'rejected' | 'hired'
          notes: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          updated_at?: string
          name: string
          email?: string | null
          phone?: string | null
          position_applied?: string | null
          status?: 'new' | 'screening' | 'interview' | 'rejected' | 'hired'
          notes?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          updated_at?: string
          name?: string
          email?: string | null
          phone?: string | null
          position_applied?: string | null
          status?: 'new' | 'screening' | 'interview' | 'rejected' | 'hired'
          notes?: string | null
        }
      }
      cv_files: {
        Row: {
          id: string
          created_at: string
          candidate_id: string
          filename: string
          file_path: string
          file_size: number
          file_type: string
          upload_status: 'pending' | 'processing' | 'completed' | 'failed'
          parsed_data: any | null
        }
        Insert: {
          id?: string
          created_at?: string
          candidate_id: string
          filename: string
          file_path: string
          file_size: number
          file_type: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          parsed_data?: any | null
        }
        Update: {
          id?: string
          created_at?: string
          candidate_id?: string
          filename?: string
          file_path?: string
          file_size?: number
          file_type?: string
          upload_status?: 'pending' | 'processing' | 'completed' | 'failed'
          parsed_data?: any | null
        }
      }
      candidate_details: {
        Row: {
          id: string
          created_at: string
          candidate_id: string
          education: any | null
          experience: any | null
          skills: string[] | null
          soft_skills: string[] | null
          languages: string[] | null
          certifications: string[] | null
          summary: string | null
        }
        Insert: {
          id?: string
          created_at?: string
          candidate_id: string
          education?: any | null
          experience?: any | null
          skills?: string[] | null
          soft_skills?: string[] | null
          languages?: string[] | null
          certifications?: string[] | null
          summary?: string | null
        }
        Update: {
          id?: string
          created_at?: string
          candidate_id?: string
          education?: any | null
          experience?: any | null
          skills?: string[] | null
          soft_skills?: string[] | null
          languages?: string[] | null
          certifications?: string[] | null
          summary?: string | null
        }
      }
    }
  }
}

export type Candidate = Database['public']['Tables']['candidates']['Row']
export type CVFile = Database['public']['Tables']['cv_files']['Row']
export type CandidateDetails = Database['public']['Tables']['candidate_details']['Row']
