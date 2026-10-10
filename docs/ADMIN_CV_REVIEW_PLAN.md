# Review chức năng Portfolio, Admin Mode và CV

Ngày review ban đầu: 10/10/2026, múi giờ Asia/Saigon.

**Đã triển khai:** xem [IMPLEMENTATION_REVIEW.md](IMPLEMENTATION_REVIEW.md) để biết thay đổi và kết quả kiểm thử sau triển khai. Các phát hiện bên dưới giữ lại làm hồ sơ lỗi ban đầu.

## Phạm vi đã chốt

- Giữ nguyên thứ tự section, bố cục, màu sắc và nội dung hiện có của portfolio.
- Chỉ sửa lỗi, hoàn thiện chức năng và bổ sung chức năng liên quan.
- Edit Layout là thao tác do chủ portfolio chủ động thực hiện trong Admin; không tự sắp xếp dữ liệu hiện tại.
- Không tự rút gọn, viết lại hoặc loại bỏ nội dung CV. Nếu nội dung dài, phân trang để giữ đủ nội dung.
- Đây là bản review và kế hoạch; chưa triển khai sửa mã sản phẩm.

## Phương pháp và giới hạn

- Đọc luồng Admin, public renderer, Firebase, local cache, CV preview và PDF export.
- Kiểm tra bằng Edge headless trên localhost, dùng module Firebase giả lập qua Playwright route trong browser context riêng.
- Dữ liệu test khởi tạo từ bundled seed; mọi thay đổi Add/Edit/Delete/Reorder chỉ nằm trong bộ nhớ của trang test.
- Không đăng nhập Firebase thật, không ghi/xóa/reorder dữ liệu thật, không gửi email reset password, không gọi AI trả phí.
- Đã thử Add cho 7 section, Edit Header, Delete item con và Zalo, Reorder rồi Delete, trạng thái modal sau Config/Delete, CV preview/edit/reopen/export.
- Đã xuất PDF và đọc bằng PyMuPDF: 2 trang, 0 ký tự văn bản trích xuất được ở mỗi trang, 0 liên kết ở mỗi trang, khoảng 1,50 MB.
- Kết luận về AI, auth, lỗi mạng và xung đột ghi là review mã nguồn, trừ những trường hợp ghi rõ đã mô phỏng/tái hiện.
- Không có lỗi JavaScript chưa xử lý trong hai lượt kiểm tra Admin giả lập đã hoàn thành. Điều này không loại trừ lỗi nghiệp vụ.

## Kết luận

Admin đã có các chức năng cơ bản nhưng chưa đáng tin cậy cho thao tác liên tiếp, đặc biệt Reorder rồi Delete. CV có khung nội dung tốt nhưng chưa hoàn thiện về đồng bộ dữ liệu, giữ bản chỉnh sửa, phân trang và PDF có văn bản.

### A. Add New

| ID | Ưu tiên | Phát hiện | Bằng chứng / ảnh hưởng |
|---|---|---|---|
| A01 | P1 | Summary và Certification có thể được thêm dù title rỗng | Đã tái hiện. `saveNewItem()` chỉ kiểm tra `[data-new]` đầu tiên; ở hai form này đó là select Type có giá trị sẵn. |
| A02 | P1 | Modal ID của project không được kiểm tra trùng, định dạng hoặc tự tạo ổn định | Đã thêm project mới có `modalId: project2` trùng seed. Nút chi tiết dùng `getElementById`, dẫn đến nguy cơ mở nhầm modal. |
| A03 | P1 | AI Suggest trong Add New không có handler | Đã click trong Add Summary; không xuất hiện AI suggestion modal. Event delegation cho AI chỉ được gắn trong Edit Content. |
| A04 | P1 | Config rồi Add New làm nút Add bị ẩn | Đã tái hiện `style.display = none`; `openAddNewModal()` không reset display sau Config. |
| A05 | P1 | Add báo thành công ngay cả khi trạng thái write là chưa đồng bộ | Đã mô phỏng disconnected; toast vẫn là “New item added successfully!”. Hàm bỏ qua kết quả `{synced}`. |
| A06 | P2 | Validation còn quá ít | Add Experience chỉ nhập company vẫn lưu role/period rỗng; Add Contact lưu URL rỗng. Chưa có schema chung cho required fields, URL, kiểu dữ liệu. |
| A07 | P2 | Ảnh base64 nằm trong document section | Review mã. Nhiều ảnh sẽ tăng kích thước document/localStorage; chưa có kiểm tra kích thước tổng payload hoặc báo lỗi lưu đầy đủ. |

Nguồn: `js/admin/app.js:761`, `:913`, `:707`.

### B. Edit Content

| ID | Ưu tiên | Phát hiện | Bằng chứng / ảnh hưởng |
|---|---|---|---|
| E01 | P1 | Lưu Experience trong Header không thay đổi giá trị hiển thị | Đã lưu `9+ Years...`; dữ liệu test đổi nhưng public vẫn `4+ Years...`, do renderer dùng công thức riêng. |
| E02 | P1 | Email trong hero không đồng bộ với email đã chỉnh | Đã lưu `changed@example.test`; hero vẫn email cũ. Các social link trong hero cũng thiếu anchor dữ liệu tương ứng. |
| E03 | P1 | Modal dùng lại state cũ của nút Save | Sau Delete Layout, mở Edit Skills thấy `disabled = true`. |
| E04 | P1 | Delete tự lưu cả thay đổi chưa bấm Save | Đã sửa description rồi xóa một highlight: description cũng được ghi ngay. Cần tách thao tác delete khỏi draft hoặc công bố rõ phạm vi commit. |
| E05 | P2 | Đóng bằng Cancel/X/Escape không cảnh báo draft chưa lưu | Review mã `closeEditModal()` xóa `currentData` ngay. |
| E06 | P1 | Các tác vụ async dùng chung `currentSection/currentData` | Review mã. Đóng/mở modal khác trong lúc đọc/ghi có nguy cơ kết quả cũ cập nhật phiên mới hoặc dùng section không còn đúng. |
| E07 | P2 | Một số dữ liệu nằm ngoài Admin | Profile popup hardcode tên, thông tin cá nhân; availability/open-to-work/avatar có các nguồn dữ liệu khác nhau. Cần mapping thống nhất, giữ nguyên giá trị hiện có. |

Nguồn: `js/admin/app.js:595`, `:679`, `:1708`; `js/loader/app.js:268`; `js/page/profile-modal.js`.

### C. Delete / Hide / Restore

| ID | Ưu tiên | Phát hiện | Bằng chứng / ảnh hưởng |
|---|---|---|---|
| D01 | P0 | Reorder rồi Delete xóa nhầm item | Đã đổi `[Communication Hub, CRM]` thành `[CRM, Communication Hub]`. Nút Delete của CRM vẫn giữ index 1; click CRM xóa Communication Hub. |
| D02 | P0 | Delete project trong Layout xóa khỏi array, còn Edit Content chỉ hide | Đã tái hiện hard-delete trong dữ liệu test. Hai màn hình có semantics khác nhau; Layout không có đường Restore cho item đã splice. |
| D03 | P1 | Delete Layout thành công để Save bị disabled | Đã tái hiện, trạng thái đi theo modal sang Edit khác. |
| D04 | P1 | Xóa Zalo khỏi dữ liệu nhưng nút vẫn xuất hiện | Đã tái hiện `stored: false`, `rendered: true`; renderer giữ nút Zalo cũ vô điều kiện. |
| D05 | P2 | Không có Undo/trash cho những nhóm hard-delete | Review mã. Cần phục hồi theo thao tác đã xác nhận, tránh mất nội dung khi quản trị. |

Nguồn: `js/admin/app.js:989`, `:1141`, `:1221`; `js/loader/app.js:817`.

### D. Edit Layout

Edit Layout hiện chỉ reorder item trong một nhóm, không phải công cụ đổi vị trí section toàn trang. Đây là phạm vi phù hợp với yêu cầu giữ bố cục.

- Summary chỉ reorder `coreExpertise`, thiếu `leadership`.
- Education chỉ reorder certifications, thiếu degrees.
- Skills chỉ reorder categories, chưa reorder skill trong category.
- Experience chưa reorder highlights trong job.
- Certifications ngoài trang được gom theo group cố định; thứ tự kéo giữa các group không được phản ánh nguyên trạng.
- Zalo bị giữ ở cuối nhóm social, nên thứ tự lưu không hoàn toàn là thứ tự hiển thị.
- Reorder lưu tự động; kéo nhiều lần liên tiếp có thể có các write chồng nhau. Cần queue và snapshot theo phiên.
- Các nhãn badge trong Layout chưa escape như title. Cần đồng nhất escaping.

Hướng hoàn thiện: dùng stable item ID, reorder theo ID, rebuild index/DOM sau commit, chọn đúng nhóm cần reorder, move up/down bằng bàn phím và giữ nguyên thứ tự ban đầu cho đến khi người dùng thao tác.

### E. Lưu dữ liệu / Offline / Auth

Review mã tại `js/firebase-config.js:158`, `js/admin/app.js:66`, `js/local-portfolio-cache.js:30`:

- Write helper coi mọi lỗi write là mất kết nối, kể cả permission-denied, lỗi validation, quá kích thước document.
- Lỗi bị nuốt và chuyển sang queue; caller có thể báo thành công dù backend từ chối.
- localStorage lỗi quota chỉ log, không trả lỗi; giao diện có thể thông báo saved locally khi chưa có lưu trữ bền vững.
- Firestore save là overwrite toàn bộ document section, không có revision/transaction chống hai tab ghi đè.
- Metadata và nội dung được ghi riêng; lỗi metadata sau khi ghi nội dung có thể làm trạng thái bị diễn giải sai.
- Queue offline cần bảo vệ phiên bản, không để refresh online thay cache mới bằng snapshot server cũ khi pending chưa sync.
- Cần phân biệt rõ `synced`, `pending`, `rejected`, `conflict`, `storage-error`; Save/Add/Delete/Reorder dùng cùng kết quả.
- Login hiện báo “Incorrect password” cho mọi exception, kể cả lỗi mạng; cần thông báo theo nguyên nhân và xử lý session hết hạn.
- Auth/rules có trong mã nhưng chưa kiểm thử ghi thật hoặc xác minh rules đã deploy trong lần review này.

### F. Cấu trúc CV và Export

Khung hiện tại có đầy đủ các nhóm chính: contact, summary, achievements, quality highlights, skills, experience, projects, education, certifications. Có preview A4, chỉnh font/cỡ chữ/line height và sửa chữ trực tiếp. Có thể giữ cấu trúc và thiết kế này.

| ID | Ưu tiên | Phát hiện | Bằng chứng / ảnh hưởng |
|---|---|---|---|
| C01 | P0 | PDF mặc định là ảnh, không có lớp văn bản | Đã xuất/đọc: 2 trang, text extraction = `[0,0]`, links = `[0,0]`. Đọc tự động phụ thuộc OCR; không nên gọi mặc định là PDF đã tối ưu ATS. |
| C02 | P0 | CV không dùng nhiều dữ liệu đã chỉnh trong Admin | Đã thay Summary, job description, Skills, thêm Project bằng sentinel; cả 4 không xuất hiện trong preview. Model hardcode summary/skills/achievements/projects/job bullets. |
| C03 | P0 | Đếm trang không thực sự phân trang | Đã tăng font lên 12.5: meter báo 3 trang, DOM chỉ có 2; trang đầu scrollHeight 1215 > clientHeight 1123. CSS A4 cố định + overflow hidden, nội dung dài có nguy cơ bị cắt. |
| C04 | P1 | Chỉnh tay bị mất khi đóng/mở CV | Đã sửa summary; mở lại không còn thay đổi. Chưa có Save Draft hoặc cảnh báo. |
| C05 | P1 | AI Optimize không đưa kết quả vào các trường model đang dùng | Review mã: đổi `d.summary.overview` và `job.description`, nhưng model dựng summary/job bullets từ nội dung cố định. Render lại còn làm mất edit trực tiếp trước đó. |
| C06 | P1 | CV giới hạn 5 chứng nhận và 5 dự án | Review mã. Giới hạn số lượng/sắp theo ưu tiên ngầm không phù hợp yêu cầu không bỏ nội dung. |
| C07 | P1 | Hai nguồn CV độc lập | Public export đọc `cv/CV_TranTanPhat_SeniorQA.html`; Admin dùng generator riêng. Dữ liệu chỉnh Admin không tự cập nhật CV public. |
| C08 | P2 | AI Review chỉ lấy 5000 ký tự đầu | Phần sau CV có thể không được review; điểm AI không phải kết quả kiểm tra PDF/ATS thực tế. |
| C09 | P2 | Fallback có thể mất date/font | Parser ưu tiên project company thay vì ghép company + date; text-PDF hardcode Helvetica dù preview chọn font khác. |
| C10 | P1 | Hyperlink không được giữ trong PDF mặc định | Đã kiểm tra 0 links. Contact trong preview Admin hiện tạo span thay vì anchor. |

Nguồn: `js/admin/cv-export.js:177`, `:216`, `:337`, `:565`, `:640`, `:731`, `:1029`, `:1074`; `js/page/cv-pdf.js`.

## Kế hoạch triển khai mới

### Giai đoạn 1 — An toàn dữ liệu và trạng thái Admin (P0/P1)

1. Tạo schema/item ID ổn định cho các array; bổ sung ID cho dữ liệu cũ nhưng giữ nguyên nội dung, thứ tự.
2. Tách modal session và draft state, reset display/disabled/loading/listeners mỗi lần mở; chặn callback cũ tác động phiên mới.
3. Sửa reorder-delete theo stable ID; serialize mutation, rollback UI nếu write bị từ chối.
4. Đồng nhất Hide/Restore project giữa Content/Layout. Không mặc định hard-delete; thêm Undo/trash nếu cần xóa thật.
5. Chuẩn hóa kết quả persistence, phân biệt offline với lỗi quyền/quota/conflict; báo đúng trạng thái ở mọi thao tác.
6. Bổ sung revision/atomic write và xử lý pending queue không ghi đè bản mới.

Nghiệm thu: reorder rồi delete đúng ID; Config → Add có nút hoạt động; Delete → Edit có Save hoạt động; pending không được thông báo synced; lỗi quota/permission không giả làm offline success.

### Giai đoạn 2 — Hoàn thiện Add/Edit/Delete/Layout (P1/P2)

1. Validation theo section, kiểm tra required fields và URL, tự tạo unique modal ID.
2. Dùng event delegation chung cho Add/Edit và AI Suggest; bổ sung trạng thái empty/error/loading.
3. Sửa mapping Header/email/social/profile/status. Giữ nguyên nội dung ban đầu; bảo đảm thay đổi qua Admin được render đúng.
4. Thêm dirty-state, Save/Cancel rõ ràng; Delete không tự commit các draft khác ngoài ý muốn.
5. Hoàn thiện reorder cho Leadership, Degrees, Skills con, Highlights con; hỗ trợ Move Up/Down.
6. Đồng nhất thứ tự dữ liệu với renderer trong phạm vi nhóm; không tự thay group hay thứ tự mặc định.
7. Xử lý upload lỗi và giới hạn payload. Cân nhắc lưu ảnh qua Storage để document giữ URL, có migration bảo toàn ảnh cũ.

Nghiệm thu: Add/Edit round-trip đủ field cho 7 nhóm; không lưu item rỗng/ID trùng; Hide/Restore không mất field; cancel không ghi; Zalo render đúng dữ liệu; item/group reorder đúng trên public.

### Giai đoạn 3 — CV dữ liệu, bản nháp và AI (P0/P1)

1. Tạo CV model có cấu trúc dùng chung cho preview/export/public CV, có liên kết theo item ID với portfolio.
2. Chuyển nội dung CV hiện tại vào draft/schema, bảo toàn wording; có trạng thái field linked/custom để tránh ghi đè bản chỉnh riêng.
3. Bỏ giới hạn ngầm 5 item. Giữ đủ nội dung; lựa chọn loại trừ nếu sau này bổ sung phải là thao tác rõ ràng của chủ portfolio.
4. Save Draft, Restore Draft, Reset có xác nhận; font/cỡ chữ/line height được lưu cùng draft.
5. AI Review đọc đầy đủ draft theo section; AI Optimize tạo proposal/diff, chỉ apply field đã chọn, không tự viết vào portfolio hoặc mất chỉnh tay.
6. Giữ cấu trúc section/thiết kế CV hiện tại; khi nội dung dài thì thêm trang tự động.

Nghiệm thu: thêm/sửa project/skill/job đi vào CV theo mapping; nội dung custom được giữ; reopen còn draft; AI proposal áp dụng đúng field; không có nội dung tự mất vì slice/limit.

### Giai đoạn 4 — PDF và phân trang (P0/P1)

1. PDF mặc định có text thật, nhúng font Unicode, contact/certificate links có thể click.
2. Phân trang thực tế theo block; tránh tách heading khỏi nội dung, không cắt text ở cuối trang.
3. Meter lấy số trang đã phân trang; preview và PDF khớp dữ liệu, font, dates và số trang.
4. Chặn export nếu còn overflow không xử lý; lỗi phải rõ, không báo thành công giả.
5. Dùng chung CV published artifact cho public download và Admin; bản draft không tự trở thành bản public.

Nghiệm thu: PDF text extraction có tên/email/tất cả nội dung đã chọn; Unicode đúng; hyperlinks có link annotations; thêm nhiều jobs/projects/certs vẫn giữ đủ nội dung; preview pages = PDF pages; export không hiện wrapper làm xê dịch trang.

### Giai đoạn 5 — Chức năng public và kiểm tra hồi quy

1. Khôi phục đường tải CV tại vị trí hiện hữu phù hợp, không di chuyển các section/card; sửa mailto/copy email.
2. Sửa sticky nav và offset đo theo chiều cao thực; giữ vị trí navbar hiện tại.
3. Modal stack, Escape chỉ đóng lớp trên, focus trap/focus return, scroll lock theo stack.
4. Giữ nguyên animation, bổ sung reduced-motion và fallback khi thư viện CDN lỗi.
5. Contact error/retry/state, privacy-policy link phù hợp, không thay nội dung giới thiệu.
6. Lazy-load thư viện dùng riêng Admin/PDF; build CSS production, giữ nguyên hình thức giao diện.

## Ma trận kiểm thử khi triển khai

- Browser tự động: Add/Edit/Delete/Restore từng nhóm; item con; Reorder → Delete; Config → Add → Edit; Cancel/Escape và draft.
- Persistence giả lập/emulator: online/offline/reconnect; auth expired; permission denied; document quá lớn; localStorage quota; write đồng thời; hai tab; conflict và rollback.
- CV: đầy đủ field từ source/draft; reopen; font limits; nội dung rất dài; Unicode; PDF text extraction/link/page count; AI response lỗi/timeout và apply chọn lọc.
- Public: mobile/desktop, modal chồng nhau, download CV, email, nav, refresh không làm đóng modal.
- Dữ liệu thật: read-only trước; xác minh rules; smoke test mutation trong môi trường test. Không dùng bộ kiểm thử destructive trên Firebase production.
- Regression hình ảnh: đối chiếu screenshot trước/sau để bảo đảm không thay bố cục hoặc bỏ nội dung hiện có.

## Thứ tự thực hiện

Giai đoạn 1 → 2 → 3 → 4 → 5. Đưa test tái hiện P0 vào trước mỗi sửa tương ứng, rồi mở rộng kiểm thử theo hành vi đã thay đổi. Không cần viết lại toàn bộ project hoặc chuyển framework để hoàn thành kế hoạch.
