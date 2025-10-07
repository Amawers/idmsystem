![Uploading logo.jpg…]()


## 📌 Project Overview

This project is called **Integrated Digital Management System for Municipal Social Welfare Services of Villanueva**. This system is designed to automate client and case management, enhance resource tracking, support documentation processes, and facilitate real-time data monitoring through an intuitive, secure, and partially offline-capable platform. By addressing the MSWDO’s operational bottlenecks, this system aims to improve service delivery and enable more effective decision-making, benefiting both the staff and the communities they serve.

# 📚 Code Documentation Standards & Best Practices

## 📋 Overview

This section outlines the **code documentation standards** for the Integrated Digital Management System. It ensures that all files and components maintain **consistent, clear, and production-ready documentation** that helps both current and future developers understand the codebase.

---

## 🎯 Documentation Principles

### Core Guidelines
1. **Clarity Over Brevity** – Comments should explain *why*, not just *what*
2. **Self-Documenting Code** – Use descriptive names; comments supplement, not replace
3. **Maintainability First** – Write for the junior developer who will inherit your code
4. **Industry Standards** – Follow JSDoc conventions for JavaScript/React
5. **Living Documentation** – Update comments when code changes

---

## 📐 File-Level Documentation

### Standard File Header Template

Every file should start with a structured header block:

```jsx
// =============================================
// [Component/Module Name]
// ---------------------------------------------
// Purpose: [Brief description of file's role]
// 
// Key Responsibilities:
// - [Primary function 1]
// - [Primary function 2]
// - [Primary function 3]
//
// Dependencies:
// - [External library or internal module]
// - [Critical coupling points]
//
// Notes:
// - [Important implementation details]
// - [Known limitations or caveats]
// =============================================
```

## 🧩 Component Documentation

### Component-Level Structure

```jsx
/**
 * [ComponentName]
 * 
 * @description [Detailed explanation of component purpose]
 * 
 * @param {Object} props - Component props
 * @param {string} props.propName - Description of prop
 * @param {Function} props.onAction - Callback description
 * 
 * @returns {JSX.Element} Rendered component
 * 
 * @example
 * <ComponentName 
 *   propName="value"
 *   onAction={(data) => console.log(data)}
 * />
 * 
 * @remarks
 * - Important implementation detail
 * - Performance consideration
 */
export default function ComponentName({ propName, onAction }) {
  // Implementation
}
```
## 🔧 Function Documentation

### Standard Function Comment Block

```jsx
/**
 * [FunctionName]
 * 
 * @description [What the function does and why it exists]
 * 
 * @param {Type} paramName - Description of parameter
 * @param {Type} [optionalParam] - Optional parameter description
 * 
 * @returns {Type} Description of return value
 * 
 * @throws {ErrorType} When/why this error occurs
 * 
 * @example
 * const result = functionName(arg1, arg2);
 */
function functionName(paramName, optionalParam) {
  // Implementation
}
```

---

## 🧠 State & Store Documentation

### Zustand Store Structure

```jsx
/**
 * [StoreName] - Zustand State Store
 * 
 * @description [Purpose of this state store]
 * 
 * @typedef {Object} StoreState
 * @property {Type} stateProp - Description of state property
 * @property {Function} action - Description of action function
 * 
 * @example
 * const { stateProp, action } = useStore();
 * action(newValue);
 */
export const useStore = create((set) => ({
  // State definitions with inline comments
  stateProp: initialValue, // Purpose of this state

  // Action definitions with block comments
  /**
   * Updates the state property
   * @param {Type} value - New value to set
   */
  action: (value) => set({ stateProp: value }),
}));
```

---

## 📊 Complex Logic Documentation

### Multi-Step Process Comments

For complex business logic, use **section headers** and **step-by-step breakdown**:

```jsx
// ========================================
// STEP 1: Validate Form Inputs
// ========================================
const errors = [];
if (!caseNo) errors.push("Case No. is required");
if (isNaN(plainHeads)) errors.push("Plain heads must be numeric");

if (errors.length > 0) {
  toast.error("Validation failed", { 
    description: errors.join(", ") 
  });
  return;
}

// ========================================
// STEP 2: Transform Data for Database
// ========================================
const payload = {
  case_no: caseNo,
  // ...other fields
};

// ========================================
// STEP 3: Update Supabase Record
// ========================================
const { data, error } = await supabase
  .from("sample_table")
  .update(payload)
  .eq("id", recordId)
  .select()
  .single();

// Error handling with audit logging
if (error) {
  await logAudit({
    action: "UPDATE",
    success: false,
    errorMessage: error.message,
  });
  throw error;
}

// ========================================
// STEP 4: Refresh Table and Notify User
// ========================================
await fetchTransactions(); // Re-fetch from store
toast.success("Record updated successfully");
onOpenChange(false); // Close modal
```

---

## 🚨 Error Handling Documentation

### Standard Error Comment Pattern

```jsx
try {
  // Main operation
  await performDatabaseUpdate();
  
} catch (err) {
  // ❌ Log error audit trail for debugging
  await logAudit({
    action: "UPDATE",
    entity: "transaction",
    success: false,
    errorMessage: err.message,
    severity: "CRITICAL",
  }).catch((auditErr) => {
    // Prevent audit logging failure from blocking user feedback
    console.error("Audit logging failed:", auditErr);
  });
  
  // Show user-friendly error message
  toast.error("Failed to update record", {
    description: "Please check your inputs and try again.",
  });
  
} finally {
  setSubmitting(false); // Always reset loading state
}
```

---

## 🔄 Hook Documentation

### Custom Hook Structure

```jsx
/**
 * [useHookName]
 * 
 * @description [Purpose and usage of the hook]
 * 
 * @param {Object} config - Hook configuration
 * @param {Type} config.option - Description of option
 * 
 * @returns {Object} Hook return object
 * @returns {Type} return.value - Description of return value
 * @returns {Function} return.action - Description of action
 * 
 * @example
 * const { value, action } = useHookName({ option: "value" });
 * 
 * @remarks
 * - Important implementation detail
 * - Performance consideration
 */
export function useHookName({ option }) {
  // Implementation
}
```

---

## 📝 Inline Comment Best Practices

### When to Use Inline Comments

✅ **DO comment:**
- Complex business logic or formulas
- Non-obvious performance optimizations
- Workarounds for known issues
- Intentional deviations from conventions
- Sections of code that will be refactored later

❌ **DON'T comment:**
- Obvious code (e.g., `// Set variable to 5`)
- Redundant explanations of what the code literally does
- Outdated or misleading information

### Good Inline Comment Examples

```jsx
// ✅ GOOD: Explains WHY, not WHAT
// Convert to number before arithmetic to prevent NaN errors from string concatenation
const total = Number(caseNo) + Number(farNo);

// ✅ GOOD: Highlights non-obvious business rule
// Only head can edit records (enforced at UI level, backend also validates)
if (role !== "head") return null;

// ✅ GOOD: Documents intentional trade-off
// Using setTimeout instead of useEffect to avoid race conditions with modal unmount
setTimeout(() => resetForm(), 100);
```

### Bad Inline Comment Examples

```jsx
// ❌ BAD: States the obvious
// Set loading to true
setLoading(true);

// ❌ BAD: Redundant explanation
// Return JSX that renders a button
return <Button>Click me</Button>;

// ❌ BAD: Outdated information
// TODO: Remove this once new API is ready (NOTE: This was from 2022!)
const legacyFunction = () => { /* ... */ };
```

---

## 🗂️ Section Dividers

### Visual Code Organization

Use dividers to separate logical sections in long files:

```jsx
//* ================================================
//* STATE MANAGEMENT
//* ================================================
const [open, setOpen] = useState(false);
const [activeTab, setActiveTab] = useState(0);

//* ================================================
//* FORM HANDLERS
//* ================================================
const handleSubmit = async (e) => {
  // Implementation
};

//* ================================================
//* RENDER HELPERS
//* ================================================
const renderTabContent = () => {
  // Implementation
};

//* ================================================
//* MAIN COMPONENT RENDER
//* ================================================
return (
  <Dialog open={open} onOpenChange={setOpen}>
    {/* ... */}
  </Dialog>
);
```

---

## 📖 FILE STRUCTURE
```
feature/
├── FeatureComponent.jsx    # Main component
├── FeatureModal.jsx         # Modal dialog
├── FeatureForm.jsx          # Form logic
└── hooks/
    └── useFeatureData.jsx   # Custom data hook
```
---

### References
- [JSDoc Official Documentation](https://jsdoc.app/)
- [React Component Documentation Guide](https://react.dev/learn/writing-markup-with-jsx#comment-syntax)
- [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)

---

## 🤝 Contributing

When adding new features or refactoring existing code:

1. **Write documentation FIRST** (TDD-style)
   - Define function signatures with JSDoc
   - Outline expected behavior in comments
   - Then implement the code

2. **Update existing documentation** when modifying code
   - Don't leave orphaned comments
   - Update examples if API changes
   - Adjust section headers if logic flow changes

3. **Review your own documentation** before PR
   - Read comments as if you're a new developer
   - Verify examples actually work
   - Check for typos and clarity

---

**Last Updated:** October 7, 2025  
**Developer:** Christian Jericho A. Dacoroon
**Version:** 1.0.0

---

This documentation standard is a **living document**. As the codebase evolves and new patterns emerge, update this guide to reflect best practices learned from experience. 🚀
