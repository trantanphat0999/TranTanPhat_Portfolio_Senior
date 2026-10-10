# Review và triển khai CV — 10/10/2026

## Đánh giá bản trước

Khổ A4 và font nhúng đã có, nhưng body 9,4 pt, liên hệ 8,3 pt, lề ngang khoảng 12 mm và lề dọc khoảng 10 mm làm CV khá nhỏ khi in. Giãn dòng 1,38 tạo chiều cao lớn dù chữ nhỏ. Skills chia hai cột; thứ tự một số công việc và câu chữ lại được lấy từ HTML cũ khi dữ liệu khớp seed. Vì vậy PDF không hoàn toàn thể hiện nội dung portfolio hiện tại. Bản public lưu nguyên một snapshot, còn fallback cũng dùng seed: sửa portfolio có thể không cập nhật CV được tải.

Khuyến nghị tham khảo của [MIT CAPD](https://capd.mit.edu/resources/resumes/) là font không nhỏ hơn 10 pt, lề tối thiểu nửa inch. [MIT Career Toolkit](https://capd.mit.edu/resources/career-toolkit-crafting-an-effective-resume/) đề xuất 1–2 trang tùy lượng kinh nghiệm liên quan. Đây là hướng dẫn tuyển dụng, không phải một chuẩn bắt buộc áp dụng cho mọi doanh nghiệp hoặc bảo đảm vượt mọi ATS.

## Thiết kế mới

| Thành phần | Thông số |
|---|---|
| Giấy | A4 đứng, 210 × 297 mm |
| Lề mặc định | 16 mm cả bốn phía |
| Chữ nội dung | Roboto 10,5 pt; có thể chọn Noto Serif |
| Giãn dòng | 1,20 mặc định; khoảng cách đoạn/bullet và section riêng |
| Tên / vai trò / section | 22 / 11 / 11,5 pt |
| Liên hệ, ngày tháng | 10 pt; email, điện thoại, LinkedIn, GitHub có liên kết |
| Màu | Nội dung xanh đen đậm, thông tin phụ xám, đường phân cách mảnh |
| Bố cục | Một cột; không ảnh, không biểu đồ kỹ năng; cùng thứ tự đọc và thứ tự trích xuất |
| Kinh nghiệm | Công việc hiện tại trước, tiếp theo sắp theo năm kết thúc; giữ thứ tự nguồn khi cùng năm |
| Thứ tự nội dung | Thông tin / summary → Experience → Skills → Projects → Achievements → Highlights → Education → Certifications |
| Cuối trang | Tên và số trang; font footer 9 pt |

Ngày tháng đặt ngay dưới vai trò để tránh cột ngày bị tràn khi tên công việc hoặc khoảng thời gian dài. Certificate được trình bày gọn, có issuer/năm và link nguồn. Heading section được gắn với phần mở đầu; văn bản dài tiếp tục qua trang thay vì nằm trong khối không thể phân tách.

Không thay thứ tự các section của portfolio và không xóa nội dung portfolio. Chỉ thêm nút Download CV cạnh trạng thái ở hero; nút footer vẫn còn.

## Chọn số trang và phạm vi nội dung

- **Auto:** xuất toàn bộ nội dung đã chọn cho CV, giữ khả năng đọc.
- **1 / 2 / 3 / 4 pages:** giới hạn số trang tối đa. Engine tạo PDF thật và đếm trang; nếu vượt thì thử 10 pt, lề 13 mm, line height 1,12. Nếu vẫn vượt, preview báo số trang thực tế và khóa Download/Publish. Không cắt chữ, giấu phần cuối hoặc thêm trang trắng để giả đúng số trang.
- **Use application selection:** hành động chủ động của owner; chọn câu chữ nguồn ngắn hơn, tối đa 3 project, 3 achievement và 6 certificate ưu tiên testing/QA. Các phần lặp, trách nhiệm chi tiết và career objective không đưa vào biến thể này. Tất cả field vẫn xuất hiện trong editor để kiểm tra và chọn lại. Công việc và education được giữ.
- **Reset to Linked Content:** khôi phục phạm vi đầy đủ và style mặc định. Portfolio vẫn nguyên vẹn ở cả hai chế độ.

Với Senior QA, bản ứng tuyển 2 trang phù hợp hơn bản tham chiếu dài chứa mọi project responsibility và khóa học. Preset là điểm bắt đầu; owner cần chọn project/chứng chỉ sát vị trí tuyển dụng. Một CV 1 trang sẽ cần lựa chọn mạnh hơn. Không thể bảo đảm mọi lượng nội dung tùy ý đều vừa một số trang cố định mà vẫn đủ chữ và dễ đọc.

## Đồng bộ dữ liệu

`js/cv/model.js` lấy nội dung trực tiếp từ tám document portfolio. Không còn dùng HTML CV lưu trữ để thay thế các câu trong nguồn. Item ẩn (`inactive`) không được đưa trở lại CV. Add/Edit/Delete được phản ánh khi xây dựng CV; record có `_id` ổn định giữ liên kết khi đổi thứ tự.

Publication version 3 lưu **style + lựa chọn field + rewrite và văn bản nguồn tương ứng**, thay cho toàn bộ snapshot PDF. Public mở export sẽ đọc lại nguồn và cấu hình. Khi một field nguồn thay đổi, rewrite cũ của field đó không còn được dùng; văn bản hiện tại được khôi phục. Admin báo số rewrite bị relink. Draft local và cấu hình public tách riêng; Save Draft không publish.

Snapshot version 2 không tiếp tục cung cấp câu chữ cũ cho public. File `cv/CV_TranTanPhat_SeniorQA.html` được giữ như bản lưu trữ. Draft cũ không có thông tin nguồn của rewrite sẽ được relink khi mở, tránh đưa nội dung không biết còn đúng hay không vào CV mới.

Public có thể chọn bản owner đã cấu hình hoặc bản đầy đủ hiện tại, xem chính PDF sẽ tải và chọn giới hạn trang. Khi chưa có cấu hình version 3, bản public dùng dữ liệu hiện tại đầy đủ; owner chọn/publish preset ứng tuyển để public có bản 2 trang mặc định. Không ghi Firebase tự động chỉ vì một người mở preview. Offline theo cơ chế cache/pending sẵn có; người khác chỉ nhận nội dung sau khi đồng bộ.

## AI và kiểm tra chất lượng

Review và Optimize nhận toàn bộ field CV đang chọn, page budget, **số trang đo từ PDF** và job description tùy chọn. Review kiểm tra bố cục, chronology, từ khóa liên quan và thiếu bằng chứng. Optimize chỉ đề xuất rewrite theo key, không tự xóa field, đổi employer/date/technology/metric hay ghi vào portfolio. Owner chọn từng đề xuất rồi PDF được tạo lại để kiểm tra trang.

AI cần cấu hình kết nối thành công trong Admin Config. Không có API key thì vẫn dùng được review về độ dài, thiếu email/experience/dates, format và overflow. AI không thể chứng minh một thành tích là thật hay bảo đảm mọi ATS đều đọc giống nhau. Độ chính xác của kinh nghiệm và các tỷ lệ thành tích vẫn cần chủ CV xác minh.

Điểm nội dung thực tế cần kiểm tra: các title ISTQB có issuer Udemy. Cần phân biệt chứng nhận hoàn thành khóa học với chứng chỉ ISTQB chính thức. Hệ thống hiển thị cảnh báo review; không tự sửa tên chứng chỉ hoặc bịa credential. Nội dung diễn đạt dài/lặp và câu mô tả thực tập dạng “I had the opportunity…” cũng nên được rút gọn qua AI và owner duyệt.

## Cách sử dụng

1. Admin → Export CV → **Use application selection** → xem PDF, kiểm tra các checkbox trong **Edit text / PDF preview**.
2. Chọn số trang, font/spacing. Có thể thêm mô tả vị trí → AI Review / AI Optimize → duyệt đề xuất.
3. **Save Draft** lưu trên máy; **Publish CV for public download** lưu cấu hình công khai gắn với dữ liệu hiện tại.
4. Nhà tuyển dụng bấm **Download CV** ở hero hoặc footer → chọn phiên bản, xem và tải PDF. **Open PDF preview** mở trực tiếp PDF nếu trình duyệt di động không hỗ trợ iframe viewer.

## Review sau triển khai

- Build Tailwind/assets và 13 unit tests về persistence, dữ liệu CV, source invalidation, lựa chọn không sửa portfolio.
- Hai bộ browser regression cũ vẫn kiểm tra Add/Edit/Delete/Layout, quyền/offline/draft, CV, AI proposal có chọn và contact transport giả lập.
- Bộ `tests/cv-upgrade.cjs`: snapshot cũ bị thay bằng nguồn mới; public update không cần publish lại; rewrite cũ bị invalidation; Admin đang mở cập nhật theo event; pending preview khóa Publish; page limit 1 không vừa khóa Download/Publish; dialog trên mobile/Escape; mẫu xuất đúng 1/2/3 trang; summary/bullet/certificate dài.
- Kiểm tra PDF bằng PyMuPDF: A4, font nhúng, body ≥10 pt, glyph trong lề, tiếng Việt, hyperlink, không trang trắng/heading section đơn độc, đủ field đã chọn, đủ phần đầu/cuối văn bản dài.
- Đã mở trực quan cả hai trang `test-results/cv-ready.pdf` và preview mobile. Bản ứng tuyển seed: **2 trang**; đọc dữ liệu Firebase hiện tại tên **Phat Tran** cũng xuất preset **2 trang, 635 từ**, không page error. Live smoke chỉ đọc và chặn Commit/Write/Auth; không sửa dữ liệu server.
- Bản đầy đủ trong các regression dài 7–10 trang; đây là lượng dữ liệu thật, không phải lỗi xuất PDF. Bản chọn lọc để ứng tuyển vẫn có bản đầy đủ song song.

Chạy `npm run build`, `npm test`, `npm run test:browser`, rồi `npm run test:pdf` khi local server đang chạy. Live smoke tùy chọn: `node tools/cv-live-readonly.cjs`. PDF test cần PyMuPDF. Test AI dùng response giả lập, không gọi dịch vụ trả phí; không gửi email thật. Chưa deploy hosting, chưa publish cấu hình vào Firebase production và chưa kiểm tra bằng tài khoản ATS cụ thể.
