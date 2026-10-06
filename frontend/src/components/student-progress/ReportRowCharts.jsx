import { useId } from 'react';
import { Area, AreaChart, CartesianGrid, PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, Tooltip, XAxis, YAxis } from 'recharts';
import { buildSkillComparisonRows, formatProgressValue, progressEvidenceLabel } from '../../utils/studentProgressDashboard.js';

const reportSkills = new Set(['listening','speaking','reading','writing']);
const currentColor = '#4f46e5';
const previousColor = '#64748b';

export function reportEvidenceLabel(row = {}) {
  const assessment = row.progress_assessment || {};
  const contributors = (assessment.contributors ?? row.contributors ?? []).filter(key => reportSkills.has(key));
  return progressEvidenceLabel({...row, progress_assessment: {...assessment, contributors}});
}

export function rowChartData(row) {
  const timeline = row.chart_timeline || {};
  return {
    comparison:buildSkillComparisonRows(timeline.comparison || {},'raw').filter(item=>reportSkills.has(item.key)).map(item => ({...item,axisLabel:item.skill})),
    days:(timeline.days || []).map(day => ({date:day.date,cumulative_points:Number.isFinite(day.cumulative_points) ? day.cumulative_points : null})),
  };
}

// Radar's default polygon places null at the origin; split paths at missing evidence.
export function RadarEvidenceShape({points = [],stroke,fill}) {
  const complete = points.length > 0 && points.every(point => Number.isFinite(point.value));
  const ordered = complete ? points : (() => {
    const gap = points.findIndex(point => !Number.isFinite(point.value));
    return [...points.slice(gap + 1),...points.slice(0,gap + 1)];
  })();
  let open = false;
  const path = ordered.map(point => {
    if (!Number.isFinite(point.value)) {open = false;return '';}
    const command = open ? 'L' : 'M';
    open = true;
    return `${command}${point.x},${point.y}`;
  }).join(' ') + (complete ? ' Z' : '');
  return <g aria-hidden="true">
    <path d={path} stroke={stroke} strokeWidth={1.5} fill={complete ? fill : 'none'} fillOpacity={0.15}/>
    {points.filter(point => Number.isFinite(point.value)).map((point,index) => <circle key={index} cx={point.x} cy={point.y} r={2.5} fill={stroke}/>)}
  </g>;
}

function dateLabel(value) {
  if (typeof value !== 'string') return '';
  const parts = value.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}` : value;
}

function ChartCell({title,student,description,children}) {
  const id = useId();
  return <td className="align-top px-2 py-3">
    <figure className="m-0" style={{width:240,height:190}} role="img" aria-label={`${title} · ${student}`} aria-describedby={id}>
      <figcaption className="mb-1 text-xs font-semibold text-slate-600">{title}</figcaption>
      <p id={id} className="sr-only">{description}</p>
      {children}
    </figure>
  </td>;
}

function EmptyChart() {
  return <div className="flex h-[166px] items-center justify-center text-xs text-slate-500">Chưa có dữ liệu</div>;
}

export default function RowProgressCharts({row}) {
  const {comparison,days} = rowChartData(row);
  const student = row.student_name || row.full_name || 'Học viên';
  const hasComparison = comparison.some(item => item.current !== null || item.previous !== null);
  const hasDays = days.some(day => day.cumulative_points !== null);
  const radarDescription = comparison.map(item => `${item.skill}: hiện tại ${formatProgressValue(item.current) === '—' ? 'chưa có' : item.current}, kỳ trước ${formatProgressValue(item.previous) === '—' ? 'chưa có' : item.previous}`).join('; ');
  const cumulativeDescription = days.map(day => `${dateLabel(day.date)}: ${day.cumulative_points === null ? 'chưa có' : day.cumulative_points} điểm evidence`).join('; ') || 'Chưa có dữ liệu';
  return <>
    <ChartCell title="Radar 4 kỹ năng" student={student} description={radarDescription}>
      {hasComparison ? <>
        <div className="flex justify-center gap-3 text-[10px]"><span style={{color:currentColor}}>Kỳ hiện tại</span><span style={{color:previousColor}}>Kỳ trước</span></div>
        <RadarChart width={240} height={150} data={comparison} outerRadius={48} margin={{top:8,right:28,bottom:8,left:28}} accessibilityLayer>
          <PolarGrid stroke="#cbd5e1"/>
          <PolarAngleAxis dataKey="axisLabel" tick={{fontSize:10}}/>
          <PolarRadiusAxis domain={[0,100]} ticks={[0,50,100]} tick={{fontSize:8}} axisLine={false}/>
          <Tooltip formatter={value => formatProgressValue(value,'/100')} labelFormatter={(_,payload) => payload?.[0]?.payload?.skill || ''}/>
          <Radar dataKey="previous" name="Kỳ trước" stroke={previousColor} fill={previousColor} shape={<RadarEvidenceShape/>} isAnimationActive={false}/>
          <Radar dataKey="current" name="Kỳ hiện tại" stroke={currentColor} fill={currentColor} shape={<RadarEvidenceShape/>} isAnimationActive={false}/>
        </RadarChart>
      </> : <EmptyChart/>}
    </ChartCell>
    <ChartCell title="Nỗ lực cộng dồn" student={student} description={cumulativeDescription}>
      {hasDays ? <AreaChart width={240} height={166} data={days} margin={{top:12,right:12,bottom:4,left:0}} accessibilityLayer>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
        <XAxis dataKey="date" tickFormatter={dateLabel} tick={{fontSize:10}} minTickGap={28}/>
        <YAxis width={34} tick={{fontSize:10}} domain={[0,'auto']}/>
        <Tooltip labelFormatter={dateLabel} formatter={value => formatProgressValue(value,' điểm evidence')}/>
        <Area type="monotone" dataKey="cumulative_points" name="Điểm evidence" stroke="#0891b2" strokeWidth={2} fill="#0891b2" fillOpacity={0.15} dot={{r:4,fill:'#0891b2',fillOpacity:1,stroke:'#fff',strokeOpacity:1,strokeWidth:1}} activeDot={{r:4,fill:'#0891b2',fillOpacity:1,stroke:'#fff',strokeOpacity:1,strokeWidth:1}} connectNulls={false} isAnimationActive={false}/>
      </AreaChart> : <EmptyChart/>}
    </ChartCell>
  </>;
}
