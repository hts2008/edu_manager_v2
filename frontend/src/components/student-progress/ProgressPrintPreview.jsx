import { createElement, useEffect, useRef, useState } from 'react';
import { Printer, X, GraduationCap, TrendingUp, CalendarCheck, BookOpen, ShieldCheck } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, XAxis, YAxis } from 'recharts';
import Modal from '../ui/Modal';
import { rowChartData, RadarEvidenceShape, reportEvidenceLabel } from './ReportRowCharts.jsx';
import { formatProgressValue } from '../../utils/studentProgressDashboard.js';
import { PRINT_CSS, PRINT_PAPERS, paperDimensions, printProgressDocument } from './progressPrint.js';

function PrintCharts({comparison,days}) {
  const hasSkills = comparison.some(item => item.current !== null || item.previous !== null);
  const hasDays = days.some(item => item.cumulative_points !== null);
  return <div className="pp-charts">
    <figure className="pp-clay pp-radar" aria-label="So sánh điểm thô bốn kỹ năng">
      <figcaption>Kỹ năng học tập</figcaption>
      <div className="pp-legend"><span className="pp-current">Kỳ hiện tại</span><span className="pp-previous">Kỳ trước</span></div>
      <div className="pp-chart">{hasSkills ? <RadarChart width={260} height={200} data={comparison} outerRadius={65}>
        <PolarGrid stroke="#cbdde2"/><PolarAngleAxis dataKey="axisLabel" tick={{fontSize:10}}/>
        <PolarRadiusAxis domain={[0,100]} ticks={[0,50,100]} tick={{fontSize:8}} axisLine={false}/>
        <Radar name="Kỳ trước" dataKey="previous" stroke="#64748b" fill="#64748b" shape={<RadarEvidenceShape/>} isAnimationActive={false}/>
        <Radar name="Kỳ hiện tại" dataKey="current" stroke="#4f46e5" fill="#4f46e5" shape={<RadarEvidenceShape/>} isAnimationActive={false}/>
      </RadarChart> : <p className="pp-muted">Chưa có điểm kỹ năng trong kỳ.</p>}</div>
    </figure>
    <figure className="pp-clay pp-effort" aria-label="Điểm evidence tích lũy theo ngày">
      <figcaption>Nỗ lực cộng dồn</figcaption>
      <p className="pp-muted">Điểm evidence, không phải điểm năng lực</p>
      <div className="pp-chart">{hasDays ? <AreaChart width={260} height={200} data={days} margin={{top:12,right:12,bottom:4,left:0}}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e0ecee"/>
        <XAxis dataKey="date" tickFormatter={date => String(date).slice(5)} tick={{fontSize:9}} minTickGap={30}/>
        <YAxis domain={[0,'auto']} width={34} tick={{fontSize:9}}/>
        <Area dataKey="cumulative_points" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.12} dot={{r:4,fill:'#4f46e5',fillOpacity:1,stroke:'#fff',strokeOpacity:1}} connectNulls={false} isAnimationActive={false}/>
      </AreaChart> : <p className="pp-muted">Chưa có evidence trong kỳ.</p>}</div>
    </figure>
  </div>;
}

function ProgressBar({value,label}) {
  const bounded=Number.isFinite(value) ? Math.max(0,Math.min(100,value)) : null;
  if (bounded === null) return null;
  return <div className="pp-bar" role={bounded === null ? undefined : 'progressbar'} aria-label={label} aria-valuemin={bounded === null ? undefined : 0} aria-valuemax={bounded === null ? undefined : 100} aria-valuenow={bounded ?? undefined}>
    {bounded !== null && <span style={{width:`${bounded}%`}}/>}
  </div>;
}

function PrintMetrics({row}) {
  const metrics=[
    {label:'Điểm tiến bộ',value:row.progress_score,suffix:'/100',Icon:TrendingUp},
    {label:'Chuyên cần',value:row.actual_present_rate,suffix:'%',Icon:CalendarCheck},
    {label:'Buổi học ghi nhận',text:`${formatProgressValue(row.recorded_sessions)} / ${formatProgressValue(row.expected_sessions)}`,Icon:BookOpen},
    {label:'Độ phủ evidence',value:row.learning_evidence_coverage,suffix:'%',Icon:ShieldCheck},
  ];
  return <div className="pp-metrics">{metrics.map(({label,value,suffix,text,Icon})=><div className="pp-clay pp-metric" key={label}>
    {createElement(Icon,{size:18,'aria-hidden':true})}<div className="pp-metric-label">{label}</div>
    <strong>{text || formatProgressValue(value,suffix)}</strong>
    {suffix && <ProgressBar value={value} label={label}/>}
  </div>)}</div>;
}

function EvidenceTimeline({days}) {
  const recorded=days.filter(day=>day.cumulative_points !== null).sort((a,b)=>a.date.localeCompare(b.date));
  return <section className="pp-history"><h2>Dấu mốc học tập</h2><p className="pp-muted">{recorded.length>6 ? '6 ngày ghi nhận gần nhất trong kỳ' : 'Các ngày có evidence trong kỳ'} · Điểm tích lũy</p>
    {recorded.length ? <ol className="pp-timeline">{recorded.slice(-6).map(day=><li key={day.date}><time dateTime={day.date}>{day.date}</time><strong>{day.cumulative_points} điểm</strong></li>)}</ol> : <p className="pp-muted">Chưa có dấu mốc được ghi nhận.</p>}
  </section>;
}

function Narrative({title,items,steps=false}) {
  return <section><h2>{title}</h2>{Array.isArray(items) && items.length ? steps ? <ol className="pp-steps">{items.map((item,index)=><li key={index}><span className="pp-step-number">{index+1}</span><span>{item}</span></li>)}</ol> : <ul>{items.map((item,index)=><li key={index}>{item}</li>)}</ul> : <p className="pp-muted">Chưa có thông tin.</p>}</section>;
}

export function ProgressPrintDocument({row,paper='A4',orientation='portrait',documentRef}) {
  const {width,height} = paperDimensions(paper,orientation);
  const {comparison,days} = rowChartData(row);
  return <article ref={documentRef} className={`progress-print-document${width < 180 ? ' pp-compact' : ''}`} style={{width:`${width}mm`,minHeight:`${height}mm`}}>
    <header>
      <div className="pp-brand"><GraduationCap size={25} aria-hidden="true"/><div className="pp-kicker">{row.center_name || 'EDU Manager'}<span>Báo cáo gửi phụ huynh</span></div><span className="pp-period">{row.month || 'Chưa có kỳ báo cáo'}</span></div>
      <h1>Báo cáo học tập</h1>
      <div className="pp-learner">{row.student_name || row.full_name || 'Học viên'}</div>
      <p>{row.class_name || 'Chưa có lớp'}</p>
      <p className="pp-muted">Phụ huynh: {row.parent_name || 'Chưa có thông tin'}{row.parent_phone ? ` · ${row.parent_phone}` : ''}</p>
      <p className="pp-muted">{[row.track_label,row.cefr_level].filter(Boolean).join(' · ') || 'Chưa có thông tin chương trình'}</p>
    </header>
    <PrintMetrics row={row}/>
    <PrintCharts comparison={comparison} days={days}/>
    <section><h2>Kỹ năng học tập</h2>
      <p className="pp-muted">Điểm thô /100 trong kỳ báo cáo; ô chưa có không được tính là 0.</p>
      <table><thead><tr><th>Kỹ năng</th><th>Kỳ hiện tại</th><th>Kỳ trước</th></tr></thead>
        <tbody>{comparison.map(skill=><tr key={skill.key}><td>{skill.skill}<ProgressBar value={skill.current} label={`${skill.skill} kỳ hiện tại`}/></td><td>{skill.current === null ? 'Chưa có' : skill.current}</td><td>{skill.previous === null ? 'Chưa có' : skill.previous}</td></tr>)}</tbody>
      </table>
    </section>
    <EvidenceTimeline days={days}/>
    <section className="pp-note"><h2>Nhận xét của giáo viên</h2><p>{row.parent_summary || 'Chưa có nhận xét trong kỳ.'}</p></section>
    <Narrative title="Định hướng kỳ tiếp theo" items={row.next_actions} steps/>
    <Narrative title="Ghi chú dữ liệu" items={row.evidence_notes}/>
    <footer><p>{reportEvidenceLabel(row)}</p><p>Bản báo cáo theo dữ liệu đã lưu của kỳ {row.month || 'chưa xác định'}. Điểm kỹ năng và evidence không phải chứng nhận trình độ.</p></footer>
  </article>;
}

export default function ProgressPrintPreview({row,onClose}) {
  const [paper,setPaper] = useState('A4');
  const [orientation,setOrientation] = useState('portrait');
  const [printing,setPrinting] = useState(false);
  const [error,setError] = useState('');
  const documentRef = useRef(null);
  const preparation = useRef(null);
  useEffect(() => () => preparation.current?.abort(), []);
  async function print() {
    if (printing) return;
    setError('');
    setPrinting(true);
    const controller = new AbortController();
    preparation.current = controller;
    try {await printProgressDocument(documentRef.current,paper,orientation,undefined,controller.signal);}
    catch (failure) {if (!controller.signal.aborted) setError(failure.message || 'Không thể mở bản in. Vui lòng thử lại.');}
    finally {if (!controller.signal.aborted) setPrinting(false);}
  }
  function close() {preparation.current?.abort();onClose();}
  return <Modal isOpen={Boolean(row)} onClose={close} title="Xem trước báo cáo" size={orientation === 'landscape' ? 'full' : 'xl'} showClose={false}>
    <style>{PRINT_CSS}</style>
    <div className="mb-4 flex flex-wrap items-center gap-3">
      <label className="text-sm">Khổ giấy <select aria-label="Khổ giấy" className="ml-2 rounded border border-slate-300 bg-white px-2 py-2" value={paper} onChange={event=>setPaper(event.target.value)} disabled={printing}>{Object.keys(PRINT_PAPERS).map(value=><option key={value}>{value}</option>)}</select></label>
      <label className="text-sm">Hướng giấy <select aria-label="Hướng giấy" className="ml-2 rounded border border-slate-300 bg-white px-2 py-2" value={orientation} onChange={event=>setOrientation(event.target.value)} disabled={printing}><option value="portrait">Dọc</option><option value="landscape">Ngang</option></select></label>
      <button type="button" title="In báo cáo" aria-label="In báo cáo" onClick={print} disabled={printing} className="ml-auto rounded bg-cyan-700 p-2 text-white disabled:opacity-50"><Printer size={20}/></button>
      <button type="button" title="Đóng xem trước" aria-label="Đóng xem trước" onClick={close} className="rounded bg-slate-100 p-2 text-slate-700"><X size={20}/></button>
    </div>
    {error && <p role="alert" className="mb-3 text-sm text-rose-700">{error}</p>}
    {printing && <p role="status" className="mb-3 text-sm text-slate-600">Đang chuẩn bị bản in…</p>}
    <div className="max-w-full overflow-x-auto bg-slate-100 p-3">{row && <ProgressPrintDocument row={row} paper={paper} orientation={orientation} documentRef={documentRef}/>}</div>
  </Modal>;
}
