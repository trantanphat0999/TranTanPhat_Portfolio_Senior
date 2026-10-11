# Review CV và kế hoạch mở rộng AI Agent

Ngày: 11/10/2026. Trạng thái: kế hoạch đề xuất, chưa triển khai thay đổi sản phẩm.

Cập nhật: đã triển khai local và review lại. Xem [kết quả, cách sử dụng và kiểm chứng](CV_CONFIG_AGENT_IMPLEMENTATION.md). Snapshot public trong Firestore chưa thay đổi.

## 1. Phạm vi và bằng chứng

Review bản official đọc qua `loadOfficialCv()` và render bằng `createCvPdf()`, cùng đường dữ liệu của nút Download PDF public. Không dùng HTML lưu trữ trong `cv/` để đại diện cho CV hiện tại; không dùng helper legacy `createPublicCvPdf()` vì helper này tự rút gọn nội dung.

- Official snapshot: version 4, revision 1; số trang lưu và số trang render đều là 2.
- A4, Roboto 10 pt, line height 1.12, lề 36.85 pt (~13 mm); 635 từ.
- Kiểm tra trực quan cả hai trang: một cột, phân cấp rõ, không thấy nội dung bị cắt; trang 1 khá dày, trang 2 còn khoảng trống cuối trang.
- PyMuPDF xác nhận A4, font nhúng và hyperlink trên cả hai trang. Một số dấu gạch ngang trong text extraction của PyMuPDF trở thành ký tự replacement dù hình render đúng; cần kiểm tra chéo PDF.js và khắc phục nếu lỗi nằm trong Unicode mapping của PDF.
- 21 tests liên quan trong `cv-model`, `official-cv`, `public-cv`, `ai-studio` đều pass tại thời điểm review. Không chạy provider trả phí, không đánh giá bằng ATS thật.
- Artifact: `test-results/cv-review-current-official.pdf`, `cv-review-current-report.json`, `cv-review-current-page-1.png`, `cv-review-current-page-2.png`.

## 2. Kết luận

Format hiện tại đủ nền tảng để gửi ứng tuyển, nhưng chưa tối ưu cách thể hiện năng lực Senior QA. Chất lượng trình bày và khả năng đọc máy khá tốt; sức hút nội dung còn bị giảm do trùng lặp, lựa chọn thông tin và cách mô tả kết quả. Không có một format đảm bảo được mọi nhà tuyển dụng hoặc mọi ATS chấp nhận.

AI hiện tại là trợ lý review và sửa wording, chưa phải agent điều phối CV config. Task `cv-optimize` chỉ trả về `{key,text,reason}`; UI chỉ nhận key đang được chọn và áp dụng text override. AI chưa thể include/exclude, đổi thứ tự section/project, điều chỉnh typography, đề xuất preset hoặc đánh giá nhiều phương án layout.

## 3. Những điểm cần sửa

| Ưu tiên | Hiện trạng | Hướng xử lý |
|---|---|---|
| P0 | Udemy course có tên “ISTQB Certified Tester” trong Certifications | Xác minh loại credential; ghi rõ course completion/preparation, không coi là chứng chỉ ISTQB chính thức nếu chưa có bằng chứng thi |
| P0 | Một số tuyên bố tuyệt đối: “all conversation paths”, “eliminated ... entirely”; “remediated” chưa phân biệt vai trò QA và Dev | Hỏi bằng chứng/phạm vi; chỉ sửa dựa trên dữ liệu xác nhận, không tự thêm số liệu hoặc đổi quyền sở hữu thành tích |
| P1 | Summary và mô tả job chính gần như lặp lại | Summary 3–4 dòng theo vai trò mục tiêu; Experience tập trung action, phạm vi và kết quả |
| P1 | Internship 2 tháng có đoạn dài và 4 bullets | Rút thành 1–2 bullets; dành chỗ cho kinh nghiệm gần đây và ownership |
| P1 | Thành tích CI/CD, mentoring, performance nằm rải rác; achievement mạnh ở trang 2 | Đưa bằng chứng liên quan lên job hiện tại/trang 1; bỏ lặp giữa Experience, Projects, Achievements |
| P1 | Header Senior nhưng job ghi QA Engineer | Giữ đúng title lịch sử; bổ sung thăng tiến hoặc trách nhiệm Senior nếu có bằng chứng, không tự đổi chức danh |
| P1 | “4+ years” trong khi Aug 2021–Present tới 10/2026 hơn 5 năm | Cảnh báo số năm có thể lỗi thời; xác nhận kinh nghiệm liên tục trước khi cập nhật |
| P1 | “200K records/2s” thiếu workload, concurrency và ý nghĩa metric | Mô tả workload, môi trường, percentile/SLA nếu có; tách kết quả hệ thống khỏi đóng góp QA |
| P1 | Chữ/lề đang sát giới hạn tối thiểu; job title, date, company xếp ba dòng | Ưu tiên giảm nội dung; thử body 10.5–11 pt, lề 15–16 mm, dòng tiêu đề gọn; kiểm tra thứ tự trích xuất nếu căn ngày bên phải |
| P2 | “Postman Tool”, “Jmeter Tool”, “Test Document” và skills nhóm chưa nhất quán | Chuẩn hóa thành Postman, JMeter, test planning/documentation; phân nhóm Testing, Automation/API, Performance/Security, Languages, CI/CD |
| P2 | 6 credentials có mức liên quan khác nhau với QA | Chọn theo JD; phân biệt Certifications và Courses & Training khi đủ dữ liệu |
| P2 | Link dài làm header nặng; tên “Phat Tran” khác tên portfolio | Cho phép label ngắn kèm URL thực; xác nhận tên chuyên nghiệp muốn dùng và đồng bộ, không tự đổi |

Ví dụ wording chỉ dùng các facts đã có: “Automated scheduled API test runs and report delivery with Postman and GitHub Actions.” Phần tác động tiết kiệm thời gian chỉ bổ sung khi có số liệu xác nhận. Với security, cần xác nhận QA trực tiếp sửa lỗi hay phát hiện và phối hợp kiểm tra bản sửa trước khi chọn động từ.

## 4. Kiến trúc đề xuất

Giữ Vanilla JS và pdfmake. Tách model/config, planning, validation, render và apply thay vì mở rộng toàn bộ logic trong `cv-tools.js`.

### Config có version và validation

- Thêm `js/cv/config.js`: schema, defaults, normalize/migrate và giới hạn.
- Phân biệt `configVersion` với `snapshot.version` và `rendererVersion` hiện có; không tái sử dụng version 4 cho ý nghĩa mới.
- Cấu hình nội dung: section order, group order trong section, excluded keys/groups, overrides, contact labels, heading labels, language/target role, preset.
- Cấu hình hiển thị: font enum hiện có, body size, line height, margins, section/item/bullet spacing, header alignment và date placement enum.
- Tất cả đường vào dùng chung validator: UI, import, AI proposal, draft restore và render. Field metadata (`kind`, `group`, URL nguồn) không được AI sửa tùy ý.
- Guardrail mặc định: body >=10 pt; lề >=12.7 mm; font/spacing/heading bounds hữu hạn; không arbitrary CSS, JavaScript hoặc remote fonts.
- Sắp thứ tự theo section và group để title/date/company/bullets đi cùng nhau; không reorder field tự do khiến renderer chia một job hoặc section thành nhiều đoạn.
- `pageTarget` là giới hạn tối đa; số trang thực tế do render đo, không do AI quyết định. Preset 2 trang là mặc định đề xuất.

### AI proposal có cấu trúc

- Thêm task `cv-plan` với JSON Schema strict trong `js/ai/tasks.js`; backend hiện dùng registry task/schema này.
- Input: toàn bộ portfolio fields được phép dùng, selected CV, config hiện tại, JD/context đã chọn, revision/hash và report từ PDF đo thực tế.
- Output: summary, assumptions, evidence questions, operations và rationale. Operations allowlist: `rewriteField`, `setIncluded`, `reorderSections`, `reorderGroups`, `setStyle`, `setContactLabel`, `setHeadingLabel`.
- Rewrite có source keys/evidence references; không tạo employer/date/credential/metric hoặc key lạ. Nhận source key bị exclude để agent có thể đề xuất đưa lại project có liên quan.
- Dùng `js/cv/proposal.js` để validate và apply vào bản clone trong bộ nhớ. Unknown key, duplicate/conflicting operation, enum/range sai, orphan group và thao tác làm mất name/email phải bị từ chối trước mutation.
- Kiểm tra lại hash bao gồm CV/config, nguồn portfolio, JD, context fingerprint, provider settings và base revision trước khi Apply. Cơ chế `signature()` hiện có cần mở rộng vì chưa bao phủ toàn bộ source evidence.
- Source references giúp truy vết, không tự chứng minh mọi tuyên bố đều đúng; tuyên bố mới/đổi số liệu cần bằng chứng cụ thể hoặc câu hỏi xác nhận.

### Chu trình render và review

1. Analyze JD/evidence và tạo proposal.
2. Validate operations; apply vào candidate riêng.
3. Render candidate bằng đúng renderer dùng cho export.
4. Đo page count, text extraction, overflow, heading orphan và mức dễ đọc.
5. Nếu cần, gửi feedback đo được để điều chỉnh; tối đa 2 vòng sửa sau proposal đầu, có Cancel và giới hạn chi phí/thời gian.
6. Hiển thị diff wording, include/exclude, order và style; chọn từng thay đổi rồi render lại tổ hợp đã chọn.
7. Apply thành một transaction vào draft với Undo; lưu official qua hành động hiện có.

Không tự publish từ AI chat. Đây là thiết kế kiểm soát proposal trong sản phẩm; không phát sinh yêu cầu xin phép riêng cho việc triển khai local đã được người dùng yêu cầu ở bước sau.

### Snapshot và tương thích

- Snapshot mới lưu đủ effective config/order/labels và hash; preview, download Admin và public cùng renderer và config.
- Version 4 cũ giữ render v1. Nếu renderer mới thay đổi bố cục, dùng dispatcher hỗ trợ v1/v2; chỉ chuyển snapshot khi người dùng review và lưu lại.
- Không cho global đổi renderer làm bản đã publish sai page count rồi bị nút public từ chối.
- JD, context, proposal, câu hỏi bằng chứng và lịch sử riêng tư nằm trong admin docs; public snapshot chỉ gồm nội dung/config xuất CV cần thiết.
- Giữ revision conflict checks; draft có revision/CAS nếu thêm nhiều variant hoặc nhiều tab editing. Không ghi đè công việc từ client khác.

## 5. Plan triển khai theo giai đoạn

| Giai đoạn | Công việc / file chính | Điều kiện hoàn thành |
|---|---|---|
| 1 — Config và renderer | Thêm `config.js`; cập nhật `model.js`, `pdf.js`, `service.js`; migration và renderer dispatcher | Config validation thống nhất; version 4 cũ giữ hình/text/layout; renderer mới thực thi order/labels/spacing |
| 2 — Nội dung và UI | Cập nhật `cv-tools.js`, `cv-styles.js`; form margin/spacing/order/preset/contact labels; review credential/facts | Chỉnh thủ công được mọi operation mà AI sẽ dùng; đề xuất CV gọn hơn với evidence mạnh ở trang 1; không sửa facts chưa xác nhận |
| 3 — AI planning | Thêm `cv-plan`, `proposal.js`; mở rộng input và freshness checks; UI diff và chọn operation | Agent đề xuất được content selection + order + typography; invalid/stale proposals không mutation; Apply/Undo nguyên tử |
| 4 — Render feedback | Thêm `quality.js`; phân tích PDF.js, optional PyMuPDF test; candidate preview và vòng điều chỉnh giới hạn | Page count lấy từ PDF thật; no clipping/lost text/orphan heading; report rõ tiêu chí nào fail; cancellation không làm hỏng draft |
| 5 — Variants và phát hành | Private CV variants theo JD; export variant riêng; promote một variant thành official; cập nhật docs | Nhiều bản private không thay bản public; public/Admin official giống nhau; lỗi revision không ghi đè; full checks pass |

MVP gồm giai đoạn 1–4. Variants ở giai đoạn 5 thực hiện sau khi config và proposal ổn định. Ưu tiên xử lý nội dung và config trước, không cần thay framework hoặc viết lại Admin workspace.

## 6. Kiểm thử và nghiệm thu

- Unit: migrate/default/bounds; grouping và section order; operation atomicity; unknown/missing IDs; evidence/freshness; revision conflict.
- Browser: chỉnh config, candidate preview, chọn subset operations, Apply/Undo, Cancel, thay JD/source/provider giữa request; khôi phục draft; responsive 390 px và desktop.
- PDF: A4, font embedded, body >=10 pt, đúng link/labels; giữ toàn bộ selected text và thứ tự; no crop/blank page/orphan heading; tiếng Việt và dấu gạch ngang trích xuất đúng.
- So sánh official Admin/public bằng text, link positions và rendered image. Có fixture version 4 cũ để bảo vệ renderer v1 và fixture config mới để bảo vệ v2.
- Negative cases: AI yêu cầu thay email/title/ngày/số liệu không có nguồn, đề xuất thiếu field bắt buộc, quá page target, context bị xóa, request cancel/timeout và stale revision.
- Chạy `npm test`, `npm run build`, browser suites liên quan và `npm run test:pdf` sau khi tạo đủ fixture. Các kết quả test pass không đồng nghĩa ATS thật pass.
- Kịch bản nghiệm thu agent: nhập “Ưu tiên API automation, giảm internship, giữ tối đa 2 trang và font ít nhất 10.5 pt”; nhận selection/order/style diff, PDF candidate đo thực tế, rồi Apply và Undo được.

## 7. Nguồn tham khảo

- [MIT CAPD — Resumes](https://capd.mit.edu/resources/resumes/): font từ 10 pt, lề tối thiểu nửa inch, mô tả cụ thể và action verbs. Đây là hướng dẫn nghề nghiệp, không phải tiêu chuẩn bắt buộc toàn ngành.
- [MIT CAPD — Career toolkit](https://capd.mit.edu/resources/career-toolkit-crafting-an-effective-resume/): lựa chọn độ dài theo kinh nghiệm và nội dung liên quan.
- [Greenhouse — Unsuccessful resume parse](https://support.greenhouse.io/hc/en-us/articles/200989175-Unsuccessful-resume-parse): đồ họa, ảnh, bố cục nhiều cột và cấu trúc phức tạp có thể gây lỗi parsing. One-column text PDF hiện tại là hướng phù hợp nhưng chưa được kiểm chứng bằng ATS thật.
