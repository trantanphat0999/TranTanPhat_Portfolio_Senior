## Agents (vai trò + playbooks)

### `frontend-maintainer`
**Nhiệm vụ**: chỉnh UI/UX, selectors, modal/lightbox, đảm bảo không vỡ layout.

### `data-integrator`
**Nhiệm vụ**: thay đổi schema Firestore + update loader/admin forms tương ứng.

### `qa-guardian`
**Nhiệm vụ**: tạo checklist regression, tìm edge cases, rà console errors.

### Playbook: thêm field mới vào một section
1. Update `db-seed.js` (seed data).
2. Update render trong loader (section tương ứng).
3. Update admin form (edit/add) để field editable.
4. Test: seed → reload → edit → save → reload section.

