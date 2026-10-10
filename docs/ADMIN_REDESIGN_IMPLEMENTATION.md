# Kết quả redesign Admin và CV Studio

Ngày: 10/10/2026, Asia/Saigon. Thay đổi nằm trong workspace local; chưa deploy hoặc chuyển dữ liệu Firestore thật.

## Đã triển khai

- Admin workspace có Overview, Content, CV Studio, AI Assistant, Settings & Sync. Content có tìm kiếm và thao tác Edit/Add/Arrange nối với các luồng quản trị hiện có.
- CV Studio là trang trong workspace, không overlay/dialog trên public. Đổi sidebar giữ draft và JD. Có zoom Fit width/100–200%, ẩn/hiện inspector, tab Format/Content/AI, Undo và footer lưu/xuất.
- Preview render chính bytes PDF bằng PDF.js vendored; không tạo HTML CV riêng. PDF xuất vẫn có text Unicode, font nhúng và hyperlinks. Có Open PDF nếu inline preview không khả dụng.
- Khi chọn page target, Admin tạo fitted proposal nếu nội dung vượt trang, liệt kê text được rút gọn/trường bị loại. Duyệt Apply trước khi lưu. Wording custom và identity/date/company/title được giữ trong fit; khi không fit được, không hiển thị PDF vượt trang như preview hoàn tất hoặc crop nội dung.
- Public bỏ auto-summary; đọc CV chính thức snapshot v4 có fields/style hiệu lực/page count/revision/hash. Admin Save & download lưu thành công trước khi tải. Preview/download trong mỗi phiên dùng cùng blob.
- Sửa portfolio báo cần rà soát; không tự làm mất bản CV chính thức hoặc rewrite. Draft local không tự che bản chính thức khi mở; có Restore chủ động và Save draft private/device.
- Official read không lẫn pending local write. Official save không queue offline, có expected revision chống stale overwrite. JD và draft AI không vào snapshot public.
- AI CV có review, proposals được duyệt, Undo, cancel/timeout và kiểm tra stale gồm fields/style/JD/session. AI widget được host trong workspace, không dùng config để ghi đè state form nội dung.

## AI/content extension completed

Shared AI provider/model configuration, OpenAI Responses proxy, Claude CLI bridge, custom content blocks, private contexts, writing proposals and icon picker are now integrated. See [implementation and setup](ADMIN_AI_STUDIO_IMPLEMENTATION.md) for current verification, credential requirements and deployment scope.

## Kiểm thử

- Unit: 38 tests gồm dữ liệu/source legacy, snapshot CV v4, hash/diff, persistence, official/pending isolation, media và icons.
- Build assets: Tailwind, pdfmake/fonts và PDF.js module/worker/license được copy vào vendor.
- Browser: regression Add/Edit/Arrange/Delete/Restore, offline/auth, AI proposal, contact mock, CV pagination, media/scroll/icons và workspace/CV suite mới.
- Workspace suite kiểm tra full main pane, 2-page fit, duyệt trước save, private JD, đổi tab giữ draft, local draft không tự override official, offline/concurrent revision rejection, AI stale/Undo, canvas page count và mobile không tràn pane.
- PDF verification kiểm tra A4/font/text/links/không crop. Cặp Admin/public official PDF so sánh từng trang: text order, hyperlink vị trí và raster layout.

Các browser tests dùng mock Firebase/AI trong browser context riêng, không ghi Firestore thật, không gửi email thật và không gọi provider trả phí. CLI chỉ kiểm tra metadata/version/help; không kiểm tra token hoặc inference.

## Cách sử dụng

Đăng nhập Admin → CV Studio → chọn số trang → xem proposal và Apply nếu cần → chỉnh text/AI → Save official CV hoặc Save & download. Trang view tải bản chính thức đó. Save draft giữ bản làm việc và JD riêng; Restore saved draft là thao tác chủ động.

Đối với CV legacy v3 hoặc chưa có official CV, Admin mở candidate để review và lưu snapshot v4. Public không tự tạo một CV độc lập khi chưa có publication. Legacy config vẫn đọc được nhưng nếu vượt page target thì cần Admin review; không tự tóm tắt thành một bản khác.

Latest verification supersedes the metadata-only CLI statement above: Claude 2.1.261 completed a real sonnet JSON smoke inference. Browser Firebase/OpenAI flows still use mocks. No live Firebase write or deployment was performed.
