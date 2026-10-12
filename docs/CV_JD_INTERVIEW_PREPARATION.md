# CV Studio: chuẩn bị ứng tuyển theo JD

## Phân tích nhu cầu

Luồng cũ có phân tích JD và đề xuất viết lại CV riêng lẻ, nhưng thiếu một bộ kết quả liên kết keyword, bằng chứng kinh nghiệm và câu hỏi phỏng vấn. Người dùng phải tự tổng hợp, không thể lưu tiến độ ôn tập và dễ áp dụng đề xuất đã cũ khi JD hoặc CV thay đổi.

Luồng mới nằm trong **CV Studio → AI assist**. Dán JD, chọn tiếng Việt hoặc English và tối đa 8, 12 hoặc 16 câu hỏi, rồi chọn **Phân tích JD, optimize CV & tạo phỏng vấn**. Chỉ gửi yêu cầu khi người dùng bấm nút. Cần cấu hình và kiểm tra kết nối AI tại Settings trước.

## Ba phần kết quả

1. **Keyword & khoảng thiếu:** keyword trích từ JD, yêu cầu bắt buộc/ưu tiên, mức độ có bằng chứng/thiếu/chưa rõ, dữ kiện tham khảo và kế hoạch ôn tập. Không đưa điểm ATS giả lập.
2. **Optimize CV:** so sánh wording trước/sau theo từng field, lý do và keyword liên quan. Chọn đề xuất, xem PDF đã đo số trang và kiểm tra nội dung, sau đó mới áp dụng. Chỉ cập nhật CV draft; có Undo và vẫn cần quy trình review/publication để thay official CV.
3. **Phỏng vấn thử:** câu hỏi liên kết với keyword của JD; câu trả lời tham khảo, ý chính dễ nhớ, câu hỏi đào sâu và bằng chứng. Có bộ lọc theo nhóm/keyword, chế độ ẩn đáp án để tự luyện, đánh dấu đã ôn và tải Markdown để đọc nhanh.

Báo cáo dùng màn hình đầy đủ, có cuộn nội dung và giao diện một cột trên điện thoại. Điều khiển tab bằng bàn phím, Escape để đóng và focus quay về CV Studio.

## Dữ liệu và tính trung thực

- AI nhận JD, nội dung CV đang chọn, dữ kiện portfolio, career facts và context riêng tư được chọn qua dịch vụ AI hiện có.
- Task `jd-preparation` trả JSON theo schema có keyword, suggestions, questions và studyPlan. Provider OpenAI/custom được cấp ngân sách đầu ra 16.000 token cho task này; Claude CLI dùng adapter hiện có.
- Validator kiểm tra keyword thực sự nằm trong JD, ID duy nhất, liên kết keyword/source hợp lệ và giới hạn số lượng. Đề xuất chỉ sửa summary, paragraph, bullet hoặc skills; thông tin định danh và dữ kiện gốc không được tự thay.
- Đề xuất thiếu căn cứ hoặc thêm số liệu/chứng chỉ/công nghệ ngoài nguồn được loại và hiển thị lý do. Câu trả lời về kinh nghiệm phải có nguồn và vượt kiểm tra cùng loại. Câu trả lời tình huống được gắn nhãn giả định và yêu cầu cá nhân hóa.
- Các kiểm tra xác định được lỗi cấu trúc, nguồn và một số claim; chúng không chứng minh toàn bộ văn bản AI đúng sự thật. Người dùng cần review câu trả lời và ví dụ cá nhân trước khi sử dụng. Đây là câu hỏi luyện tập, không phải bộ câu hỏi chính thức của nhà tuyển dụng.

## Lưu trữ và kết quả cũ

Bộ chuẩn bị và tiến độ ôn tập được lưu cùng private CV draft hoặc private variant, gồm JD nguồn, bằng chứng, cấu hình, timestamp và fingerprint. Nút lưu cho biết đã đồng bộ cloud hay chỉ lưu trên thiết bị. Các trường này không đi vào snapshot/PDF CV công khai. Xuất Markdown bao gồm JD và dữ kiện riêng tư, phù hợp để người dùng tự ôn tập.

Binding SHA-256 theo JD, CV, nguồn, layout, context và career revision phát hiện thay đổi. Thay đổi portfolio, career facts, context hoặc AI settings đánh dấu kết quả cũ. Trước preview/apply, hệ thống kiểm tra lại cấu hình AI, revision và hash nguồn mới nhất. Bộ cũ vẫn đọc/xuất được, nhưng không được áp dụng khi kiểm tra freshness thất bại. Thay đổi tiến độ ôn không làm bộ chuẩn bị cũ đi.

Lỗi provider, kết quả không hợp lệ, hủy yêu cầu hoặc sửa JD/CV trong lúc AI xử lý giữ nguyên draft và bộ chuẩn bị trước đó. Đổi lựa chọn đề xuất bắt buộc xem PDF lại trước khi áp dụng.

## Các phần triển khai

- `js/ai/tasks.js`: schema và prompt chuẩn bị JD.
- `js/cv/jd-preparation.js`: validation, binding, khôi phục và Markdown export.
- `js/admin/jd-preparation-ui.js`: báo cáo, review PDF và ôn tập.
- `js/admin/cv-tools.js`: gọi AI, kiểm tra freshness, lưu draft và apply/Undo.
- `js/cv/proposal.js`: dùng chung evidence validation cho CV và câu trả lời.

## Kiểm chứng

`npm test` chạy 82 unit tests, bao gồm 9 tests mới về JD, nguồn bằng chứng, schema, giới hạn, binding, phục hồi và export. `npm run test:jd` chạy unit tests và browser scenario từ nhập JD đến preview/apply/Undo, study/filter/export, lỗi AI, stale/cancel, save/restore, đổi provider, mobile và logout. Build cùng các browser regression Admin workspace, CV configuration và CV usability đã chạy thành công.

Browser tests dùng Firebase và phản hồi provider giả lập, gọi qua dịch vụ AI thực của ứng dụng. Chưa xác minh chất lượng câu trả lời của model trên tài khoản AI thật hoặc đồng bộ Firebase production; cần credentials/configuration hiện có để sử dụng. Không phát hành lên hosting trong thay đổi này.
