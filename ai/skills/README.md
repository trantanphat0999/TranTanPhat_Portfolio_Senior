## Skills (project-level)

### Code quality
- **Vanilla JS + ESM**: ưu tiên module nhỏ, export rõ ràng.
- **Selectors stability**: không đổi `id` / `data-*` trong `index.html` nếu chưa trace trong loader/admin.
- **Error handling**: mọi Firebase call phải có log context rõ ràng.

### UX
- **Không block UI**: load overlay, toast, confirm phải nhẹ, không “nhấp nháy”.
- **A11y tối thiểu**: aria-label cho button icon, focus management cho modal.

### QA mindset
- **Happy path + edge cases**: empty data, missing fields, null urls, inactive project.
- **Regression checklist**: Admin login, CRUD (add/edit/delete), reorder layout, reload section.

