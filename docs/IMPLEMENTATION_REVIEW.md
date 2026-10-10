# Kết quả triển khai và review lại

CV was subsequently redesigned: see [CV design, synchronization and final verification](CV_DESIGN_REVIEW.md). That document supersedes the CV baseline/snapshot behavior described below.
Ngày: 10/10/2026. Phạm vi: chức năng, giữ nguyên bố cục, màu sắc, animation và nội dung portfolio hiện có.

## Đã triển khai

### Admin và dữ liệu

- Stable ID cho các item, kể cả skills/highlights con; dữ liệu cũ chỉ nhận ID khi được quản trị/lưu, không tự ghi migration vào Firebase thật.
- Add kiểm tra trường bắt buộc, URL, Modal ID trùng; tạo ID khi để trống. Form Add hỗ trợ AI Suggest như Edit.
- Mỗi phiên modal có state riêng; reset display/disabled/loading, ngăn callback cũ tác động phiên mới.
- Edit Content, Delete/Hide/Restore trong Content là draft. Save Changes mới ghi; Cancel/X/Escape có cảnh báo nếu chưa lưu. Undo draft không ghi server.
- Layout chọn nhóm: Core Expertise/Leadership, Jobs/Highlights, Categories/Skills, Degrees/Certificates theo group, Projects, Achievements, Socials.
- Drag/drop hoặc Move Up/Down theo ID, chỉ một mutation đang lưu, rollback nếu lỗi, Undo dùng revision hiện tại. Khi Sortable không tải được, Move Up/Down vẫn dùng được.
- Project Layout dùng Hide/Restore cùng semantics với Content; không hard-delete project.
- Header email/experience/social/avatar/open-to-work/profile details phản ánh dữ liệu chỉnh. Zalo render theo danh sách đã lưu, đúng thứ tự và biến mất khi xóa.
- Firebase transaction ghi nội dung, revision và metadata nguyên tử. Conflict không tự ghi đè. Pending offline overlay không bị bản server cũ thay thế.
- Khi session kết thúc, Admin giữ draft đang mở và khóa Save đến khi đăng nhập lại; CV draft được phục hồi vào bộ nhớ thiết bị. Đã kiểm tra mất session → đăng nhập lại → Save không mất nội dung.
- Lỗi permission/auth/payload không bị báo là offline success; quota localStorage được trả lỗi. Payload section giới hạn 900 KB; upload ảnh kiểm tra MIME/10 MB và lỗi decode. Chưa đổi lưu trữ ảnh sang Firebase Storage để tránh migration ngoài phạm vi.
- Resolve Sync: tải backup, dùng server version hoặc chủ động overwrite bản queued. Các thao tác có xác nhận; không tự xử lý conflict theo hướng mất dữ liệu.
- Public đọc từng document được whitelist, phù hợp Firestore rules (rules không phải bộ lọc query). Cấu hình AI cũ không được nạp vào public cache.

### CV

- Giữ schema section của CV: Header/Summary, Achievements, Quality Highlights, Skills, Experience, Projects, Education, Certifications.
- CV HTML gốc vẫn nguyên vẹn và được dùng làm baseline nội dung ban đầu. Model nối dữ liệu portfolio với baseline cho các item chưa thay đổi; dữ liệu sửa và item mới được phản ánh trong CV.
- Không còn slice giới hạn 5 dự án/chứng nhận; thêm trang khi cần. Item hiện có giữ thứ tự CV ban đầu; item mới được bổ sung.
- Draft có field linked/custom theo key/ID. Save Draft lưu overrides/style trên thiết bị hiện tại; mở lại nạp draft và cập nhật phần linked. Restore/reset có xác nhận.
- PDF engine pdfmake dùng văn bản, nhúng Roboto/Noto Serif Unicode, hyperlinks thật. Đã bỏ export mặc định bằng canvas/JPEG.
- Panel CV trên mobile cuộn được và nút Download vẫn nằm trong viewport; đã kiểm tra ở 390 × 844.
- Preview là PDF thực tế trong iframe, dùng cùng engine và cùng field/style với download; page meter đếm trang trong PDF đã tạo.
- Nhóm đầu mỗi job/project/degree giữ tiêu đề, ngày và phần nội dung đầu cùng nhau; đoạn dài tự ngắt trang, không dùng A4 overflow-hidden để cắt nội dung.
- AI Review nhận đầy đủ fields, không cắt 5000 ký tự. AI Optimize tạo proposal/diff, chỉ áp dụng checkbox đã chọn vào CV draft; không tự ghi nội dung portfolio. Có timeout/error handling và kiểm tra draft đổi trong lúc request.
- Publish CV tạo snapshot public riêng ở `portfolio/cv`. Draft không tự public. Public download dùng cùng PDF engine và snapshot được publish; trước lần publish đầu dùng baseline bundled.
- Font lựa chọn mới là Roboto/Noto Serif nhúng thực tế, thay các tên font hệ thống không bảo đảm có mặt ở trình duyệt/PDF.

### Public và build

- Nút Download CV và Copy email ở footer; không di chuyển section/card.
- Email hero dùng mailto, sticky nav đo chiều cao thực. `overflow-x: clip` sửa scroll container khiến sticky không hoạt động.
- Dialog stack quản lý Escape, Tab/focus return, role/aria và scroll lock. Escape đóng lớp trên cùng; avatar truy cập được bằng bàn phím.
- Giữ animation hiện có, bổ sung reduced-motion/AOS fallback. Cache hiển thị trước, Firebase cập nhật sau; không chặn trang bằng loading toàn màn hình.
- Không render lại nội dung khi không đổi hoặc đang xem public modal.
- Contact có trạng thái aria-live, giữ input khi lỗi, có thể retry và mở chính sách xử lý thông tin liên hệ. Transport không sẵn có được thông báo; không làm toàn bộ page script chết.
- Tailwind CSS được build tĩnh. PDF/font tải local từ vendor khi cần; Sortable và CV admin lazy-load. Giữ CDN Firebase chính thức.
- README cập nhật auth thật, build/test, draft/save/layout và publication.

## Kiểm thử

### Tự động

`npm run build`, `npm test`, `npm run test:browser`, `npm run test:pdf` đều đã qua. Kiểm thử PDF cần PyMuPDF.

9 kiểm thử logic/persistence:

1. ID giữ nguyên sau reorder/edit.
2. Required fields và unique modal ID.
3. Cache server refresh không thay pending; clear queue theo phiên bản.
4. Quota/unavailable không giả làm offline saved.
5. Transaction cập nhật revision/metadata và từ chối stale write.
6. Permission error không vào queue.
7. Offline/reconnect rồi ghi mới không mất mutation.
8. Conflict giữ queued copy đến khi chủ động resolve.
9. Quota trong offline save được trả lỗi.

Hai luồng browser regression trên Edge desktop/mobile, Firebase/AI/EmailJS giả lập:

- Add đủ 7 nhóm, thêm Degree, validation item rỗng và ID trùng.
- Config → Add, Delete → Edit, reorder → hide đúng ID, Undo với revision.
- Edit Header, Cancel draft, xóa Zalo, nhóm layout bổ sung.
- Offline status và permission failure giữ editor/draft.
- CV mapping dữ liệu mới, nhiều hơn 5 certifications, draft reopen, đổi cỡ chữ/font.
- AI nhận toàn bộ CV, apply chọn lọc; portfolio không bị AI ghi lại.
- Publish và public download cùng snapshot.
- Contact failure/retry được stub, không gửi email thật.
- Modal stack, Escape, sticky nav, không tràn ngang 390 px.

### Review PDF và giao diện

- PyMuPDF kiểm tra 3 PDF: mặc định test ở cỡ chữ 12.5 khoảng 4 trang; CV dài với font serif khoảng 6 trang; snapshot public sau apply AI khoảng 5 trang. Đây là dữ liệu test mở rộng, không phải số trang CV cố định của chủ portfolio.
- Các PDF có văn bản trích xuất, Unicode tiếng Việt đúng, font nhúng và link annotations; không còn PDF 0 ký tự như trước.
- Đối chiếu mọi trường của CV dài và public snapshot với text extraction/hyperlinks: không có field bị thiếu. URL được hiển thị gọn nhưng giữ URI đầy đủ trong hyperlink. Cả ba PDF qua kiểm tra không có tiêu đề section đứng một mình ở cuối trang.
- Đã xem ảnh PDF và sửa lỗi orphan job heading trong lần review.
- Đã kiểm tra public bằng Firebase read-only trong browser context mới: nội dung tải được, không có loading overlay chặn trang, không có pageerror, desktop/mobile không tràn ngang, nav mobile sticky top = 0.
- Screenshot hero trước/sau giữ hình thức, nội dung và bố cục. Các phép thử mutation dùng dữ liệu giả lập, không sửa portfolio thật.
- `node --check` các module chỉnh sửa và `git diff --check` không có lỗi cú pháp/whitespace.

## Giới hạn và bước triển khai

- Chưa deploy website hoặc Firestore rules; chưa login/write Firebase production. Cần deploy rules khi phát hành: `firebase deploy --only firestore:rules,firestore:indexes`. Rules mới giữ owner-read/owner-write và whitelist public, gồm `cv`.
- Save Draft hiện lưu trên browser/thiết bị, không cloud-sync draft. Public snapshot chỉ thay khi owner Publish; pending publication chưa public đến khi sync thành công.
- AI và EmailJS đã kiểm tra bằng transport giả lập; chưa gọi dịch vụ trả phí hoặc gửi thư thật.
- Giữ bộ build Tailwind v3 để tránh đổi hình thức CSS. `npm audit` còn 5 advisory high bắc cầu qua braces/chokidar/micromatch trong dependency build/dev; không có runtime Tailwind JS trên trang. Chưa ép nâng Tailwind v4 vì đó là migration có thể làm đổi giao diện. Các package có patch tương thích đã cập nhật, selector parser đã override bản vá.
- Không tự migrate ảnh đã có sang Firebase Storage, không sửa wording/số liệu/chứng nhận của chủ portfolio.
- Native PDF preview phụ thuộc PDF viewer của trình duyệt; nếu không hiển thị được iframe, Download PDF vẫn dùng cùng dữ liệu/engine.

Không phát hiện lại các lỗi P0 reorder-delete, canvas PDF hoặc overflow clipping trong các luồng đã kiểm thử sau sửa. Kết quả này là xác nhận triển khai local; không phải xác nhận quyền và cấu hình production đã được deploy.
