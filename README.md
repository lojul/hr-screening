# HR Screening System

A modern, minimal HR screening application that allows you to upload candidate CVs (PDF and Word documents) and automatically extract candidate information for database storage.

## Features

- **CV Upload**: Support for PDF and Word documents (.pdf, .doc, .docx)
- **Automatic Data Extraction**: Parses CVs to extract candidate details including:
  - Name, email, phone number
  - Education history
  - Work experience
  - Skills and certifications
  - Languages and summary
- **Candidate Management**: View, search, and manage candidate records
- **Status Tracking**: Track candidates through different stages (New, Screening, Interview, Hired, Rejected)
- **Professional UI**: Clean, minimal interface built with Next.js and Tailwind CSS

## Tech Stack

- **Frontend**: Next.js 14, React, TypeScript
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **File Storage**: Supabase Storage
- **Styling**: Tailwind CSS
- **CV Parsing**: pdf-parse, mammoth

## Setup Instructions

### 1. Clone and Install Dependencies

```bash
cd hr-screening
npm install
```

### 2. Set up Supabase

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to your project dashboard
3. Navigate to Settings > API to get your project URL and anon key
4. Go to Settings > Database to get your service role key

### 3. Configure Environment Variables

Create a `.env.local` file in the root directory:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 4. Set up Database Schema

1. In your Supabase dashboard, go to the SQL Editor
2. Copy and paste the contents of `supabase/schema.sql`
3. Run the SQL to create the necessary tables and policies

### 5. Set up File Storage

1. In your Supabase dashboard, go to Storage
2. Create a new bucket called `cv-files`
3. Set the bucket to public if you want to access files directly

### 6. Run the Application

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Uploading CVs

1. Click the "Upload CV" button
2. Select a PDF or Word document
3. The system will automatically:
   - Upload the file to Supabase Storage
   - Parse the CV content
   - Extract candidate information
   - Store the data in the database

### Managing Candidates

- **View**: All candidates are displayed in a table format
- **Search**: Use the search bar to find candidates by name or email
- **Filter**: Filter candidates by status using the dropdown
- **Update Status**: Change candidate status directly from the table
- **Delete**: Remove candidates from the system

## Database Schema

### Tables

- **candidates**: Basic candidate information
- **cv_files**: CV file metadata and storage paths
- **candidate_details**: Parsed CV data (education, experience, skills, etc.)

### File Storage

CV files are stored in Supabase Storage under the `cv-files` bucket with the naming convention: `{candidate_id}.{file_extension}`

## API Endpoints

- `POST /api/upload` - Upload and process CV files
- `GET /api/candidates` - Fetch candidates with optional filtering
- `PUT /api/candidates` - Update candidate information
- `DELETE /api/candidates` - Delete candidate records

## File Size Limits

- Maximum file size: 10MB
- Supported formats: PDF, DOC, DOCX

## Security

- File type validation
- File size limits
- Row Level Security (RLS) enabled on all tables
- Secure file storage with proper access controls

## Development

### Project Structure

```
hr-screening/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Main page
├── lib/                   # Utility libraries
│   ├── supabase.ts        # Supabase client
│   ├── database.types.ts  # TypeScript types
│   └── cv-parser.ts       # CV parsing logic
├── supabase/              # Database schema
│   └── schema.sql         # SQL schema
└── public/                # Static assets
```

### Adding New Features

1. **New CV Fields**: Update the `ParsedCVData` interface and parsing logic
2. **Database Changes**: Modify the schema and update TypeScript types
3. **UI Components**: Add new components in the `components/` directory
4. **API Endpoints**: Create new routes in `app/api/`

## Troubleshooting

### Common Issues

1. **File Upload Fails**: Check file size and type restrictions
2. **CV Parsing Errors**: Ensure the CV contains readable text (not scanned images)
3. **Database Connection**: Verify Supabase credentials and network connectivity
4. **Storage Issues**: Check Supabase Storage bucket configuration

### Debug Mode

Enable debug logging by setting `NODE_ENV=development` in your environment variables.

## License

This project is open source and available under the MIT License.
