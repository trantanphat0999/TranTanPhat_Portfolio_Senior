# Portfolio section tùy chỉnh — yêu cầu, triển khai và review

## Phân tích yêu cầu

“Add portfolio section” được hiểu là thêm một section độc lập bên cạnh các section có sẵn, không chỉ thêm card vào Summary/Projects. Section cần có tên, vị trí, menu, danh sách item, field do admin định nghĩa và icon mới do AI tạo. Admin giữ quyền quyết định cấu trúc và dữ liệu; AI chỉ thiết kế icon, không tự sinh field hoặc sửa nội dung item.

Custom blocks hiện có dùng field title/text/url cố định và gắn vào section có sẵn. Giải pháp mở rộng chúng bằng `kind: "section"`, thay vì tạo collection động hoặc hardcode HTML mới cho từng section. Các block cũ tiếp tục hoạt động.

## Cách sử dụng

1. Vào **Content → Add portfolio section** hoặc **Custom sections & blocks → Add portfolio section**.
2. Đặt tên, introduction, **Insert after**, public/private, bật/tắt menu và nguồn CV.
3. Thêm field, đặt tên, chọn kiểu, required và choices nếu cần. Sắp xếp hoặc xóa field bằng các nút tương ứng.
4. Thêm item và nhập giá trị. Có thể duplicate, sắp xếp và xóa item. Đổi tên/thứ tự field giữ nguyên giá trị; đổi kiểu hoặc xóa field có dữ liệu yêu cầu xác nhận và hỗ trợ Undo.
5. Nhập icon brief nếu muốn; chọn **Generate new icon with AI**, review preview rồi **Apply reviewed icon**.
6. Review live preview. **Save private draft** giữ công việc riêng; **Publish public blocks** đưa các section/block public lên portfolio. Section mới xuất hiện trong danh sách Portfolio sections và có nút Edit section.

Kiểu field: short text, long text, number, date, link, email, checkbox, tags và choices. Hiện hỗ trợ tối đa 30 field/section, 100 item/section và 100 section/block trong tài liệu chung. Dữ liệu vẫn chịu giới hạn dung lượng Firestore hiện có; các giới hạn số lượng không bảo đảm mọi tổ hợp đều vừa một document.

Icon dùng provider đã cấu hình và test trong Settings. Backend AI cần bản mã mới để hỗ trợ task `icon-create`; nếu service local đang chạy bản cũ, khởi động lại `npm run admin:local` trước khi sử dụng.

## Thiết kế dữ liệu

- Public: `portfolio/custom-blocks` giữ các section/block được publish. Private: `admin/custom-blocks` giữ draft đầy đủ, bao gồm section private và icon brief.
- Device draft dùng cơ chế `portfolio.blockDraft` hiện có. Restore kiểm tra base public revision để không ghi đè nội dung mới bằng draft cũ.
- Field và item có ID ổn định. Giá trị trong item được ánh xạ theo field ID, không dùng label làm key. Renaming/reordering không làm mất dữ liệu hoặc thay CV source key.
- `generatedIcon` lưu label và danh sách path SVG. Icon brief không thuộc public payload; reload editor lấy brief từ draft riêng theo section ID.
- Private/inactive section không được render; private section không được đưa vào public payload hoặc CV source.
- Khi bật nguồn CV, mỗi field có giá trị sinh một field CV riêng với key chứa section/item/field ID. Official CV không tự thay đổi; review/publish riêng trong CV Studio.
- Profile snapshot, switching và seed backup tiếp tục mang section mới trong `custom-blocks`; không cần mở collection public hoặc đổi Firestore rules.

## Icon AI

Task `icon-create` tạo vector mới, không chỉ chọn icon trong registry. Input gồm tên section, introduction, label/type của field và brief; không gửi giá trị item hoặc context mặc định. UI nói rõ phần dữ liệu nào được gửi.

Output được kiểm tra trước preview/apply: 1–12 path, mỗi path tối đa 800 ký tự, tọa độ 0–24, chỉ cho phép các lệnh M/L/H/V/C/Q/Z tường minh. Không chấp nhận SVG markup, URL, script, thuộc tính sự kiện hoặc lệnh ngoài tập hỗ trợ. Renderer tự dựng SVG bằng dữ liệu đã validate và escape.

Icon chỉ vào draft sau khi admin chọn Apply. Thay đổi section trong lúc AI chạy, đổi provider/context hoặc kết thúc session làm output cũ không thể áp dụng. Có Cancel; chuyển editor hoặc logout hủy request. Save/publish khóa thao tác và hủy icon request đang chạy.

## Render và navigation

Section được chèn sau section gốc do admin chọn; nhiều section cùng vị trí giữ thứ tự trong builder. Tùy chọn menu tạo nút tương ứng; hide/delete/private loại cả section lẫn nút menu khi render lại. Bật/tắt menu không thay visibility của section.

Navigation trước đây giữ danh sách link cố định lúc DOMContentLoaded. Đã đổi sang lấy link khi đo layout và xử lý click qua delegation, nên link mới hoạt động mà không reload trang. Scrollspy được cập nhật sau render/resize. Preview admin tính thêm chiều cao toolbar để menu không che heading; visitor bình thường giữ offset ban đầu.

## Review và kiểm tra

Các lỗi được phát hiện và sửa trong review:

- Checkbox bị style chung phóng lớn và label bị grid đẩy xuống: sửa kích thước checkbox và layout inline.
- Menu sticky bị toolbar admin che trong preview: thêm offset toolbar cho CSS và phép tính scroll.
- Field type/choices sai hoặc field bắt buộc trống: chặn publish với thông báo cụ thể; vẫn lưu draft chưa hoàn chỉnh được.
- Icon output nguy hiểm/không đúng hình học: không preview/apply/publish.
- Icon response cũ hoặc editor đã rời khỏi: không áp dụng; logout dọn editor và hủy request.
- Private icon brief không hiển thị public nhưng vẫn được giữ khi reload editor.
- Section mới phải xuất hiện trong danh sách chính, tìm kiếm, tổng số section và đường Edit section; không bị ẩn chỉ trong builder.
- Một section public có cấu trúc hỏng được bỏ qua khi render, để các section khác vẫn hiển thị.

Kiểm thử:

- `npm test`: 87/87 pass, bao gồm schema/value validation, stable IDs, privacy, SVG validation và public rendering.
- `node tests/custom-sections-browser.cjs`: đủ 9 kiểu field, save draft, AI output stale/invalid, review/apply, required validation, publish, field rename, CV source, dynamic menu, hide/private/restore/logout, desktop/mobile.
- Kiểm thử hồi quy: AI Studio, Admin design review, Admin workspace/CV, profile import, motion và media/navigation.
- Ảnh review: `test-results/custom-section-admin.png`, `custom-section-admin-mobile.png`, `custom-section-public.png`, `custom-section-public-mobile.png`.

Các browser tests dùng Firebase/AI fixtures để kiểm tra luồng và trạng thái; không gửi dữ liệu owner hoặc publish lên Firebase production. Không deploy trong đợt triển khai này. Chất lượng hình vẽ từ provider thực tế còn phụ thuộc model và brief; UI luôn có preview và quyền regenerate trước khi áp dụng.
