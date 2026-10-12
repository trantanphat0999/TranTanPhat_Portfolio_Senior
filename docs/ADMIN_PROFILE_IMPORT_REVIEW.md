# Admin UX, CV import và thư viện portfolio

Ngày review: 12/10/2026. Phạm vi: checkout hiện tại, chưa deploy hoặc sửa dữ liệu production.

## Phân tích chức năng và thao tác

| Chức năng | Vấn đề / yêu cầu | Thiết kế và xử lý đã triển khai |
| --- | --- | --- |
| Overview | Điểm bắt đầu thiên về xuất CV; chưa có luồng nhập và quản lý nhiều portfolio | CTA nhập CV mới; thêm Import CV và Portfolio library vào điều hướng chính, giữ các chỉ báo kết nối/CV/AI |
| Content: thông tin cá nhân | Form modal hẹp, nhiều trường, lỗi chỉ xuất hiện trong toast | Editor toàn màn hình, tìm trường theo nhãn/nội dung, chọn trường để nhảy đến, focus vào trường lỗi; kiểm tra tên, chức danh và email |
| Content: summary | Các nhóm expertise và leadership dễ bị bỏ sót khi cuộn | Dùng cùng editor fullscreen và công cụ tìm/nhảy; giữ add/edit/delete, Undo và AI writer có review |
| Content: experience | Nhiều công việc và highlights khiến form dài | Toàn bộ chiều cao màn hình dành cho vùng chỉnh sửa; header/footer cố định, nút lưu luôn truy cập được; giữ kiểm tra trường bắt buộc |
| Content: skills | Nested categories/skills và nhiều icon | Tìm theo nội dung từng trường; nhãn liên kết input cho bàn phím; giữ icon registry và AI suggestions có sẵn |
| Content: projects | Cần chỉnh ảnh, chi tiết, tags, thứ tự và ẩn/khôi phục | Các thao tác hiện có tiếp tục dùng editor fullscreen; giữ stable ID, kiểm tra modal ID trùng; hình mới theo ngành không thay ảnh đã upload |
| Content: achievements | Không được suy đoán thành tích hoặc số liệu khi optimize | Nhập nguyên bản dùng excerpt; optimize chỉ đề xuất mô tả theo nguồn; hiển thị cảnh báo và bắt buộc admin review |
| Content: education/certifications | Course completion và certification dễ bị AI đánh đồng | Giữ tên trường, bằng cấp, đơn vị cấp và thời gian theo nguồn; prompt cấm nâng cấp khóa học thành chứng chỉ chính thức |
| Content: contact | Khi chuyển profile, link cũ có thể còn trên hero | Xóa href và ẩn link không có ở profile mới; phục hồi khi chọn profile có link; cập nhật footer và profile modal |
| Custom blocks | Nội dung không thuộc schema chuẩn dễ bị mất khi mapping CV | Original tự giữ các dòng chưa được phân loại trong block “Nội dung CV bổ sung”, có mặt trong bước review và trên portfolio khi kích hoạt |
| Facts & evidence | Dữ liệu xác minh nghề nghiệp thuộc luồng riêng | Giữ thư viện riêng tư và trạng thái xác minh; nhập CV không tự cấp trạng thái verified |
| CV Studio | Các thao tác Content/Layout/AI/Review đã có preview và page fitting | Giữ workspace fullscreen và publish có review; CV chính thức được quản lý riêng, không bị profile switch ghi đè |
| AI Assistant | Thiếu task import portfolio và khả năng phân loại lĩnh vực | Thêm structured task `portfolio-import` qua OpenAI/Claude CLI/Custom; có cancel, kiểm tra provider/context thay đổi và schema validation |
| Settings/providers | Admin cần thiết lập AI trước khi phân tích | Import có nút đi thẳng tới Settings; dùng provider đã test và backend được bảo vệ hiện tại; không thêm credential vào public content |
| Sync/offline | Switching từng section riêng có nguy cơ thay một nửa; pending edits có thể bị đè | Switch dùng transaction; kiểm tra revision hiện tại và queue trước khi ghi; quản lý cloud profile cần online; nháp import lưu IndexedDB trên thiết bị |
| Backup/export | Một bộ dữ liệu đang dùng chưa đủ để chuyển lại profile cũ | Thư viện có snapshot, tìm kiếm, review, đổi tên, tải JSON và nguồn CV; mỗi switch tự lưu bản sao đầy đủ trước khi thay |
| Delete | Dễ xóa nhầm profile hoặc ảnh đang được dùng | Nhập chính xác tên để xóa; cấm xóa profile đang dùng; không tự xóa media dùng chung; không tự dọn các backup |
| Fullscreen/mobile | Form nhỏ và khó truy cập nút dưới cùng | Browser fullscreen toggle; editor cao `100dvh`; action bar cố định/sticky; grid tự chuyển một cột, nav có cuộn ngang |

Không có skill tên `design` được cài trong session. Áp dụng hướng dẫn Design của skill `sites` cho repository local: ưu tiên tác vụ chính, giữ branding, responsive, dễ đọc và thao tác bằng bàn phím. Không đăng ký website hoặc đưa checkout lên hosting khác.

## Luồng sử dụng

1. Chạy `npm run admin:local`, đăng nhập admin và test provider tại Settings nếu cần dùng AI.
2. Vào **Import CV**, chọn PDF/DOCX/MD hoặc dán văn bản CV.
3. Kiểm tra văn bản trích xuất, chọn **nguyên bản** hoặc **optimize**, đặt tên profile và bấm **Phân tích CV**.
4. Review từng section, sửa nếu cần, đọc cảnh báo và các trường có nhãn AI đề xuất. Original giữ cả những dòng AI chưa phân loại trong block bổ sung.
5. Xác nhận đã review, **Lưu vào thư viện profile**. Bước này chưa thay portfolio đang hiển thị.
6. Vào **Portfolio library**, chọn profile, review lại, xác nhận và **Kích hoạt profile**.
7. Muốn trở lại dữ liệu trước: chọn profile cũ hoặc bản lưu tự động, review và kích hoạt. Các chỉnh sửa của profile đang dùng cũng được cập nhật vào profile theo tên trước khi chuyển sang profile khác.

## Nguyên bản và optimize

**Nguyên bản** bảo toàn dữ liệu văn bản, không bảo toàn cách dàn trang của Word/PDF. Code kiểm tra các giá trị nội dung là excerpt của nguồn, cho phép chuẩn hóa Unicode và whitespace do bộ trích xuất. Mọi nội dung nguồn được lưu riêng trong manifest; những dòng chưa mapping được giữ thêm trong block bổ sung. Nhãn giao diện, ID và icon không phải dữ kiện CV.

**Optimize** cho phép viết lại mô tả, tổng hợp summary/expertise và điền trường mô tả từ bằng chứng có sẵn. Tên người, thông tin liên hệ, công ty, vai trò, mốc thời gian, tên kỹ năng, trường/bằng cấp/chứng chỉ vẫn phải trích từ nguồn. AI trả danh sách trường thay đổi để review. Dữ kiện không có bằng chứng để trống hoặc nêu thành câu hỏi/cảnh báo; không tự bịa thành tích để lấp tất cả trường.

## Lưu trữ và bảo toàn dữ liệu

| Đường dẫn | Nội dung |
| --- | --- |
| `admin/profile-library` | Index profile, active ID và revision |
| `admin/profile-{uuid}` | Tên, ngày tạo, nguồn CV, chế độ import, phân tích AI |
| `admin/profile-{uuid}-{section}` | Mỗi section lưu riêng, gồm ảnh/URL ảnh và metadata |
| `admin/profile-{uuid}-cv` | Bản chụp CV hiện tại nếu profile/snapshot có CV |
| IndexedDB `portfolio-import-drafts` | Nháp import theo owner email, chỉ trên thiết bị hiện tại |
| `portfolio/*` | Bộ section đang hiển thị, chỉ đổi sau khi kích hoạt |

Transaction đọc index, target và toàn bộ dữ liệu hiện tại trước khi ghi. Nó kiểm tra revision từ lúc review, lưu backup các section và CV, cập nhật profile đang rời đi, rồi thay section và active ID cùng lúc. Lỗi mạng, dung lượng hoặc conflict làm giao dịch thất bại; public data không bị thay một phần. Cơ chế dựa trên [transaction của Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions).

Snapshot chứa nguyên dữ liệu section và media tham chiếu. Ảnh local, URL và base64 trong dữ liệu đều được giữ; thao tác xóa profile không xóa file ảnh dùng chung. Không có auto eviction: quá 2.000 profile hoặc document vượt 900 KB sẽ báo lỗi, không xóa profile cũ để nhường chỗ. File gốc PDF/DOCX không lưu binary trên cloud; lưu toàn bộ văn bản trích xuất, tên file, loại, kích thước và SHA-256. Bản layout/ảnh nhúng riêng của CV đầu vào chưa được import như media portfolio.

Official CV có frozen release/PDF artifact riêng. Switch profile không ghi đè pointer đó; muốn đổi CV khách tải xuống phải review và publish tại CV Studio. Backup giữ snapshot CV để tra cứu, còn exact-byte rollback tiếp tục dùng release history hiện tại.

## Hình ảnh theo ngành nghề

AI phân loại CV thành technology/design/business/health/education/general. Hình minh họa SVG và icon được sinh từ bộ motif theo theme đã kiểm tra, dùng cho hero khi chưa có portrait và project khi chưa có ảnh. Ảnh/brand có sẵn được giữ. Nhãn QA cố định, falling text, footer, link mạng xã hội và profile modal được điều chỉnh khi chuyển sang CV của lĩnh vực khác.

Không thực thi SVG/HTML do model trả về và không gọi AI mỗi lần khách mở portfolio. Kết quả phân tích/theme đã lưu được render lại khi load profile. Đây là minh họa vector theo phân tích AI, chưa phải sinh ảnh raster bằng image model.

## Giới hạn và validation

- File tối đa 10 MB, PDF 40 trang, văn bản 60.000 ký tự; không cắt ngầm nội dung quá giới hạn.
- PDF scan chưa có text phải OCR trước; PDF nhiều cột có thể sai thứ tự, nên bước kiểm tra nguồn luôn được giữ.
- DOCX chỉ trích text bằng [Mammoth](https://github.com/mwilliamson/mammoth.js#extracting-raw-text), chạy trong worker có timeout/cancel; giới hạn ZIP entry và dung lượng giải nén để không chặn UI.
- Markdown phải UTF-8. Không render HTML từ CV vào admin hoặc public page.
- Provider không hỗ trợ đủ output/context hoặc trả JSON sai sẽ báo lỗi, không tự lưu/publish dữ liệu thiếu.
- Lưu nháp là thao tác chủ động; chuyển tab giữ in-memory review. Reload cần nháp đã lưu, và bản khôi phục luôn yêu cầu review lại.
- Private library nằm dưới rule owner-only `admin/*` hiện có. Không thay Firestore/Storage rules trong thay đổi này.

## Review và kiểm thử

Các lỗi tìm thấy và sửa trong review:

- Renderer cũ tự thay số năm kinh nghiệm: profile kích hoạt giữ đúng giá trị lưu.
- Link hero và thông tin cá nhân/footers có thể còn dữ liệu của profile trước: clear/update khi switch, phục hồi khi quay lại.
- Chỉnh sửa profile đang dùng có thể chỉ nằm trong backup mới: cập nhật cả profile theo tên trước khi switch.
- Nút có điều kiện có thể được bật lại khi request kết thúc: khôi phục guard cho review, active profile và delete.
- DOCX parsing trên main thread: chuyển sang worker có giới hạn và hủy thực sự.
- Custom blocks đang mở vẫn giữ revision của profile trước: chặn publish và yêu cầu reload sau khi switch; giữ các draft đã lưu.
- Hai assertion browser cũ không theo seed hiện tại: sửa kỳ vọng artwork của hai QA case study và hai mục Jira, giữ kiểm tra tải ảnh/icon và media modal.

Kiểm thử tự động dùng Firebase và provider giả lập để kiểm soát conflict/failure/privacy; parser chạy thật với byte PDF/DOCX/MD. Không gửi CV thật đến provider trả phí hoặc kích hoạt dữ liệu trên Firebase production.

Commands:

```bash
npm run build
npm test
npm run test:profiles
npm run test:browser
```

Build và 73 unit test đã pass. Kiểm thử import riêng đã pass với file thật của cả ba định dạng, nguyên bản/optimize, browser fullscreen, mobile, nháp, restore ảnh, conflict và failed commit. Toàn bộ `npm run test:browser` đã pass, gồm workspace, CV, providers, icon, media, motion và frozen release. `git diff --check` không có lỗi whitespace.

Screenshot và log review ở `test-results/`: `import-cv-desktop.png`, `import-cv-mobile.png`, `profile-library-mobile.png`, `unit-profile-review.log`.

Firebase emulator rules chưa chạy lại: Java mặc định trong môi trường là 20; emulator workflow của repository cần Java 21 trở lên. Production rules, AI credentials và khả năng của model được chọn vẫn cần kiểm tra trong môi trường vận hành thật.
