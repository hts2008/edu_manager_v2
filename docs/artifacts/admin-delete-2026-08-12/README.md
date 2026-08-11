# Admin Master-Data Archive/Delete Evidence

## Browser Evidence

`ui-delete-student-pass.png` records the isolated review-database UI lifecycle for a temporary student. The temporary record was removed from the review dataset after the smoke.

Canonical production was then verified in an authenticated Chrome session:

- `/student-progress` rendered the released fluid dashboard with real production data and zero console errors.
- `/students`, `/parents`, `/classes` and `/teachers` exposed the admin `Xoa` action.
- The student confirmation dialog opened with the selected record and was cancelled before mutation.
- No production master-data record or mock Student Progress evidence was created or deleted.

## API Evidence

Unauthenticated `DELETE` requests to the four canonical routes returned HTTP 401 with `UNAUTHORIZED`, proving the Vercel rewrite and protected handlers are active:

- `/api/students`
- `/api/parents`
- `/api/classes`
- `/api/teachers`

The complete authorization and archive lifecycle was run against the isolated review PostgreSQL database, including anonymous 401, receptionist 403, admin success and persistence postconditions.
