---
name: Rust Professional
description: Rust patterns: ownership, error handling, async, performance
---

# Rust Professional

## Ownership and Borrowing
- Each value has one owner. When owner goes out of scope, value is dropped
- Borrow with & (immutable) or &mut (mutable), never both simultaneously
- Use Clone sparingly, prefer references

## Error Handling
- Result<T, E> for recoverable errors
- ? operator for error propagation
- Custom error types with thiserror derive
- anyhow for application code, thiserror for libraries

## Async Rust
- tokio runtime for async I/O
- async/await syntax, Future trait
- Use spawn for concurrent tasks

## Performance
- Zero-cost abstractions: iterators, generics
- Avoid unnecessary allocations
- Profile before optimizing (cargo flamegraph)
