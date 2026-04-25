---
name: I18N Localization
description: Internationalization: translation keys, locale management, RTL support
---

# I18N Localization

## Key Management
- Use dot-notation keys: pages.home.title, common.buttons.submit
- Group by feature, not by page
- Never use UI text as translation key
- Keep keys stable across releases

## Translation Workflow
- Default language: English (source of truth)
- Extract keys automatically from code
- Send to translation service or translator
- Import translations back as JSON/YAML

## Implementation
- Use established library: react-i18next, vue-i18n, next-intl
- Lazy load locale files per language
- Fallback to default language for missing keys
- Pluralization rules per language

## Formatting
- Dates: use Intl.DateTimeFormat, not hardcoded format
- Numbers: use Intl.NumberFormat for currency, percentage
- Currency: format according to locale, not just symbol

## RTL Support
- Use logical CSS properties: margin-inline-start instead of margin-left
- Test with RTL languages (Arabic, Hebrew)
- Mirror layout but not icons
