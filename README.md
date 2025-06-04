# ClassBots

An AI-powered educational platform that enables teachers to create custom chatbots for student learning and assessment.

## Features

- **Custom AI Chatbots**: Teachers can create specialized chatbots with custom prompts and knowledge bases
- **Room-Based Learning**: Students join virtual rooms to interact with chatbots
- **RAG Support**: Upload documents to create knowledge-enhanced chatbots
- **Assessment System**: Built-in assessment capabilities with AI-powered grading
- **Safety Monitoring**: Automated detection of concerning messages with teacher alerts
- **Reading Room**: Dedicated chatbots for guided reading comprehension
- **Personalized Learning Memory**: AI-powered session summaries that help chatbots remember student progress
- **Scalable Architecture**: Queue-based processing system supporting thousands of concurrent users

## Tech Stack

- **Frontend**: Next.js 15.3.1, React, TypeScript, Styled Components
- **Backend**: Supabase (PostgreSQL, Auth, Realtime, Storage)
- **AI**: OpenAI API (via OpenRouter)
- **Vector Database**: Pinecone (for RAG functionality)
- **Deployment**: Vercel

## Project Structure

```
classbots-development/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── components/       # React components
│   ├── lib/             # Utilities and integrations
│   ├── hooks/           # Custom React hooks
│   └── types/           # TypeScript type definitions
├── supabase/
│   └── migrations/      # Database schema migrations
├── public/              # Static assets
└── archive/             # Archived SQL files
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account
- OpenRouter API key
- Pinecone account (for RAG features)

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
OPENROUTER_API_KEY=your_openrouter_key
PINECONE_API_KEY=your_pinecone_key
PINECONE_INDEX_NAME=your_index_name
```

### Installation

```bash
# Install dependencies
npm install

# Run database migrations
cd supabase
supabase db reset

# Start development server
npm run dev
```

## Database Setup

See `/supabase/migrations/README.md` for detailed database setup instructions.

## Documentation

- `DOCUMENTATION_GUIDE.md` - Overview of all documentation files
- `COLOR_SCHEME.md` - Design system and color palette
- `SAFETY_FEATURE.md` - Safety monitoring system details
- `performance-optimizations.md` - Performance improvement strategies

## Development

### Code Style

- TypeScript for type safety
- Styled Components for styling
- Follow existing patterns in the codebase
- No unnecessary animations on interactive elements

### Testing

Run the development server and test features locally:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## License

Private project - All rights reserved