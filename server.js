const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const QRCode = require('qrcode');
const puppeteer = require('puppeteer');

const app = express();

// เสิร์ฟไฟล์สาธารณะ เช่น bg2.svg
app.use('/static', express.static(path.join(__dirname, 'public')));

// โหลดข้อมูลจาก combined-data.json
async function loadWorkers() {
  const jsonPath = path.join(__dirname, 'combined-data.json');
  const raw = await fs.readFile(jsonPath, 'utf8');
  return JSON.parse(raw);
}

// ฟังก์ชันประกอบ HTML สำหรับใบเสร็จ
function renderReceiptHtml(worker, qrDataUrl, absoluteBgUrl, nowText, issueDateLongThai) {
  const safe = (v, fallback = 'N/A') => (v == null || v === '' ? fallback : String(v));

  // หมายเหตุ: ปรับขนาดฟอนต์/สไตล์ได้ตามต้องการให้เหมือนต้นฉบับ
  // ที่นี่ตั้งค่าแบบเรียบง่าย และใช้ position absolute ตามเลย์เอาต์เดิม
  // หากต้องการฟอนต์ไทยเฉพาะ (เช่น Sarabun/TH Sarabun New) สามารถเพิ่มลิงก์ Google Fonts ได้
  return `<!DOCTYPE html>
<html lang="th">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=892, initial-scale=1" />
<title>PDF Download - ใบเสร็จรับเงิน</title>
<style>
  html, body { margin:0; padding:0; }
  body { width:892px; height:1261px; background:#f0f0f0; }
  .page-div { position:relative; width:892px; height:1261px; margin:0 auto; background:#fff; font-family: system-ui, -apple-system, Segoe UI, Roboto, 'Noto Sans Thai', 'Tahoma', sans-serif; color:#000; }
  .ft00 { font-size:20px; }
  .ft01 { font-size:28px; }
  .ft02 { font-size:22px; }
  .ft03 { font-size:20px; }
  .ft06 { font-size:14px; color:#333; line-height:1.4; }
  img.bg { position:absolute; top:0; left:0; width:892px; height:1261px; }
  .abs { position:absolute; white-space:nowrap; }
</style>
</head>
<body>
  <div class="page-div">
    <img class="bg" src="${absoluteBgUrl}" alt="receipt background image" />
    <!-- Receipt QR Code -->
    <img style="position:absolute; top:925px; left:120px; width:90px; height:90px; object-fit:cover;" src="${qrDataUrl}" alt="Receipt QR Code"/>

    <!-- Department Info -->
    <p style="top:147px; left:86px;" class="abs ft00">กรมการจัดหางาน</p>
    <p style="top:170px; left:88px;" class="abs ft00">กระทรวงแรงงาน</p>

    <!-- Receipt Header -->
    <p style="top:90px; left:397px;" class="abs ft01"><b>ใบเสร็จรับเงิน</b></p>
    <p style="top:120px; left:418px;" class="abs ft01"><b>ต้นฉบับ</b></p>

    <!-- Receipt Number -->
    <p style="top:60px; left:598px;" class="abs ft00">เลขที่</p>
    <p style="top:60px; left:640px;" class="abs ft00">${safe(worker.receiptNumber)}</p>

    <!-- Office and Date -->
    <p style="top:149px; left:582px;" class="abs ft00">ที่ทำการ&nbsp;&nbsp; สำนักบริหารแรงงานต่างด้าว</p>
    <p style="top:188px; left:602px;" class="abs ft00">วันที่&nbsp;&nbsp; ${issueDateLongThai}</p>

    <!-- Payment Number -->
    <p style="top:227px; left:540px;" class="abs ft00">เลขที่ใบชำระเงิน&nbsp;&nbsp;</p>
    <p style="top:227px; left:640px;" class="abs ft00">${safe(worker.paymentNumber)}</p>

    <!-- Payer Information -->
    <p style="top:271px; left:60px;" class="abs ft00">เลขรับคำขอที่</p>
    <p style="top:271px; left:180px;" class="abs ft00">${safe(worker.requestNumber)}</p>

    <p style="top:310px; left:60px;" class="abs ft00">ชื่อผู้ชำระเงิน</p>
    <p style="top:310px; left:180px;" class="abs ft00">${safe(worker.englishName || worker.thaiName)}</p>

    <p style="top:310px; left:471px;" class="abs ft00">สัญชาติ</p>
    <p style="top:310px; left:520px;" class="abs ft00">${safe(worker.nationality)}</p>

    <p style="top:354px; left:60px;" class="abs ft00">เลขอ้างอิงคนต่างด้าว</p>
    <p style="top:354px; left:180px;" class="abs ft00">${safe(worker.alienReferenceNumber)}</p>

    <p style="top:354px; left:432px;" class="abs ft00">หมายเลขประจำตัวคนต่างด้าว</p>
    <p style="top:354px; left:640px;" class="abs ft00">${safe(worker.personalID)}</p>

    <!-- Employer Information (คงค่าเดิมตามไฟล์) -->
    <p style="top:399px; left:60px;" class="abs ft00">ชื่อนายจ้าง / สถานประกอบการ&nbsp;&nbsp; บริษัท บาน กง เอ็นจิเนียริ่ง จำกัด</p>
    <p style="top:438px; left:60px;" class="abs ft00">เลขประจำตัวนายจ้าง</p>
    <p style="top:437px; left:233px;" class="abs ft00">&nbsp; 0415567000061</p>

    <!-- Items Header -->
    <p style="top:526px; left:345px;" class="abs ft02"><b>รายการ</b></p>
    <p style="top:526px; left:688px;" class="abs ft02"><b>จำนวนเงิน</b></p>

    <!-- Fee Items -->
    <p style="top:572px; left:118px;" class="abs ft03">1. ค่าธรรมเนียมในการยื่นคำขอ ฉบับละ 100 บาท</p>
    <p style="top:572px; left:736px;" class="abs ft03">100.00</p>
    <p style="top:616px; left:118px;" class="abs ft03">2. ค่าธรรมเนียมใบอนุญาตทำงาน</p>
    <p style="top:616px; left:736px;" class="abs ft03">900.00</p>

    <!-- Total -->
    <p style="top:772px; left:174px;" class="abs ft02"><b>รวมเป็นเงินทั้งสิ้น (บาท)</b></p>
    <p style="top:799px; left:188px;" class="abs ft02"><b>( หนึ่งพันบาทถ้วน )</b></p>
    <p style="top:774px; left:722px;" class="abs ft02"><b>1,000.00</b></p>

    <!-- Receipt Confirmation -->
    <p style="top:894px; left:94px;" class="abs ft00">ได้้รับเงินไว้เป็นการถูกต้องแล้ว</p>

    <!-- Signature -->
    <p style="top:977px; left:481px;" class="abs ft00">(ลงชื่อ)</p>
    <p style="top:977px; left:564px;" class="abs ft00">นางสาวอารีวรรณ โพธิ์นิ่มแดง</p>
    <p style="top:977px; left:762px;" class="abs ft00">(ผู้รับเงิน)</p>

    <!-- Position -->
    <p style="top:1017px; left:473px;" class="abs ft00">ตำแหน่ง</p>
    <p style="top:1016px; left:562px;" class="abs ft00">นักวิชาการแรงงานชำนาญการ</p>

    <!-- Receipt Timestamp -->
    <div style="position:absolute; top:1128px; left:55px; right:55px;" class="ft06">
      เอกสารอิเล็กทรอนิกส์ฉบับนี้ถูกสร้างจากระบบอนุญาตทำงานคนต่างด้าวที่มีสถานะการทำงานไม่ถูกต้องตามกฎหมาย ตามมติคณะรัฐมนตรีเมื่อวันที่ 24 กันยายน 2567
      <br/>โดยกรมการจัดหางาน กระทรวงแรงงาน
      <br/>พิมพ์เอกสาร วันที่ ${nowText}
    </div>
  </div>
</body>
</html>`;
}

function thaiNowTexts() {
  const now = new Date();
  const nowText = now.toLocaleString('th-TH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false
  }).replace(',', ' ');
  const issueDateLongThai = now.toLocaleDateString('th-TH', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
  return { nowText, issueDateLongThai };
}

// สร้าง/ใช้ browser เดียวร่วมกัน เพื่อความเร็ว
let browserPromise = null;
async function getBrowser() {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  }
  return browserPromise;
}

// รองรับทั้ง /pdf และ /pdf.html เพื่อให้ลิงก์เดิมยังใช้ได้
app.get(['/pdf', '/pdf.html'], async (req, res) => {
  try {
    const id = req.query.id || '';
    if (!id) {
      return res.status(400).send('ต้องระบุพารามิเตอร์ id');
    }

    const workers = await loadWorkers();
    const worker = workers.find(w => w.requestNumber === id);
    if (!worker) {
      return res.status(404).send('ไม่พบข้อมูลสำหรับเลขที่คำขอที่ระบุ');
    }

    // URL ที่จะ encode ใน QR (ชี้กลับมาที่ endpoint เดิม)
    const pdfUrl = `${req.protocol}://${req.get('host')}${req.path}?id=${encodeURIComponent(worker.requestNumber || '')}`;
    const qrDataUrl = await QRCode.toDataURL(pdfUrl, {
      errorCorrectionLevel: 'H',
      margin: 1,
      width: 300
    });

    // absolute URL สำหรับ bg2.svg
    const absoluteBgUrl = `${req.protocol}://${req.get('host')}/static/bg2.svg`;

    const { nowText, issueDateLongThai } = thaiNowTexts();
    const html = renderReceiptHtml(worker, qrDataUrl, absoluteBgUrl, nowText, issueDateLongThai);

    const browser = await getBrowser();
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });

    // สร้าง PDF ตามขนาดพิกเซลเดิม
    const pdfBuffer = await page.pdf({
      width: '892px',
      height: '1261px',
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await page.close();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'inline; filename="mpdf.pdf"');
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('เกิดข้อผิดพลาดในการสร้าง PDF');
  }
});

// สถานะ
app.get('/', (req, res) => {
  res.send('OK: ใช้ /pdf?id=<REQUEST_NUMBER> เพื่อดาวน์โหลด PDF');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log('Server listening on port', PORT);
});
