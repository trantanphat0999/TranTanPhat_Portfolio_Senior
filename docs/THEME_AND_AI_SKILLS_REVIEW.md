# Website colors và card AI — phân tích, kế hoạch, triển khai, review

## Phân tích yêu cầu

Người dùng cần chọn màu bằng bảng màu hoặc kéo thanh màu; màu phải áp dụng nhất quán cho các thành phần của hệ thống. Đổi riêng một class `primary` chưa đủ vì website đang dùng đồng thời Tailwind, CSS variables và nhiều màu cố định trong CSS/renderer/admin. Technical Skills đã có một nhóm AI nhưng skill “AI Tools - ChatGPT, Claude, Grok” vẫn nằm trong Frameworks & Tools; cần gom chúng vào một card riêng có hình minh họa.

Phạm vi màu được triển khai: portfolio công khai, card/section tùy chỉnh, heading, nút, link, form/input, navigation và các control trong admin. Màu logo/ảnh, thông báo lỗi/thành công và thiết kế PDF official cần giữ ý nghĩa riêng. Theme là cấu hình trình bày, không sửa nội dung portfolio, fact hoặc CV.

## Kế hoạch triển khai và trạng thái

| Bước | Quyết định | Kết quả |
| --- | --- | --- |
| 1. Chuẩn hóa màu | Sáu vai trò thay cho chỉnh từng field đơn lẻ | Primary, Accent, Page background, Cards & fields, Text, Borders |
| 2. Giao diện chọn | Palette + native picker + HEX + HSL | 7 palette; Hue dạng phổ màu; Saturation/Lightness có gradient theo màu đang chọn |
| 3. Preview | CSS variables, không rebuild DOM công khai | Preview cùng trình duyệt và thẻ mẫu; chưa ghi public trước Publish |
| 4. Lưu dữ liệu | Metadata public và document admin riêng | `portfolio/metadata.theme`, draft ở `admin/website-theme` |
| 5. Readability | Màu chữ/link/viền control được suy ra từ palette | Mục tiêu chữ 4.5:1, input border 3:1; có báo tỷ lệ và điều chỉnh thực tế |
| 6. AI card | Nhóm AI ở tầng trình bày, giữ dữ liệu gốc | Một card AI đầy chiều rộng, gồm skill AI từ category AI và các category khác |
| 7. Hình minh họa | Asset mới phù hợp mọi palette | PNG nền trong suốt, graphite/ivory, tải lazy |
| 8. Review | Unit, browser, desktop/mobile, ảnh chụp | Kiểm tra publish/draft/conflict/reset/profile và hồi quy các luồng cũ |

## Cách sử dụng

Vào **Settings & sync → Appearance**:

1. Chọn Graphite, Ocean, Emerald, Violet, Terracotta, Rose hoặc Midnight.
2. Chọn vai trò màu cần sửa. Dùng color picker, nhập HEX sáu ký tự hoặc kéo Hue/Saturation/Lightness.
3. Review thẻ mẫu và website qua Preview site. Trạng thái “Local preview · not published” cho biết màu chỉ đang được preview trong trình duyệt này.
4. Save private draft để giữ phương án riêng; Restore private draft để tải lại nếu profile và revision còn khớp.
5. Publish website colors để lưu cho visitor. Use published colors đọc lại cấu hình mới nhất từ hệ thống.
6. Undo phục hồi edit trước; Reset to default palette chỉ preview mặc định, cần Publish để đưa mặc định lên website.

Giá trị HEX chưa hoàn chỉnh/sai định dạng không bị áp dụng, và chặn Save/Publish cho tới khi sửa. Màu quá nhạt vẫn có thể chọn làm nền/nút; màu chữ hoặc link hiển thị được điều chỉnh để giữ khả năng đọc. Ví dụ chọn primary vàng nhạt vẫn tạo nút vàng nhưng dùng chữ tối, thay vì trắng khó đọc. Chữ trên nền trang và chữ trên nền card được tính riêng, nên cấu hình trang đen/card trắng vẫn đọc được.

## Lưu trữ và bảo vệ dữ liệu

- Theme dùng schema version 1 và chỉ nhận sáu mã HEX hợp lệ. Không nhận CSS tùy ý, URL, `var()` hoặc markup.
- Publish là write owner-only, online và có revision check; không đẩy preview vào pending public queue khi offline. Nếu metadata có pending write, phải xử lý queue trước.
- Ghi theme merge vào metadata hiện có, giữ `activeProfileId`, thông tin cập nhật và các thuộc tính khác. Official CV và artifact PDF không bị ghi lại.
- Draft private lưu theme, base revision và profile ID; draft của profile cũ không được tự áp vào profile mới.
- Save giữ thêm bản nháp trên thiết bị theo owner ID. Khi offline hoặc private sync lỗi, giao diện báo rõ đã lưu trên thiết bị; Restore chọn bản mới hơn giữa device/cloud rồi kiểm tra profile/revision. Preview không bị đẩy lên public queue.
- Profile activation tải palette thuộc metadata của profile đó. Snapshot/backup hiện có giữ theme cùng metadata; không thêm collection public hoặc đổi quyền Firestore.
- Logout khôi phục palette đã publish và dọn editor. Bản preview chưa publish có cảnh báo beforeunload để tránh bỏ quên edit.
- Metadata thiếu/không hợp lệ dùng default palette. Không lưu màu vào CSS được sinh từ input không kiểm tra.

## Technical Skills và hình minh họa

Card AI nằm riêng ở đầu Technical Skills, chiếm đầy chiều rộng; các nhóm Testing, Automation, Programming, Frameworks nằm bên dưới. Card gồm nhóm AI hiện có và skill ChatGPT/Claude/Grok được đưa ra khỏi Frameworks ở tầng trình bày. API Testing và n8n độc lập vẫn ở nhóm của chúng, không bị nhầm thành AI.

Việc nhóm lại không mutate dữ liệu lưu trữ, không đổi ID, không bỏ skill hoặc thay key CV. Admin vẫn chỉnh dữ liệu source hiện có; renderer gom chúng vào card AI. Profile không có skill AI không được thêm card hoặc hình AI. HTML fallback không cần JavaScript cũng có card riêng và không lặp skill AI trong Frameworks.

Desktop dùng grid ba cột trong card; tablet hai cột, mobile một cột. Hình có width/height cố định để giảm dịch chuyển bố cục, `loading="lazy"`, `decoding="async"` và alt mô tả. PNG source khoảng 1.9 MB được lưu trong repo để có chất lượng gốc; tải lazy tránh đưa ảnh vào đường tải đầu tiên của hero. Màu graphite/ivory trung tính giúp hình dùng được với palette sáng hoặc tối, không recolor hoặc làm sai logo của tool.

Asset: `image/ai-skills-studio.png`. Tạo bằng **imagegen built-in**, không dùng fallback CLI/API. Prompt cuối cùng:

> Create a polished website illustration asset for a Senior QA engineer portfolio's dedicated AI skills card. Transparent background. Landscape composition roughly 3:2, a compact elegant isometric cluster centered with comfortable transparent margins: a graphite and ivory neural processor linked by fine silver paths to a checklist document, a small verification shield, and three abstract workflow nodes. Visual meaning: AI agent workflows, shared knowledge and verified test analysis. Premium editorial 3D paper-and-ceramic aesthetic, soft natural shadows, precise geometry, restrained monochrome charcoal, silver and ivory palette that works with any website accent color. No lettering, words, logos, numbers, humans, robot faces, gradients filling the background, or glowing neon. All objects fully visible, no cropped edges. This is an illustration asset, not a UI screenshot or mockup.

## Review sau triển khai

Các vấn đề tìm thấy và sửa trong vòng review:

- CSS cũ ghi đè nút preview primary bằng màu nền nhạt: thêm rule đúng scope và test computed background thực tế.
- Icon sidebar được chọn dùng cùng màu với nút, khó nhìn: dùng màu chữ của primary action.
- Màu category/tool cố định ghi đè primary mới: nối `skill-*`/`mini-*` tokens vào theme, giữ màu của brand image.
- Chữ trên nền trang có thể dùng nhầm màu tính cho nền card: tách page ink và surface ink, kiểm tra trang đen/card trắng.
- Nền tint có thể làm link giảm tương phản: kiểm tra đồng thời surface và tint khi suy ra màu chữ/link.
- Nút Use published colors ban đầu chỉ dùng snapshot cũ: đổi sang đọc metadata mới nhất để phục hồi sau conflict.
- Gợi ý lưu draft khi offline phải thực hiện được: bổ sung device draft và test `navigator.onLine=false`, thay vì chỉ dựa vào document admin cần online.
- Form public, control admin và content editor CV có CSS riêng: bổ sung scope cụ thể; PDF canvas vẫn giữ rendering riêng.
- AI card phải tồn tại cả khi JS chưa chạy: cập nhật fallback HTML cùng renderer.

Kiểm thử:

- `npm run build` thành công; Tailwind primary/accent dùng RGB CSS variables, bao gồm utility có opacity.
- `npm test`: 92 tests, gồm schema/contrast/HSL/grouping và actual Firebase write-path test cho theme.
- `node tests/theme-browser.cjs`: palette, picker, HEX/HSL, draft, offline/conflict, publish/reload/reset, metadata preservation, CV unchanged, profile switch, draft mismatch, static fallback, image loading, desktop/mobile và computed colors.
- Hồi quy: icons-browser, admin-design-review, custom-sections-browser, admin-cv-usability, profile-import-browser, motion-browser và admin-workspace.
- Ảnh review: `test-results/theme-studio-desktop.png`, `theme-studio-midnight.png`, `theme-studio-mobile.png`, `theme-ai-skills-emerald.png`, `theme-ai-skills-midnight-mobile.png`.

Browser tests sử dụng Firebase fixtures để không publish dữ liệu thật. Các actual write-path tests sử dụng transaction stub và kiểm tra revision, metadata và CV preservation. Chưa deploy hoặc thay theme trên Firebase production trong đợt này.
