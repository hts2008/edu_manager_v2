import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartFrame, SAFE_RECHARTS_CONTAINER_PROPS } from "../ui/LoadingStates";
import {
  PROGRESS_SKILLS,
  buildLatestSkillDeltaRows,
  buildProgressChartRows,
  buildSkillComparisonRows,
  formatProgressValue,
} from "../../utils/studentProgressDashboard";

function formatPeriod(value) {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
  if (parts.length === 2) return `${parts[1]}/${parts[0]}`;
  return value;
}

function ChartPanel({ title, description, children, testId }) {
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm" data-testid={testId}>
      <h3 className="text-sm font-black text-slate-950">{title}</h3>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-sm font-semibold text-slate-500">
      Chưa có đủ điểm theo ngày để vẽ biểu đồ.
    </div>
  );
}

export default function ProgressDashboardCharts({ timeline, scoreMode }) {
  const seriesRows = buildProgressChartRows(timeline?.series, scoreMode);
  const days = timeline?.days || [];
  const deltaRows = buildLatestSkillDeltaRows(days, scoreMode);
  const comparisonRows = buildSkillComparisonRows(timeline?.comparison, scoreMode);
  const hasSeries = seriesRows.some((row) =>
    PROGRESS_SKILLS.some((skill) => row[skill.key] !== null),
  );
  const hasDelta = deltaRows.some((row) => row.delta !== null);
  const hasComparison = comparisonRows.some((row) => row.current !== null || row.previous !== null);

  return (
    <div className="grid min-w-0 gap-4 xl:grid-cols-2" data-testid="student-progress-charts">
      <ChartPanel
        title="7 nhóm kỹ năng"
        description={`Chế độ đang xem: ${scoreMode === "weighted" ? "điểm quy đổi" : "điểm thô"}; khoảng trống không bị biến thành 0.`}
        testId="progress-skills-chart"
      >
        <ChartFrame height={300}>
          {hasSeries ? (
            <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
              <LineChart data={seriesRows} margin={{ top: 12, right: 12, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="period" tickFormatter={formatPeriod} minTickGap={18} />
                <YAxis domain={[0, 100]} />
                <Tooltip labelFormatter={formatPeriod} formatter={(value) => formatProgressValue(value, "/100")} />
                <Legend />
                {PROGRESS_SKILLS.map((skill) => (
                  <Line key={skill.key} connectNulls={false} type="monotone" dataKey={skill.key} name={skill.label} stroke={skill.color} strokeWidth={2} dot={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartFrame>
      </ChartPanel>

      <ChartPanel
        title="Thay đổi ở lần cập nhật gần nhất"
        description="Delta của từng kỹ năng so với lần chấm có dữ liệu ngay trước đó."
        testId="progress-growth-chart"
      >
        <ChartFrame height={280}>
          {hasDelta ? (
            <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
              <BarChart data={deltaRows} margin={{ top: 10, right: 12, left: -16, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="skill" interval={0} angle={-18} textAnchor="end" height={54} />
                <YAxis />
                <Tooltip formatter={(value) => formatProgressValue(value, " điểm")} />
                <ReferenceLine y={0} stroke="#64748b" />
                <Bar dataKey="delta" name="Delta gần nhất" fill="#16a34a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartFrame>
      </ChartPanel>

      <ChartPanel
        title="Kỳ hiện tại và kỳ liền trước"
        description="Radar trung bình 7 kỹ năng trên hai khoảng thời gian có cùng độ dài."
        testId="progress-comparison-chart"
      >
        <ChartFrame height={300}>
          {hasComparison ? (
            <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
              <RadarChart data={comparisonRows} outerRadius="72%">
                <PolarGrid stroke="#cbd5e1" />
                <PolarAngleAxis dataKey="skill" tick={{ fontSize: 11 }} />
                <PolarRadiusAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Tooltip formatter={(value) => formatProgressValue(value, "/100")} />
                <Legend />
                <Radar dataKey="previous" name="Kỳ trước" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.18} />
                <Radar dataKey="current" name="Kỳ hiện tại" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.25} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartFrame>
      </ChartPanel>

      <ChartPanel
        title="Nỗ lực cộng dồn"
        description="Tổng điểm evidence tích lũy qua các ngày, không thay thế kết quả kỹ năng."
        testId="progress-cumulative-chart"
      >
        <ChartFrame height={280}>
          {days.length ? (
            <ResponsiveContainer {...SAFE_RECHARTS_CONTAINER_PROPS} width="100%" height="100%">
              <AreaChart data={days} margin={{ top: 10, right: 12, left: -8, bottom: 4 }}>
                <defs>
                  <linearGradient id="progressPoints" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.36} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.04} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="date" tickFormatter={formatPeriod} minTickGap={24} />
                <YAxis />
                <Tooltip labelFormatter={formatPeriod} />
                <Area type="monotone" dataKey="cumulative_points" name="Điểm evidence" stroke="#7c3aed" strokeWidth={3} fill="url(#progressPoints)" />
              </AreaChart>
            </ResponsiveContainer>
          ) : <EmptyChart />}
        </ChartFrame>
      </ChartPanel>
    </div>
  );
}
