const { parse } = require('url');
const fs = require('fs');
const path = require('path');

exports.handler = async function (event, context) {
  const { query } = parse(event.path, true);
  const requestNumber = query.id;

  // Read the combined-data.json file
  const filePath = path.join(context.functionsDirectory, 'combined-data.json');
  const jsonData = JSON.parse(fs.readFileSync(filePath, 'utf8'));

  // Find the worker data
  const worker = jsonData.find(w => w.requestNumber === requestNumber);

  if (!worker) {
    return {
      statusCode: 404,
      body: JSON.stringify({ message: 'Worker not found' }),
    };
  }

  // Render the PDF
  const html = `
    <!DOCTYPE html>
    <html xmlns="http://www.w3.org/1999/xhtml" lang="th" xml:lang="th">
    <head>
      <title>PDF Download - ใบเสร็จรับเงิน</title>
      <meta http-equiv="Content-Type" content="text/html; charset=UTF-8"/>
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
      <style type="text/css">
        /* Font and styling definitions */
      </style>
      <script>
        document.addEventListener('DOMContentLoaded', function() {
          const workerData = ${JSON.stringify(worker)};
          // Insert the worker data into the HTML
          document.getElementById('requestNumberReceipt').innerHTML = workerData.requestNumber || 'N/A';
          document.getElementById('receiptNumberReceipt').innerHTML = workerData.receiptNumber || 'N/A';
          document.getElementById('paymentNumberReceipt').innerHTML = workerData.paymentNumber || 'N/A';
          document.getElementById('payerNameReceipt').innerHTML = workerData.englishName || workerData.thaiName || 'N/A';
          document.getElementById('nationalityReceipt').innerHTML = workerData.nationality || 'N/A';
          document.getElementById('alienReferenceReceipt').innerHTML = workerData.alienReferenceNumber || 'N/A';
          document.getElementById('personalIDReceipt').innerHTML = workerData.personalID || 'N/A';

          // Generate QR Code for the receipt
          const currentUrl = window.location.href;
          const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/') + 1);
          const currentDomain = window.location.origin;
          const receiptUrl = \`${currentDomain}/pdf.html?id=\${encodeURIComponent(workerData.requestNumber || ''})\`;
          const receiptQrCodeApiUrl = \`https://api.qrserver.com/v1/create-qr-code/?size=300x300&ecc=H&data=\${encodeURIComponent(receiptUrl)}\`;
          const defaultQrCodeSrc = 'https://via.placeholder.com/90?text=No+QR';
          setImageSrc('receiptQrCode', receiptQrCodeApiUrl, defaultQrCodeSrc, workerData.englishName, 'receipt QR code');

          // Generate the timestamp for the receipt
          const timestamp = new Date().toLocaleString('th-TH', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
          }).replace(',', ' ');
          const receiptTimestamp = \`เอกสารอิเล็กทรอนิกส์ฉบับนี้ถูกสร้างจากระบบอนุญาตทำงานคนต่างด้าวที่มีสถานะการทำงานไม่ถูกต้องตามกฎหมาย ตามมติคณะรัฐมนตรีเมื่อ 24 ก.ย. 2567<br/>โดยกรมการจัดหางาน กระทรวงแรงงาน<br/>พิมพ์เอกสาร วันที่ \${timestamp}\`;
          document.getElementById('receiptTimestamp').innerHTML = receiptTimestamp;

          // Download the PDF
          const page2Element = document.getElementById('page2-div');
          const opt = {
            margin: [0, 0, 0, 0],
            filename: 'mpdf.pdf', // Fixed filename for QR code access
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: { scale: 3, useCORS: true, width: 892, height: 1261, scrollX: 0, scrollY: 0 },
            jsPDF: { unit: 'px', format: [892, 1261], orientation: 'portrait', compress: true }
          };

          // Clone page 2 only
          const page2Clone = page2Element.cloneNode(true);
          const container = document.createElement('div');
          container.style.width = '892px';
          container.style.height = '1261px';
          container.appendChild(page2Clone);
          document.body.appendChild(container);

          html2pdf().set(opt).from(container).save().then(() => {
            document.body.removeChild(container);
          }).catch(err => {
            console.error('Error generating PDF:', err);
          });
        });
      </script>
    </head>
    <body class="bg-gray-500">
      <div id="loadingOverlay" class="loading-overlay">
        <div class="spinner"></div>
        <h2 style="font-size: 24px; margin-bottom: 10px;">กำลังเตรียม PDF...</h2>
        <p style="font-size: 18px;">กรุณารอสักครู่ ระบบกำลังสร้างเอกสารให้คุณ</p>
      </div>

      <!-- Page 2: Receipt (เหมือนต้นฉบับ 100%) -->
      <div id="page2-div" class="page-div relative w-[892px] h-[1261px] font-['THSarabunPSK'] text-black mx-auto bg-white">
        <img width="892" height="1261" src="bg2.svg" alt="receipt background image"/>
        <!-- Receipt QR Code -->
        <img class="absolute top-[925px] left-[120px] w-[90px] h-[90px] object-cover" id="receiptQrCode" src="https://via.placeholder.com/90?text=Loading" alt="Receipt QR Code"/>
        <!-- Department Info -->
        <p style="position:absolute;top:147px;left:86px;white-space:nowrap" class="ft00">กรมการจัดหางาน</p>
        <p style="position:absolute;top:170px;left:88px;white-space:nowrap" class="ft00">กระทรวงแรงงาน</p>
        <!-- Receipt Header -->
        <p style="position:absolute;top:90px;left:397px;white-space:nowrap" class="ft01"><b>ใบเสร็จรับเงิน</b></p>
        <p style="position:absolute;top:120px;left:418px;white-space:nowrap" class="ft01"><b>ต้นฉบับ</b></p>
        <!-- Receipt Number -->
        <p style="position:absolute;top:60px;left:598px;white-space:nowrap" class="ft00">เลขที่</p>
        <p style="position:absolute;top:60px;left:640px;white-space:nowrap" class="ft00" id="receiptNumberReceipt">xxxxxxx</p>
        <!-- Office and Date -->
        <p style="position:absolute;top:149px;left:582px;white-space:
Certainly! Let's go through the steps to ensure the provided JSON file can be used correctly and that the PDF Generation works as intended.

### Step 1: Verify JSON File
First, ensure that the `combined-data.json` file is correctly formatted and contains the necessary data. The JSON structure should match the expected format used in the scripts. Here is an example of what the JSON might look like:

```json
[
  {
    "requestNumber": "WP-68-1011897",
    "englishName": "MRS. AYE SANDRA HTWE",
    "profileImage": "https://s6.imgcdn.dev/Y4u3dD.png",
    "thaiName": "นาง เอ ซานดรา ตเว",
    "age": "47",
    "alienReferenceNumber": "2492102076039",
    "personalID": "6682190040778",
    "nationality": "เมียนมา",
    "workPermitNumber": "2100689040199",
    "birthDate": "25/02/1978",
    "receiptNumber": "2100680035190",
    "paymentNumber": "IV680329/002308"
  }
  // Add more worker objects as needed
]
