# Interactive Reading Feature - Implementation Plan

## 🎯 Goal
Create a split-screen reading experience where students can read documents (2/3 of screen) while chatting with an AI about the content (1/3 of screen).

## 📋 Components to Create

### 1. **DocumentReader Component** 
- **Purpose**: Display PDF/document content with navigation
- **Location**: `src/components/shared/DocumentReader.tsx`
- **Features**:
  - PDF.js for PDF rendering
  - Page navigation (next/prev)
  - Zoom controls
  - Text selection highlighting
  - Reading progress tracking

### 2. **InteractiveReadingLayout Component**
- **Purpose**: Split-screen layout manager
- **Location**: `src/components/shared/InteractiveReadingLayout.tsx`
- **Features**:
  - 2/3 document viewer + 1/3 chat
  - Responsive design (mobile stack vertically)
  - Resizable divider (nice-to-have)

### 3. **DocumentChatbot Component**
- **Purpose**: Specialized chat focused on current document
- **Location**: `src/components/shared/DocumentChatbot.tsx`
- **Features**:
  - Context-aware of current document
  - Show document name/page in chat
  - Quick action buttons (summarize, explain, quiz me)

### 4. **Student Reading Page**
- **Purpose**: New page for student reading experience
- **Location**: `src/app/student/read/[documentId]/page.tsx`
- **Features**:
  - Load specific document
  - Check student access permissions
  - Full reading interface

## 🗄️ Database Updates Needed

### New Table: `reading_sessions`
```sql
- session_id (primary key)
- student_id (foreign key)
- document_id (foreign key) 
- current_page (number)
- reading_progress (percentage)
- last_accessed (timestamp)
- created_at (timestamp)
```

### New Table: `document_access`
```sql
- access_id (primary key)
- document_id (foreign key)
- student_id (foreign key) 
- granted_by (teacher_id)
- access_level (read_only, interactive)
- granted_at (timestamp)
```

## 🔧 Technical Implementation

### Phase 1: Basic PDF Viewer (Week 1)
1. Create DocumentReader with PDF.js
2. Basic page navigation
3. Simple split layout

### Phase 2: Chat Integration (Week 2)  
1. Connect chat to document context
2. Document-specific prompts
3. Student access controls

### Phase 3: Advanced Features (Week 3)
1. Reading progress tracking
2. Annotations/highlights
3. Mobile responsive design
4. Performance optimization

## 📱 User Flow

### Teacher Flow:
1. Upload document to chatbot knowledge base
2. Grant reading access to students/classes
3. Monitor reading progress and chat questions

### Student Flow:
1. Access assigned reading from dashboard
2. Split-screen opens: document + chat
3. Read and interact with AI assistant
4. Progress automatically saved

## 🎨 UI/UX Considerations

### Desktop (1200px+):
- 2/3 document (800px) + 1/3 chat (400px)
- Fixed chat on right, scrollable document on left

### Tablet (768px - 1199px):
- 60/40 split or toggle between views
- Collapsible chat panel

### Mobile (<768px):
- Stack vertically
- Document full width, chat below
- Floating chat toggle button

## 🔍 PDF Viewer Options

### Option 1: react-pdf (Recommended)
- **Pros**: React-native, good performance, TypeScript support
- **Cons**: Limited text selection features

### Option 2: PDF.js direct integration
- **Pros**: Full feature set, mature, text selection
- **Cons**: More complex setup, larger bundle

### Option 3: Third-party (PDFObject, pdf-lib)
- **Pros**: Lightweight options available
- **Cons**: Feature limitations

## 🚀 Next Steps
1. Choose PDF viewer library
2. Create basic DocumentReader component
3. Implement split layout
4. Connect to existing chat system
5. Add student access controls