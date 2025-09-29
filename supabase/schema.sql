-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create candidates table
CREATE TABLE IF NOT EXISTS candidates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position_applied TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'screening', 'interview', 'rejected', 'hired')),
  notes TEXT
);

-- Create cv_files table
CREATE TABLE IF NOT EXISTS cv_files (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_status TEXT DEFAULT 'pending' CHECK (upload_status IN ('pending', 'processing', 'completed', 'failed')),
  parsed_data JSONB
);

-- Create candidate_details table
CREATE TABLE IF NOT EXISTS candidate_details (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  candidate_id UUID REFERENCES candidates(id) ON DELETE CASCADE,
  education JSONB,
  experience JSONB,
  skills TEXT[],
  languages TEXT[],
  certifications TEXT[],
  summary TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_candidates_email ON candidates(email);
CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_cv_files_candidate_id ON cv_files(candidate_id);
CREATE INDEX IF NOT EXISTS idx_cv_files_upload_status ON cv_files(upload_status);
CREATE INDEX IF NOT EXISTS idx_candidate_details_candidate_id ON candidate_details(candidate_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_candidates_updated_at 
  BEFORE UPDATE ON candidates 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE cv_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_details ENABLE ROW LEVEL SECURITY;

-- Create policies (allow all for now - you can restrict based on your auth needs)
CREATE POLICY "Allow all operations on candidates" ON candidates FOR ALL USING (true);
CREATE POLICY "Allow all operations on cv_files" ON cv_files FOR ALL USING (true);
CREATE POLICY "Allow all operations on candidate_details" ON candidate_details FOR ALL USING (true);
