# IDM System - Copilot Instructions

## Architecture Overview
This is a React-based ID Management System for case intake and management, built with Vite, Tailwind CSS, and Supabase backend.

### Key Technologies
- **Frontend**: React 19 + Vite + Tailwind CSS
- **UI Library**: shadcn/ui components (`@/components/ui/*`)
- **Backend**: Supabase (auth, database, storage)
- **State Management**: Zustand stores (`authStore.js`, `useIntakeFormStore.js`)
- **Forms**: React Hook Form with Zod validation
- **Tables**: TanStack Table with drag-and-drop (@dnd-kit)
- **Routing**: React Router DOM v7

## Project Structure Patterns

### Component Organization
- `src/components/ui/` - shadcn/ui base components (button, input, etc.)
- `src/components/intake sheet/` - Multi-step form components
- `src/components/cases/` - Case management and data tables
- `src/pages/case manager/` - Complete intake workflows

### Import Patterns
Always use the `@/` alias for internal imports:
```javascript
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
```

### Form Architecture
The intake system uses a **multi-step wizard pattern**:
1. Each form section is a separate component with `sectionKey` prop
2. Global state managed via `useIntakeFormStore` with `setSectionField()`
3. Navigation controlled by `goNext`/`goBack` callbacks
4. Final submission consolidates all sections

Example form component signature:
```javascript
export function FormComponent({ sectionKey, goNext, goBack, isSecond }) {
  const { data, setSectionField } = useIntakeFormStore();
  // Form implementation
}
```

### State Management Patterns

#### Auth Store (`authStore.js`)
- Handles Supabase auth, user profiles, and role-based access
- Fetches additional profile data (role, avatar) after login
- Manages signed URLs for avatar storage

#### Intake Form Store (`useIntakeFormStore.js`)
- Centralized form data across multi-step intake process
- Use `setSectionField(section, fieldOrValues, maybeValue)` for updates
- Supports both object merging and individual field updates

### Supabase Integration
- Config: `config/supabase.js` with environment variables
- Auth: Full authentication flow with profile data linking
- Database: Tables include `profile`, case data, etc.
- Storage: Profile pictures with signed URL generation

## Development Workflows

### Running the Project
```bash
npm run dev        # Development server
npm run build      # Production build
npm run preview    # Preview production build
npm run lint       # ESLint checking
```

### Key File Locations
- **Environment**: `.env` files for Supabase credentials
- **Routing**: `src/App.jsx` contains main router and layout
- **Protected Routes**: `src/pages/ProtectedRoute.jsx` for auth checks
- **Sample Data**: `SAMPLE_*.json` files in root for testing

## Component Conventions

### UI Components
Use shadcn/ui components consistently. Common patterns:
- Form validation with `react-hook-form` and Zod schemas
- Conditional rendering based on user roles/permissions
- Consistent spacing and styling with Tailwind classes

### Data Tables
Use TanStack Table with drag-and-drop capabilities:
- Components in `src/components/cases/tables/`
- Sortable rows with `@dnd-kit/sortable`
- Custom cell viewers and renderers

### Case Management
Two main intake types:
1. Standard intake: `IntakeSheet.jsx`
2. CICL/CAR intake: `IntakeSheetCICLCAR.jsx`

Both follow the same multi-step pattern with different form sets.

## Common Patterns

### Protected Routes
Wrap authenticated pages with `ProtectedRoute` and include role checks:
```javascript
<ProtectedRoute allowedRoles={['case_manager']}>
  <YourComponent />
</ProtectedRoute>
```

### Toast Notifications
Use Sonner for user feedback:
```javascript
import { toast } from "sonner";
toast.success("Action completed");
```

### Document Generation
Uses `docxtemplater` for generating documents from templates:
- Template files in `public/template.docx`
- Data merging for case reports and forms