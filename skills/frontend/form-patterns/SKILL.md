---
name: Form Patterns
description: Form validation, multi-step forms, error handling, submission
---

# Form Patterns

## Validation Strategy
- Client-side for UX, server-side for security (always both)
- Validate on blur for individual fields, on submit for form
- Use Zod or Yup schema for type-safe validation

## Error Handling
- Inline errors below each field
- Error summary at form top for complex forms
- Preserve user input on validation failure
- Scroll to first error field

## Multi-Step Forms
- Progress indicator showing current/total steps
- Save draft between steps (localStorage or server)
- Allow back navigation without losing data
- Final review step before submission

## Submission
- Disable submit button during submission
- Show loading state
- Optimistic UI or redirect on success
- Retry mechanism on network failure

## Accessibility
- Label every input (not placeholder-only)
- aria-describedby for error messages
- Logical tab order, keyboard submittable
