# CV config, AI planning và review sau triển khai

Ngày: 11/10/2026. Đã triển khai local; chưa deploy hosting hoặc thay snapshot official trong Firestore.

## Kết quả

Config có version, renderer v2, preset Senior QA, structured AI operations, preview/diff trước Apply, render feedback, Undo và private variants theo JD. Renderer v1 tiếp tục phục vụ snapshot cũ.

Artifact reviewed: `cv/CV_TranTanPhat_SeniorQA_Reviewed.pdf` và JSON snapshot cùng tên, tạo từ dữ liệu official đã đọc. Bản reviewed có 2 trang A4, 352 từ theo field model, Roboto 10.5 pt, line height 1.2, lề 16 mm. Contacts/metadata dùng cỡ body; footer 9 pt. Experience, achievements và skills ở trang 1; projects, education và training ở trang 2. Job/project ngắn được giữ cùng trang. URL thật vẫn có hyperlink dưới label ngắn.

## Review nội dung và hình thức

- Summary ngắn, không lặp mô tả job; bỏ số năm kinh nghiệm có thể lỗi thời.
- Job hiện tại dùng action verbs cho Postman/GitHub Actions, JMeter, AI-assisted QA và mentoring 5 thành viên.
- Internship còn 2 bullets; giữ title và dates nguồn.
- Bug Hunter 2025, performance benchmark và CI/CD/report delivery nổi bật ở trang 1.
- Performance mô tả kết quả hệ thống trong benchmark được cung cấp và đóng góp phối hợp QA; không thêm concurrency/percentile.
- Security giữ “Identified 12 ... before launch”; bỏ claim remediation chưa rõ vai trò QA.
- Bỏ claim bao phủ “all conversation paths”; giữ fallback/escalation/edge cases.
- Khóa Udemy có tên ISTQB ghi rõ “Course completion”; không khẳng định là chứng chỉ ISTQB chính thức.
- Skills chuẩn hóa tên tool và nhóm Languages & Databases. Artifact không thêm công nghệ hoặc số liệu mới.
- Đã xem trực quan hai trang cuối: không crop, không project/heading bị tách trang, chữ rõ hơn bản trước và bố cục một cột.

Nội dung rõ và tập trung hơn; mức độ hấp dẫn còn phụ thuộc JD. Không có kiểm thử ATS thật hoặc bảo đảm tỷ lệ được gọi phỏng vấn. Facts/metrics/credentials dùng dữ liệu portfolio/CV cung cấp, không phải kết quả xác minh độc lập với employer/issuer.

## Sử dụng

1. Admin → CV Studio → **Use Senior QA preset**; review wording và PDF.
2. Trong **AI / JD**, nhập JD và chọn context. Trong **Plan with AI**, nhập yêu cầu, ví dụ ưu tiên API automation, giảm internship, tối đa 2 trang và body ít nhất 10.5 pt.
3. **Plan content & layout** đề xuất wording, include/exclude, section/group order, style và labels; đọc assumptions/evidence questions.
4. Chọn từng operation → **Preview selected changes** → xem diff và measured PDF. Apply chỉ mở khi vừa page target và PDF checks pass. Thay selection phải preview lại.
5. **Apply reviewed changes** cập nhật draft nguyên tử; **Undo** phục hồi content/config. AI không tự publish.
6. **Save private variant** lưu bản theo JD trong admin collection. Có thể load/delete/download riêng. **Save official CV** promote bản hiện tại thành public snapshot.

Bản public trong Firestore chỉ thay đổi sau khi owner đăng nhập và Save official CV. Các lượt review/export của session này là read-only đối với Firestore.

## Cấu trúc

- `js/cv/config.js`: defaults, bounds, validation, coherent ordering; header giữ thứ tự identity.
- `js/cv/proposal.js`: clone transaction, allowed operations, identity và employer/date protection, source references, numeric/technology checks và diff.
- `js/cv/recruiter.js`: preset từ nguồn, giữ custom wording, không thêm claims.
- `js/cv/pdf.js`: v1/v2 dispatcher, v2 giữ requested typography, grouping, labels, spacing và inline dates. Gạch ngang chuẩn hóa ASCII để parser nhất quán.
- `js/cv/quality.js`: PDF.js kiểm tra A4, text/order/completeness, bounds, body size, blank page và orphan heading.
- `js/ai/tasks.js`: schema strict `cv-plan`; bridge/provider dùng registry hiện có.
- `js/admin/cv-tools.js`: config UI, selected operations, candidate, Apply/Undo, freshness theo draft/source/JD/context/provider và private variants.
- `js/firebase-config.js`: private draft dùng revision/CAS; official giữ online revision checks.
- `tools/cv-review-export.cjs`: read official và tạo reviewed artifact; chặn mutation/authentication endpoints.

Planning tối đa 3 requests: proposal đầu và 2 lần sửa theo PDF feedback, deadline tổng 120 giây, có Cancel. Preview/Apply đọc lại nguồn. Unknown operations/keys, immutable identity/title/date/employer/credential, số liệu không có evidence và style ngoài bounds bị từ chối. Validator không thay việc kiểm tra ngữ nghĩa; diff/source references hỗ trợ review facts chưa chắc chắn.

## Kiểm chứng

- `npm test`: 48 tests pass, gồm config/proposal/snapshot/renderer compatibility và bridge/provider.
- `tests/cv-config-browser.cjs`: preset, config, variants save/load/delete/export, selected operations, candidate/diff, Apply/Undo, Cancel, invalid/stale instructions, render feedback, responsive và v2 official/public pass.
- Các browser suites cũ kiểm tra public download, page limits, long content, Admin draft/offline/conflict, shared AI settings/context và Claude CLI.
- `npm run test:pdf`: legacy và v2 fixtures; embedded fonts, A4, bounds, text/links; official Admin/public giống nhau về text, link positions và rendered pixels.
- PyMuPDF/PDF.js xác nhận reviewed artifact đủ text, không replacement character và có hyperlink.
- `npm run build`: pass; thông báo Browserslist database cũ không làm build fail.

AI planning/bridge tests dùng responses hoặc provider stub để kiểm chứng hành vi xác định. Chưa chạy `cv-plan` với model trả phí thật trong session này. PDF.js/PyMuPDF không phải ATS của nhà tuyển dụng.
