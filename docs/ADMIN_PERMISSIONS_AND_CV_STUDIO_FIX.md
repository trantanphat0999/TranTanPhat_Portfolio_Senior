# Sửa quyền Admin và giao diện CV Studio

Ngày kiểm tra: 11/10/2026. Project: `portfolio-project-9770e`.

## Nguyên nhân và sửa production

Rules Firestore thực tế trước khi sửa chỉ có `match /portfolio/{document=**}` với `allow read, write: if true`. Collection `admin` không có rule nên các request tới career-data, cv-draft, variants và AI settings bị từ chối. CV Studio đọc career-data trước khi tạo preview và coi lỗi này là fatal, dẫn đến màn hình “Missing or insufficient permissions.”.

Đã deploy `firestore.rules` trong repo lên đúng project bằng account owner. Rules mới cho public đọc các document portfolio được liệt kê, chỉ owner ghi, và chỉ owner đọc/ghi dữ liệu private. Đã kiểm tra lại release rules đang active; REST anonymous đọc header trả 200, đọc career-data/ai-config trả 403. Không sửa hoặc publish nội dung CV trong thao tác này.

Trong code, request private thất bại không còn làm mất preview. Banner nêu dịch vụ nào đang bị ảnh hưởng và có Retry connection. Khi career facts chưa đọc được, publish bị khóa để tránh xuất bản dựa trên dữ liệu không kiểm chứng. Retry thành công khôi phục quyền sử dụng; draft hiện tại được giữ. Lỗi publish giữ nguyên official CV và có thông báo riêng.

## Giao diện mới

- **1 Content:** chọn field và chỉnh wording trong tài liệu.
- **2 Layout:** preset, số trang, font, body size, line height và margins. Spacing, alignment, date placement, contact labels và ordering nằm trong Advanced layout.
- **3 AI assist:** JD, review, optimize và plan content/layout, cùng preview thay đổi để owner duyệt.
- **4 Review:** document checks, private versions và published versions/rollback. Các phần ít dùng được thu gọn.

Số trang và trạng thái PDF luôn có trên toolbar. Save draft/Restore draft được giữ để phục hồi công việc. Footer giữ các nút publish/download. Input số, text, search, select và textarea dùng nền tối, góc 12px, focus rõ; editor dùng ô sáng có góc bo. Mobile đưa tools lên trước preview và không tràn ngang.

## Storage chưa được khởi tạo

Đã kiểm tra Cloud Storage của project: chưa có bucket. Bucket đang ghi trong config là `portfolio-project-9770e.firebasestorage.app` và trả 404; đó là tên dự kiến, không phải tài nguyên đã tồn tại. Owner cũng xác nhận chưa có bucket. Preview, chỉnh sửa và private drafts dùng Firestore; phát hành **PDF official bất biến mới** cần Storage.

Upload giờ kiểm tra quyền list/bucket trước khi ghi, và báo rõ lỗi bucket/rules. Storage rules cũng cho owner kiểm tra metadata của file chưa tồn tại: SDK nhận đúng `object-not-found` rồi mới create. Public vẫn chỉ đọc file đã được đánh dấu public; không được list, overwrite hoặc delete.

Để kích hoạt lưu PDF:

1. Mở [Storage của project](https://console.firebase.google.com/project/portfolio-project-9770e/storage), chọn Get started và tạo default bucket. Theo [yêu cầu Firebase hiện hành](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024), Cloud Storage cần gói Blaze gắn Cloud Billing. Owner cần chọn tài khoản billing và location trong console; có thể đặt budget alert ở bước này. Session sửa lỗi này không thay đổi billing hoặc tạo tài nguyên tính phí.
2. Kiểm tra tên bucket thực tế trong Console, rồi đối chiếu `storageBucket` ở `js/firebase-config.js`. Nếu default bucket đúng tên dự kiến, giữ config hiện tại.
3. Deploy rules đã kiểm thử:

   ```powershell
   firebase deploy --only storage --project portfolio-project-9770e
   ```

4. Chép `storage.cors.example.json`, thay domain placeholder bằng domain portfolio thật. Với file đã chỉnh:

   ```powershell
   gcloud storage buckets update gs://portfolio-project-9770e.firebasestorage.app --cors-file=storage.cors.json
   ```

5. Reload Admin, review CV rồi Save official CV. Kiểm tra tải public và hash/rollback. Hướng dẫn SDK/bucket: [Firebase Storage web setup](https://firebase.google.com/docs/storage/web/start).

## Verification

Kết quả cuối: 62 unit/integration tests, đủ 11 browser suites, Firebase Emulator, PDF checks và asset build đều pass. Firestore production rules đã deploy thành công và xác minh lại qua Rules API cùng anonymous REST reads. Chưa kiểm chứng upload production vì chưa có bucket.

- Unit/integration suite hiện có; Firebase Emulator owner/visitor/outsider allow/deny, immutable files/history và metadata trước upload.
- Browser regression cho editor, AI/config/variants và publication. Bài mới mô phỏng permission-denied: preview tiếp tục tải, publish bị khóa, retry phục hồi; kiểm tra 4 bước, advanced sections, CSS bo góc/màu và mobile.
- Review screenshot desktop/mobile; PDF checks và build assets.

Ảnh test nằm tại `test-results/cv-studio-redesign-desktop.png`, `cv-studio-redesign-mobile.png` và `cv-studio-permission-recovery.png` (gitignored). Dùng `npm start`, mở localhost:5173 rồi hard reload để nhận source/styles mới.
