# Research: clone game đoán bài hát (kiểu songtrivia.io) cho nhạc Việt

Thời điểm research: 2026-11-11 17:10 (Asia/Bangkok). Các số liệu "đã test" là kết quả gọi API thật trong phiên này.

## Kết luận

Làm được, và đơn giản. Một bản tối giản (tạo phòng, phát nhạc, 4 đáp án, tính điểm theo tốc độ) là việc của khoảng một cuối tuần.

Nguồn nhạc nên dùng là **preview 30 giây của iTunes Search API (storefront `vn`)**, không phải YouTube. Kho nhạc Việt của iTunes đầy đủ, tên có dấu chuẩn, không cần API key, và phát bằng thẻ `<audio>` thường.

Giả định "chơi nội bộ nên không cần lo copyright" chỉ đúng về rủi ro thực tế. Về quy định thì nó sai. Chi tiết ở mục 3.

## 1. So sánh nguồn nhạc

| Nguồn | Nhạc Việt | Độ khó tích hợp | Vấn đề chính |
|---|---|---|---|
| iTunes Search API (`country=vn`) | Tốt. Test 6 nghệ sĩ, mỗi nghệ sĩ 50/50 bài có preview | Thấp: `<audio src=previewUrl>` | Giới hạn khoảng 20 request/phút. Điều khoản chỉ cho dùng preview để quảng bá |
| Deezer API | Trung bình, không ổn định | Thấp | Thiếu preview, tên không dấu, URL hết hạn |
| YouTube IFrame | Đầy đủ nhất | Cao | Video lộ đáp án, che player là vi phạm điều khoản, khó đồng bộ |
| Spotify | Có | Không dùng được | `preview_url` bị gỡ với app tạo sau 2024-11-27 |

### iTunes (khuyến nghị)

Đã test với Sơn Tùng M-TP, Đen, Hoàng Thùy Linh, Mỹ Tâm, HIEUTHUHAI, Vũ.: mỗi truy vấn trả 50 bài, cả 50 đều có `previewUrl`. Tên bài và nghệ sĩ có dấu tiếng Việt đúng. API trả `access-control-allow-origin: *`, file preview là `.m4a` trên CDN của Apple.

Hạn chế:

- Apple ghi giới hạn "khoảng 20 calls mỗi phút". Cách xử lý là không search lúc đang chơi: tạo sẵn danh sách bài một lần, lưu vào `songs.json`.
- Preview là đoạn 30 giây cố định do Apple chọn, thường là điệp khúc. Bạn không chọn được đoạn phát.
- Một bài có nhiều phiên bản (Live, Remix, feat.). Cần lọc trùng khi tạo danh sách.

### Deezer

Search bằng tên thường hoạt động (25/25 bài có preview cho "Son Tung M-TP", "Hoang Thuy Linh", "HIEUTHUHAI"). Nhưng có ba vấn đề đã thấy khi test:

- Một playlist V-pop 171 bài chỉ có 56 bài có preview.
- Tên nghệ sĩ lưu không dấu ("Son Tung M-TP"), và cú pháp `artist:"..."` có dấu trả 0 kết quả.
- URL preview có tham số `exp=` nên hết hạn, không lưu lâu được. API cũng không trả header `access-control-allow-origin`, nên trình duyệt phải gọi qua JSONP hoặc qua server.

Deezer chỉ nên là nguồn dự phòng.

### YouTube

Năm MV V-pop đã test (Sơn Tùng M-TP, Đen) đều cho phép nhúng, nên về kỹ thuật là phát được. Tuy vậy, YouTube là lựa chọn tệ cho game này:

- Player hiện tiêu đề và hình video, tức là lộ đáp án. Muốn giấu thì phải che hoặc ẩn player.
- Điều khoản YouTube yêu cầu player tối thiểu 200x200 px. Điều khoản cấm đặt lớp phủ che player. Điều khoản cũng cấm tự phát khi player chưa hiển thị quá nửa. Một game "chỉ nghe tiếng" vi phạm cả ba.
- MV thường có đoạn dạo đầu hoặc thoại, phải tự ghi thời điểm bắt đầu cho từng bài.
- Có thể dính quảng cáo, thời gian buffer khác nhau giữa người chơi, và một số video chặn nhúng.

## 2. Kiến trúc đề xuất

```
Trình duyệt (HTML + JS thuần hoặc React)
      │  WebSocket
      ▼
Một server Node (Express + Socket.IO)
  - phòng chơi lưu trong RAM (Map theo mã phòng)
  - songs.json: { trackId, title, artist }
  - đầu ván: gọi iTunes lookup lấy previewUrl mới
      │
      ▼
CDN Apple: trình duyệt tải thẳng file preview
```

Luồng một câu hỏi:

1. Server chọn bài và tạo 4 đáp án. Ba đáp án sai lấy từ cùng danh sách.
2. Server gửi `previewUrl` và mốc thời gian bắt đầu cho cả phòng.
3. Client phát nhạc và gửi đáp án.
4. Server chấm điểm theo tốc độ rồi gửi bảng xếp hạng.

Không cần database, không cần đăng nhập. Người chơi nhập tên và mã phòng.

Deploy: một service Node duy nhất trên Render hoặc Railway. Gói miễn phí của Render ngủ khi không dùng, lần đầu mở mất khoảng một phút, chấp nhận được cho nhóm bạn. Phương án khác là PartyKit trên Cloudflare, nhưng hạn mức miễn phí hiện tại tôi chưa xác minh được.

Ba điểm kỹ thuật cần biết trước:

- Trình duyệt chặn tự phát âm thanh. Mỗi người chơi phải bấm một nút (ví dụ "Sẵn sàng") trước ván để mở khóa audio. Safari trên iOS khắt khe nhất.
- Đồng bộ: server gửi mốc thời gian bắt đầu, client tải trước file rồi mới phát. Lệch vài trăm mili giây là bình thường, đủ dùng cho nhóm bạn.
- Việc tốn công nhất không phải code mà là tạo danh sách bài: viết một script search theo nghệ sĩ, lọc trùng, rồi xem lại bằng mắt.

Repo mã nguồn mở để tham khảo cấu trúc phòng chơi: `lpinca/binb`, `mauricesvay/blindtest`. Phần lớn repo tương tự dùng Spotify nên phần nguồn nhạc của chúng đã hỏng.

## 3. Bản quyền và điều khoản

"Nội bộ, không thu tiền" không phải là ngoại lệ pháp lý. Nó cũng không làm bạn tuân thủ điều khoản của nhà cung cấp.

- Điều khoản Apple ghi preview chỉ dùng "to promote store content and not for entertainment purposes", phải đặt gần store badge. Một game đố vui vi phạm điều này.
- Điều khoản YouTube cấm che hoặc ẩn player như đã nêu.

Rủi ro thực tế thì rất thấp, vì bạn không lưu, không sao chép và không phân phối file nhạc. Âm thanh vẫn phát từ CDN của Apple. Với một nhóm bạn dùng link riêng, hậu quả xấu nhất có khả năng xảy ra là bị giới hạn request hoặc chặn IP.

Rủi ro tăng lên rõ rệt nếu bạn công khai trang, gắn quảng cáo, thu tiền, hoặc tải file nhạc về server. Nếu giữ app ở mức link riêng cho bạn bè thì cứ làm.

## 4. Bước tiếp theo

1. Viết script tạo `songs.json` từ iTunes Search (`country=vn`, theo danh sách nghệ sĩ), lọc trùng phiên bản. Mục tiêu 200 đến 300 bài.
2. Dựng server Node + Socket.IO: tạo phòng, vào phòng, vòng lặp câu hỏi, chấm điểm.
3. Dựng client một trang: sảnh chờ, màn câu hỏi, bảng điểm.
4. Deploy lên Render, test với 2 đến 3 thiết bị, có ít nhất một iPhone.

## Câu hỏi chưa giải quyết

- songtrivia.io lấy nhạc từ đâu: trang không công bố, tôi không xác định được.
- iTunes `lookup` theo lô nhiều `trackId` trong một request: Apple có ghi trong tài liệu, nhưng lệnh test của tôi bị timeout trước khi chạy tới, nên chưa kiểm chứng.
- `previewUrl` của iTunes ổn định bao lâu: chưa có nguồn chính thức. Vì vậy thiết kế trên lấy URL mới ở đầu mỗi ván thay vì lưu cứng.
- Hạn mức miễn phí của Cloudflare Durable Objects và PartyKit năm 2026: các nguồn tìm được mâu thuẫn nhau.

## Nguồn

- [Apple: iTunes Search API, điều khoản và giới hạn](https://performance-partners.apple.com/search-api)
- [Apple: Constructing Searches](https://developer.apple.com/library/archive/documentation/AudioVideo/Conceptual/iTuneSearchAPI/Searching.html)
- [YouTube API Services: Required Minimum Functionality](https://developers.google.com/youtube/terms/required-minimum-functionality)
- [Spotify community: Changes to Web API](https://community.spotify.com/t5/Spotify-for-Developers/Changes-to-Web-API/td-p/6540414/page/11)
- [Spotify community: 30s Preview Url Deprecated](https://community.spotify.com/t5/Spotify-for-Developers/30s-Preview-Url-Depriciated/td-p/6636451)
- [Deezer developer guidelines](https://developers.deezer.com/guidelines)
- [binb: game đoán bài hát nhiều người chơi](https://awesome.ecosyste.ms/projects/github.com%2Flpinca%2Fbinb)
- [blindtest](https://awesome.ecosyste.ms/projects/github.com%2Fmauricesvay%2Fblindtest)
- [songtrivia.io](https://songtrivia.io/)
