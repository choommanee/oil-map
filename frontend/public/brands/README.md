# Brand Logos

วางไฟล์โลโก้ของแต่ละแบรนด์ในโฟลเดอร์นี้

## วิธีเพิ่มโลโก้จริง

### วิธีที่ 1: วางไฟล์ในโฟลเดอร์นี้
แทนที่ไฟล์ SVG placeholder ด้วยโลโก้จริง:

| ไฟล์ | แบรนด์ |
|------|--------|
| `ptt.svg` หรือ `ptt.png` | PTT / ปตท. |
| `shell.svg` หรือ `shell.png` | Shell |
| `bangchak.svg` หรือ `bangchak.png` | Bangchak / บางจาก |
| `esso.svg` หรือ `esso.png` | Esso |
| `pt.svg` หรือ `pt.png` | PT |
| `caltex.svg` หรือ `caltex.png` | Caltex |
| `irpc.svg` หรือ `irpc.png` | IRPC |
| `fallback.svg` | ไม่ทราบแบรนด์ |

### วิธีที่ 2: ใช้ URL จาก CDN (.env.local)
สร้างไฟล์ `frontend/.env.local` และเพิ่ม:

```env
NEXT_PUBLIC_LOGO_PTT=https://cdn.example.com/ptt.png
NEXT_PUBLIC_LOGO_SHELL=https://cdn.example.com/shell.png
NEXT_PUBLIC_LOGO_BANGCHAK=https://cdn.example.com/bangchak.png
NEXT_PUBLIC_LOGO_ESSO=https://cdn.example.com/esso.png
NEXT_PUBLIC_LOGO_PT=https://cdn.example.com/pt.png
NEXT_PUBLIC_LOGO_CALTEX=https://cdn.example.com/caltex.png
NEXT_PUBLIC_LOGO_IRPC=https://cdn.example.com/irpc.png
```

## ขนาดที่แนะนำ
- ขนาด: **60×60px** หรือ **120×120px**
- พื้นหลัง: **โปร่งใส** (transparent)
- รูปแบบ: PNG หรือ SVG
