# Template slide “Ban ngày”

Template dùng lại cho các bài giảng sau: nền sáng, giọng văn kiểu 3Blue1Brown, chữ đủ lớn cho máy chiếu.
Bài đầu tiên dùng template này: `number-theory/lesson/src/so-hoc-buoi-1.html`.

## Các file

| File | Vai trò |
|---|---|
| `ban-ngay.css` | Giao diện: màu, cỡ chữ, hộp, chứng minh, code, câu hỏi, đồng hồ |
| `ban-ngay.js` | Bộ máy trình chiếu: từng bước, phím tắt, cửa sổ giáo viên, tổng quan, tự đo, in PDF; các hình chung `code`, `quiz`, `timer` |
| `build.py` | Gộp nguồn thành một file HTML, và sinh file ghi chú giáo viên |

## Làm bài mới

1. Copy `number-theory/lesson/src/so-hoc-buoi-1.html` làm khung. Giữ phần `<head>`, `deck-config` và các `<script>` cuối, rồi thay các `<section class="slide">`.
2. Mỗi slide: `<section class="slide" data-ch="2" data-min="3" data-title="…">`. Thêm `data-optional` cho slide tùy chọn. Ghi chú giáo viên đặt trong `<aside class="notes">`.
3. Từng bước:
   - `data-s="k"`: hiện từ bước k.
   - `data-hide="k"`: ẩn từ bước k. Dùng trong `<div class="swap">` để thay nội dung tại chỗ.
   - `data-at="k,l"`: tô sáng ở bước k và l.
4. Hình chung:
   - Code: `<pre class="code" data-widget="code" data-hl="1:1-5 2:3">` (dạng `bước:dòng`).
   - Câu hỏi: `<div class="quiz" data-widget="quiz" data-key="C">`, mỗi phương án là một `button.opt`, giải thích từng lỗi đặt trong `<template data-for="A">`.
   - Đồng hồ: `<div class="timer" data-widget="timer" data-sec="360">`.
   - Hình riêng của từng bài viết vào file widgets của bài đó (xem `so-hoc-widgets.js`).
5. Build: `python build.py src/bai.html --out bai.html --notes ghi-chu-giao-vien.html`
6. Mở file ra, bấm **A** để tự đo. Yêu cầu: mọi slide đạt ở **mọi bước**, chữ ≥ 2,4% chiều rộng slide, không có chỗ tràn khung.

## Chuẩn bắt buộc (rút từ plan bài số học)

- **Cỡ chữ** (% chiều rộng slide): tiêu đề 4,4 · thân bài, dòng chứng minh 3,2 · công thức 3,6 · nhãn trong hình 2,6–3,2 · tối thiểu 2,4. Số mũ tự có sàn 2,4.
- **Một ý mỗi slide.** Hình không quá khoảng 20 từ. Chứng minh tối đa 5 dòng, mỗi dòng không quá 46 ký tự. Code tối đa khoảng 7 dòng, không dùng ligature.
- **Giọng văn:** tiêu đề là câu hỏi; đi từ ví dụ → quan sát → lập luận → rồi mới nêu tên; nói rõ điều kiện và chỗ thừa nhận; xưng “ta”; không emoji.
- **Chứng minh:** câu hỏi ở tiêu đề → các dòng đánh số → ∎. Giáo viên hỏi “vì sao dòng này đúng?” trước khi hiện dòng kế.
- **Câu hỏi bản lề:** 4 phương án, mỗi phương án sai ứng với một lỗi thật.
- **Màu:** chữ tương phản ≥ 4,5:1 (thân bài ≥ 7:1). Màu không bao giờ là cách phân biệt duy nhất.
- **Số liệu:** mọi con số trên slide phải được kiểm bằng script, không tính tay.

## Phím khi trình chiếu

→ / ← từng bước · ↓ / ↑ cả slide · 1–9 nhảy chương · Esc tổng quan · S cửa sổ giáo viên · F toàn màn hình · B màn đen · O slide tùy chọn · T đồng hồ · A tự đo · ? trợ giúp

## Font và chạy offline

Mặc định font tải từ Google Fonts và cdnjs (KaTeX). Khi mất mạng, slide vẫn chạy với font có sẵn của máy (Cambria, Consolas). Muốn có đúng font khi offline: đặt các file `.woff2` cùng một `fonts.json` vào một thư mục, rồi build với `--fonts <thư mục>`.
