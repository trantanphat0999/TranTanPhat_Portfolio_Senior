# Review và tối ưu Admin — 12/10/2026

Phạm vi: 7 trang admin và các tab bên trong; đọc mã nguồn, kiểm tra các luồng bằng Playwright/Edge, xem ảnh desktop/mobile. Thay đổi trong checkout hiện tại. Workspace có các thay đổi sẵn trước đợt review này; báo cáo dưới đây chỉ nhận các cải tiến của đợt này. Không publish dữ liệu portfolio thật trong lúc kiểm tra.

## 1. Kiến trúc và hướng thiết kế

Admin hiện có bốn loại công việc: sửa portfolio công khai, quản lý profile riêng, soạn/publish CV và cấu hình AI/dữ liệu. Tách các loại dữ liệu này là hợp lý: đổi profile không tự động thay PDF official; AI đề xuất phải được review; dữ liệu JD/context không thuộc seed công khai. Không nên gộp mọi thứ vào một nút “Optimize all” vì người dùng mất khả năng kiểm soát nội dung được đưa lên public.

Vấn đề lớn của giao diện là diện tích soạn thảo và mức ưu tiên: nhiều lời giới thiệu trong Overview nhưng ít hướng dẫn hành động; các bảng công cụ cạnh tranh diện tích với nội dung; trạng thái chọn tab chưa thể hiện đầy đủ cho bàn phím. Thiết kế cập nhật giữ nền xanh đậm và nội dung soạn thảo sáng, dùng thẻ rõ nhóm, khoảng cách thống nhất và ưu tiên công việc đang làm.

## 2. Review từng trang và tính năng

### Overview

- **Metrics:** trước đây project/achievement trống có thể được đếm thành một item do fallback `length || 1`. Đã sửa số lượng theo loại section; số lượng không được coi là điểm chất lượng.
- **Workspace health:** có trạng thái official CV, AI và sync queue nhưng phải tự tìm nơi xử lý. Đã thêm nút Review/Configure tại từng hàng, dùng mô tả “không có pending trên thiết bị” thay cho khẳng định mọi dữ liệu đã sync.
- **Next actions:** thêm ba việc gợi ý theo trạng thái queue/CV/provider thực tế, không gọi AI và không tự sửa dữ liệu. Khi còn pending, xử lý sync được đặt trước sửa nội dung.
- **Refresh:** thêm số thứ tự request để phản hồi cũ không ghi đè phản hồi mới; kết quả không cập nhật sau khi admin mode kết thúc.
- **Shortcuts:** giữ mở editor trực tiếp theo section. Hành động chính Import CV và hành động CV trong thẻ riêng rõ vai trò.

### Content

- **Portfolio sections:** tìm theo tên, mô tả và nội dung; chuẩn hóa khoảng trắng đầu/cuối; hiển thị số section khớp để phân biệt thư viện trống với tìm kiếm không có kết quả. Edit/Add/Arrange vẫn gọi các editor hiện có.
- **Custom blocks:** review các luồng tạo block, nội dung riêng/công khai, lưu nháp, restore, publish và reload. Các thao tác public vẫn đi qua kiểm tra revision, online sync và profile đã thay đổi. Cải thiện form/list dùng chung, không đổi mô hình dữ liệu.
- **Facts & evidence:** review import facts, verification, nguồn chứng cứ, backup/migration, Undo và việc chặn xóa khi còn liên kết. Không để AI tự xác nhận fact. List được giới hạn chiều cao để editor có không gian sử dụng; các control có kích thước thao tác thống nhất.
- **Tabs/editor:** thêm liên kết tab–panel, roving tabindex và phím mũi tên/Home/End. Editor fullscreen, tìm field, validation và draft protection sẵn có được giữ và kiểm tra hồi quy.

### Import CV

- **Nguồn:** đọc PDF/DOCX/Markdown, review text trước phân tích; nguồn lớn có giới hạn; scanned PDF vẫn cần OCR ngoài luồng hiện tại.
- **Original/Optimize:** original giữ câu chữ; optimize phải kiểm tra fact, field mới và cảnh báo. Không tự đưa proposal lên public.
- **Review/save:** sửa field làm mất trạng thái đã review; save tạo profile riêng. Khôi phục draft, lỗi kết nối và output cũ đã được kiểm tra bằng bộ test hiện có.
- **Thiết kế:** vùng nhập và lựa chọn mode có cùng nhịp khoảng cách, field tối thiểu 44px và chia cột desktop/stack mobile. Luồng ba bước hiện có đã hợp lý nên không thay lại bằng wizard mới.

### Portfolio library

- **Danh sách/tìm kiếm:** profile riêng có tên, nguồn và dữ liệu preview; màn hình trống có đường sang import hoặc lưu portfolio hiện tại.
- **Snapshot/switch:** chuyển profile lưu dữ liệu outgoing, media và layout; activation phải review trước; revision bảo vệ preview cũ. Official PDF tiếp tục có bước review/publish riêng.
- **Rename/export/delete:** export dữ liệu đầy đủ; không xóa active profile; xóa yêu cầu đúng tên. Các guard sau khi request kết thúc được kiểm thử hồi quy.
- **Thiết kế:** preview và danh sách chia cột; list cuộn có giới hạn, nút và input dễ thao tác. Chưa thêm so sánh profile trong đợt này.

### CV Studio

- **Nguyên nhân item hẹp:** ngoài inspector rộng 380px, CSS công khai còn áp `max-width:210mm` lên editor. Thu gọn tools trước đây vẫn không mở rộng item vì giới hạn này. Đã bỏ giới hạn A4 cho editor trong admin; A4 tiếp tục do renderer PDF quản lý.
- **Content:** inspector còn 290px để nhường vùng viết; item padding lớn hơn, cỡ chữ 14px, line-height 1.85, vùng editable tối thiểu 64px. Hide tools mở rộng toàn bộ vùng soạn thảo; có thể thu sidebar để tăng thêm diện tích.
- **Tìm/lọc:** thêm toolbar ngay trên editor: tìm theo section/kind/key/text, lọc section, included/excluded, clear filters và đếm field. Search bên tools đồng bộ với search mới. Bộ lọc chỉ thay cách hiển thị, không loại field khỏi CV.
- **Selection:** đổi checkbox cập nhật count, kiểu excluded và danh sách lọc; các field bắt buộc vẫn không thể loại bỏ. Wording override, restore source, application essentials, refresh source và Undo giữ quy trình hiện có.
- **Layout:** preset, page target, typography, margin/spacing và ordering vẫn đi qua renderer. Fit proposal phải được apply; chọn page target không có nghĩa PDF đã đủ điều kiện publish.
- **AI:** review/optimize, CV planning, context, JD keyword/evidence và interview pack giữ bước review và kiểm tra output stale/cancel. Thay đổi input/provider giữa request không được áp output cũ.
- **Review/publish:** giữ kiểm tra quyền, evidence, chất lượng, online sync, revision và PDF fit. Private draft/variant, release history và rollback tiếp tục tách khỏi source/public portfolio.
- **Mobile:** bỏ padding bao quanh CV; khi sửa content, thu header và đưa vùng item lên trước inspector. Toolbar vẫn có nút đổi content/preview và show/hide tools. Không chỉ kiểm tra “không overflow” mà còn kiểm tra bộ lọc nằm trong vùng đầu màn hình.

### AI Assistant

- Review kết nối dùng chung, context mặc định, chat output và việc hủy request khi session kết thúc. CV Studio vẫn là nơi review/apply sửa CV.
- Sửa empty state để phản ánh provider đã test: có provider ready thì ẩn lời mời cấu hình; chưa ready thì hiện lại. Trước đây trạng thái cũ có thể còn hiển thị.
- Form/list, focus và thiết kế thẻ thống nhất với các trang khác. Không đổi backend hoặc model selection trong đợt này.

### Settings & sync

- **Providers:** chọn OpenAI/Claude/Custom, service availability, credential probe, model catalog, test/cancel/activate. Credential không thuộc public seed. Test readiness bị vô hiệu hóa khi cấu hình đổi vẫn được kiểm thử.
- **Lỗi layout tìm thấy qua ảnh:** Claude ẩn số bước nhưng grid giữ cột 28px; body bị đặt trong cột hẹp, các thẻ provider xếp dọc và để trống phần lớn màn hình. Đã chuyển về một cột đầy đủ khi số bước bị ẩn; provider cards trở lại ba cột trên desktop.
- **Context library:** private context, default selection, device draft, save/undo/reload và writer AI; field/list dùng cùng style. Không tự publish context.
- **Data & sync:** conflict queue, seed backup và official CV giữ tác vụ riêng; queue status không bị diễn giải thành trạng thái toàn bộ cloud.
- **Mount/lỗi:** mount provider đi qua wrapper có bắt lỗi; các phản hồi lỗi được đưa vào status thay cho promise rejection không xử lý.

## 3. Điều hướng và khả năng sử dụng chung

- Sidebar desktop gọn hơn; có Collapse/Expand và nhớ lựa chọn trên thiết bị. Nút icon vẫn có accessible name và tooltip.
- Mobile giữ nav ngang; section đang chọn được cuộn vào vùng nhìn thấy.
- Tab Content/Settings có `aria-controls`, `aria-labelledby`, `role=tabpanel`, điểm dừng Tab trên tab được chọn và điều hướng bằng bàn phím.
- Card/form/list/search sử dụng khoảng cách và kích thước thống nhất; long text được wrap; danh sách dài có vùng cuộn riêng.
- Design CSS được scope vào admin; không áp width editor lên PDF renderer hoặc nội dung portfolio công khai.

## 4. Các tính năng nên bổ sung theo thứ tự

| Ưu tiên | Tính năng | Giá trị và tiêu chí hoàn thành |
| --- | --- | --- |
| P1 | So sánh profile/CV trước khi kích hoạt | Diff theo section, highlight thay đổi fact/media/layout, link tới field; xem rõ dữ liệu public sẽ đổi trước activation. |
| P1 | Trung tâm bản nháp và khôi phục | Gom draft Content/CV/Import/Context thành danh sách có thời điểm, owner, base revision và restore/export; không tự restore lên revision mới. |
| P1 | Checklist trước publish | Kiểm tra link/contact, field bắt buộc, facts chưa verify, PDF overflow và sync conflict; mỗi cảnh báo mở đúng field. Chặn lỗi kỹ thuật, cho review rõ các cảnh báo nội dung. |
| P2 | Job workspace | Nhóm JD, CV variant, interview pack và trạng thái ứng tuyển theo công ty/vị trí; tái sử dụng dữ liệu JD/preparation hiện có. |
| P2 | Bảng thay đổi giữa portfolio và CV | Sau khi sửa source, chỉ rõ field nào thêm/sửa/xóa; chọn cập nhật từng field, giữ wording override và Undo. |
| P2 | Nhật ký hoạt động | Lưu ai/thời điểm/revision/hành động, không lưu secret; lọc profile activation, publish và rollback để truy nguyên sự cố. |
| P2 | Đồng nhất ngôn ngữ UI | Từ điển VI/EN cho navigation, label, trạng thái và validation; không dịch câu chữ portfolio/CV khi chỉ đổi ngôn ngữ UI. |
| P3 | OCR trong Import | Preview độ tin cậy theo trang và yêu cầu xác nhận đoạn mơ hồ; không coi OCR là fact đã verify. |
| P3 | Gợi ý AI có evidence theo field | Hiện câu nguồn, fact liên quan, lý do rewrite và diff; đo chất lượng bằng coverage/consistency thay cho điểm “hoàn hảo” chung. |

Các hàng trong bảng là đề xuất, chưa được triển khai trong đợt này. Không cần bổ sung tất cả cùng lúc; ưu tiên diff, draft recovery và publish checklist vì chúng giảm sai sót trực tiếp trong luồng hiện tại.

## 5. Kiểm tra và giới hạn

- `npm test`: 82/82 pass.
- `node tests/admin-design-review.cjs`: 7 route, subtabs Content/Settings, bàn phím, sidebar collapse, item width, search/filter, Hide tools và mobile.
- Bộ browser hiện có: admin-workspace, admin-cv-usability, profile-import-browser, ai-studio-browser, jd-preparation-browser.
- Ảnh review lưu trong `test-results/admin-review-*.png`, gồm Overview, blocks, facts, import, profiles, AI, Settings, CV writing và mobile của 7 trang.
- Browser tests dùng Firebase và AI fixtures/mock để kiểm tra UI và các guard; không xác nhận quyền/bucket/service thật trong production. Cấu hình Storage/Firestore và AI service thực tế cần được vận hành theo tài liệu hiện có.
- Đợt này không deploy, không ghi public dữ liệu thật, không commit các thay đổi sẵn có của workspace.
