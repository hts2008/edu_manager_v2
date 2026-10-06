import assert from 'node:assert/strict';
import test from 'node:test';
import { build } from 'esbuild';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

test('mounted print charts survive document serialization and all paper/orientation PDFs', async () => {
  const directory = fileURLToPath(new URL('../', import.meta.url));
  const bundle = await build({stdin:{contents:`
    import React from 'react'; import {createRoot} from 'react-dom/client';
    import Preview from './src/components/student-progress/ProgressPrintPreview.jsx';
    import {buildPrintDocument} from './src/components/student-progress/progressPrint.js';
    const row={student_name:'Nguyễn An '+ 'Tên rất dài '.repeat(6),class_name:'Movers',month:'2026-10',
      parent_name:'Phụ huynh',progress_score:0,actual_present_rate:0,recorded_sessions:0,expected_sessions:8,
      parent_summary:'Nhận xét dài '.repeat(120),next_actions:['Luyện nghe mỗi ngày'],evidence_notes:['Dữ liệu đã lưu'],
      chart_timeline:{comparison:{skills:{listening:{current_raw_score:0,previous_raw_score:70},reading:{current_raw_score:80}}},
      days:[{date:'2026-10-06',cumulative_points:0}]}};
    window.serializePrint=(paper,orientation)=>buildPrintDocument(document.querySelector('.progress-print-document'),paper,orientation);
    createRoot(document.getElementById('root')).render(<Preview row={row} onClose={()=>{}}/>);
  `,resolveDir:directory,loader:'jsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic'});
  const server=createServer((request,response)=>{
    response.setHeader('Content-Type',request.url==='/app.js'?'text/javascript':'text/html');
    response.end(request.url==='/app.js'?bundle.outputFiles[0].text:'<html><body><div id="root"></div><script src="/app.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  let browser;
  try {
    browser=await chromium.launch({headless:true});
    const page=await browser.newPage();
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    await page.locator('.progress-print-document .recharts-wrapper svg').nth(1).waitFor();
    assert.equal(await page.locator('.progress-print-document .recharts-wrapper svg').count(),2);
    for (const paper of ['A4','A5','Letter']) for (const orientation of ['portrait','landscape']) {
      await page.getByLabel('Khổ giấy',{exact:true}).selectOption(paper);
      await page.getByLabel('Hướng giấy',{exact:true}).selectOption(orientation);
      const geometry=await page.locator('.progress-print-document').evaluate(element=>({width:element.clientWidth,scroll:element.scrollWidth}));
      assert.ok(geometry.scroll<=geometry.width+1,`${paper}/${orientation} document overflow`);
      const html=await page.evaluate(({paper,orientation})=>window.serializePrint(paper,orientation),{paper,orientation});
      assert.equal((html.match(/class="recharts-surface"/g)||[]).length,2);
      assert.doesNotMatch(html,/Khổ giấy|In báo cáo|Đóng xem trước/);
      const output=await browser.newPage();
      try {
        await output.setContent(html);
        await output.emulateMedia({media:'print'});
        const printGeometry=await output.locator('.progress-print-document').evaluate(element=>({width:element.clientWidth,scroll:element.scrollWidth}));
        assert.ok(printGeometry.scroll<=printGeometry.width+1);
        const pdf=await output.pdf({preferCSSPageSize:true,printBackground:true});
        assert.equal(pdf.subarray(0,4).toString(),'%PDF');
        assert.ok(pdf.length>10000,`${paper}/${orientation} nonempty PDF`);
        if (process.env.PROGRESS_PRINT_ARTIFACTS === '1') {
          const artifactDirectory=new URL('../../docs/artifacts/progress-print-clay-2026-10-06/',import.meta.url);
          await mkdir(artifactDirectory,{recursive:true});
          await writeFile(new URL(`sample-${paper}-${orientation}.pdf`,artifactDirectory),pdf);
          if (paper === 'A4' && orientation === 'portrait') await output.locator('.progress-print-document').screenshot({path:fileURLToPath(new URL('preview-A4.png',artifactDirectory))});
        }
      } finally {await output.close();}
    }
  } finally {
    await browser?.close();
    await new Promise(resolve=>server.close(resolve));
  }
});
