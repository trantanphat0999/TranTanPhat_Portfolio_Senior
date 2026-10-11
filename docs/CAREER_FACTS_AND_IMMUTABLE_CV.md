# Career facts và PDF official bất biến

Ngày triển khai/review local: 11/10/2026. Phạm vi: hai hạng mục được chọn từ roadmap — dữ liệu nghề nghiệp có cấu trúc/bằng chứng và release PDF bất biến. Không thay thế các hạng mục CI, monitoring, AI semantic eval và budget ledger của những giai đoạn tiếp theo.

Cập nhật đợt sửa Admin tiếp theo: Firestore rules đã được deploy lên production để sửa quyền private; Storage bucket chưa được tạo. Xem [báo cáo quyền và giao diện CV Studio](ADMIN_PERMISSIONS_AND_CV_STUDIO_FIX.md). Các ghi chú chưa deploy ở phần bên dưới là trạng thái của đợt triển khai ban đầu.

## Cách sử dụng

1. Vào Admin → Content → **Facts & evidence** → **Import portfolio as a draft**. Migration preview không ghi Firebase. Các records mới đều là `unverified`; text gốc và evidence được giữ lại để đối chiếu.
2. Review Experience, Projects, Claims, Measurements, Skills, Credentials và Source evidence. Điền facts biết chắc; để trống ngày/baseline/context chưa biết. `officialTitle` là chức danh thực tế, `displayTitle` dùng để lưu tên trình bày riêng. Ngày hỗ trợ YYYY, YYYY-MM và YYYY-MM-DD, không tự thêm tháng/ngày.
3. Chọn evidence rồi xác nhận facts bằng `owner_confirmed`. `externally_verified` yêu cầu evidence thuộc issuer record, benchmark report hoặc project document có URL và ngày xác minh. AI không tự xác minh records.
4. **Save private facts** lưu riêng tại `admin/career-data`. **Save & persist source IDs** lưu facts và IDs trong một transaction: source revision/text phải còn khớp bản import. Public wording, CV official và variants không bị migration sửa. Bản source/facts trước migration được lưu riêng tại `admin/career-migration-backup`; nút tải backup cho phép giữ bản sao trước khi thao tác tiếp. Backup này chỉ giữ lần migration gần nhất; tải về nếu cần lưu lâu dài.
5. Vào CV Studio → **Refresh source content**. Wording CV cũ được giữ bằng overrides; dùng Reset/khôi phục từng field để nhận wording đã xác nhận. AI review/optimize/plan nhận typed values và verification status; không nhận raw evidence excerpts, legacy text hoặc career identity profile từ library. Các context/JD do owner chọn vẫn theo luồng AI hiện có.
6. Chọn Senior QA preset, review nội dung và PDF rồi **Save official CV**. Luồng mới kiểm tra facts, PDF text/bounds/typography, upload file, đọc lại để kiểm tra hash, sau đó mới kích hoạt release. Đổi facts hoặc official revision trong lúc upload sẽ làm activation thất bại và giữ official cũ.
7. **Official releases** cho phép tải lại một bản cũ hoặc **Activate this release**. Rollback tải và xác minh PDF gốc, tăng revision của pointer, giữ nguyên release history. Undo trong editor chỉ khôi phục draft, không rollback public pointer.

## Mô hình dữ liệu và tính chính xác

| Record | Fields chính |
|---|---|
| Profile | legalName, displayName, targetRoles, timezone |
| Experience | employer, officialTitle, displayTitle, startDate/endDate, isCurrent, employmentType, promotionHistory, contribution |
| Project | title, experienceId, domain, role, ownership, teamSize, dates, technologyIds, claimIds, confidentiality |
| Claim | statement, claimType, scope, contribution, metricIds |
| Metric | value, comparisonOperator, unit, baseline, comparisonValue, measurementPeriod, environment, workload, method, statistic, limitations |
| Skill | canonicalName, aliases, category, lastUsedAt, practicalExperience, projectIds |
| Credential | kind, title, issuer, issuedAt, expiresAt, credentialId, verificationUrl |
| Evidence | kind, reference, excerpt, contentHash, owner, verifiedAt, retentionPolicy |

Mỗi record có persistent ID, source keys/group/signature, legacy text, verification status, evidence references và review metadata. Khi source đổi, record chuyển `needs_review` và có thêm evidence; typed values đã review được giữ để owner quyết định cập nhật. Migration lặp lại không nhân bản records. Persist source IDs trước khi reorder/edit lớn.

Ví dụ `200,000+ records within 2 seconds` được lưu thành hai measurements: records/value 200000/operator gte và seconds/value 2/operator lte. Workload, concurrency, percentile và environment không được suy ra từ con số này. Claim và measurements đều cần review; đổi `records` thành `users` hoặc đổi giá trị trong wording sẽ bị gate chặn. Đây là các kiểm tra facts có giới hạn; chúng không chứng minh mọi quan hệ ngữ nghĩa của một câu AI viết lại. Semantic eval/verifier trong roadmap vẫn là hạng mục riêng.

Credential từ đúng hostname Udemy được import thành `course_completion`, vẫn unverified. Các issuer khác bắt đầu `unknown`; không đoán đây là chứng chỉ chính thức. Course completion phải được ghi đúng nhãn trong CV, và credentials hết hạn/không rõ loại bị chặn. Ngày hết hạn dạng năm/tháng dùng ngày cuối khoảng để tránh kết luận hết hạn quá sớm. Project confidential không được đưa vào release mới trước khi owner review classification hoặc loại khỏi CV.

Facts/evidence nằm trong collection private; public release chỉ chứa selected wording và render metadata. `visibility` của record không tự publish library. Public CV là hành động publish rõ ràng của owner; review các field đã chọn trước khi lưu. Device drafts/private backup có dữ liệu riêng tư: chỉ dùng trên thiết bị tin cậy và không commit chúng vào repo.

## Release và khả năng tái lập

| Vị trí | Nội dung/quyền |
|---|---|
| Storage `cv-artifacts/{sha256}.pdf` | Public get; owner create; không update/delete; tối đa 10 MiB |
| Firestore `cv-releases/{uuid}` | Immutable selected snapshot, artifact hash/bytes/URL, page count, build fingerprints; chỉ owner đọc history |
| `portfolio/cv` | Public current pointer và selected snapshot; revision tăng mỗi publish/rollback |
| `cv-release-events/{uuid}` | Private immutable actor/action/revision/time; fact revision cho publish |
| IndexedDB `portfolio.cvArtifacts.v1` | Cache PDF đã kiểm tra hash trên thiết bị; dùng lại khi offline nếu đã tải |

SHA-256 bao phủ nguyên bytes PDF. Build metadata ghi hash renderer source, pdfmake và bốn font files thực tế. Public download với `releaseVersion:1` lấy đúng bytes đã lưu, không gọi renderer. Nâng vendor/font hoặc renderer version không làm đổi PDF official. Descriptor, size và hash được kiểm tra trước khi tải xuống. Metadata/frozen PDF đã cache giúp khách từng tải tiếp tục dùng khi offline; khách mới vẫn cần Firebase/Storage khả dụng.

Upload nằm ngoài transaction; activation dùng compare-and-set với CV revision và facts revision. Upload thành công nhưng activation thất bại có thể để lại file chưa được tham chiếu. Không tự xóa các artifact này vì rules bảo vệ tính bất biến; kiểm kê/retention bởi vận hành là bước sau. History UI tải 50 release gần nhất, các bản cũ vẫn được giữ trong collection.

Reader giữ tương thích legacy CV v3/v4 renderer 1/2. Legacy official hiện có vẫn render theo snapshot cũ cho đến khi owner publish lần đầu bằng luồng mới. Sau khi frozen release được kích hoạt, legacy write paths và Firestore rules chặn thay nó bằng snapshot có thể render lại. Rollback kích hoạt bản đã publish, không chạy lại editorial preset hoặc AI.

## Chuẩn bị production

Code đã triển khai và kiểm tra local; session này không deploy rules, đổi CORS hoặc publish facts/release lên Firebase thật. Để dùng upload/history trên production:

1. Xác nhận bucket `portfolio-project-9770e.appspot.com` trong `js/firebase-config.js` tồn tại, có thể sử dụng và owner account có quyền quản trị dự án.
2. Deploy `firestore.rules` và `storage.rules` bằng cấu hình `firebase.json`: `firebase deploy --only firestore:rules,storage --project portfolio-project-9770e`. Kiểm tra đúng project trước khi thực thi.
3. Thiết lập Storage CORS cho origin portfolio và origin local thực tế, method GET, response headers Content-Type/Content-Length. Chép `storage.cors.example.json`, thay domain placeholder rồi dùng `gcloud storage buckets update gs://portfolio-project-9770e.appspot.com --cors-file=<file đã chỉnh>`.
4. Deploy static source bằng quy trình hosting hiện có. Owner import/review facts và publish CV từ Admin. Tải CV ở một profile visitor mới; đối chiếu hash với descriptor, kiểm tra history và thử rollback một release thử nghiệm.

API `getBytes`/download SDK cần CORS trên bucket. Tham khảo [Firebase download files](https://firebase.google.com/docs/storage/web/download-files) và [Firebase Security Rules tests](https://firebase.google.com/docs/rules/unit-tests). Không dùng wildcard CORS thay cho việc xác nhận origin của deployment.

## Kiểm tra đã chạy

Kết quả cuối: 62 unit/integration tests pass; đủ 10 browser suites pass; Firebase Firestore/Storage Emulator allow/deny suite pass; toàn bộ PDF checks và asset build pass. Production dependency audit: 0 vulnerabilities. Đã xem trực quan hai trang của CV reviewed; tests độc lập xác nhận frozen PDF Admin/public bằng nhau từng byte.

- Unit/integration: migration repeat/reorder/change detection, references/status/date precision, private AI projection, typed CV rendering, course/metric gates, atomic migration conflict, legacy frozen-write rejection, facts/CV revision race, upload/integrity failure và exact-byte rollback.
- Browser: private Facts editor/migration, owner-confirmed CV fields, upload failure giữ pointer, immutable history/rollback, Admin/public cùng SHA-256, renderer bị chặn/unknown version vẫn tải PDF, offline cached bytes và corruption rejection.
- Firebase Emulator: private facts deny anonymous/other account; public official read; immutable release/events và pointer revision; Storage owner-only create, anonymous get, deny list/overwrite/delete/invalid uploads.
- Các suites portfolio/Admin/AI/CV hiện có, PDF extraction/font/link/bounds checks và production asset build.

Lệnh: `npm test`, `npm run test:browser` (local server port 5173 đang chạy), `npm run test:pdf`, `npm run build`. Rules: `npm run test:rules` với Firebase CLI và Java >=21. `firebase.emulators.json` chỉ chạy demo project `demo-career-cv`, không chạm dữ liệu production. Windows session đã dùng Java 21 portable tại `.cache/java21`; thư mục này được gitignore.

Giới hạn hiện tại: library còn là một Firestore document có size guard; chưa có lịch sử bất biến đầy đủ cho từng fact, expiry scheduler, AI semantic eval hoặc monitoring production. Các chức năng đó thuộc các phần sau của roadmap; không dùng status owner-confirmed thay cho chứng minh độc lập.
