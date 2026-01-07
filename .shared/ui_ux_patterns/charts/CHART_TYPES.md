# 📊 CHART TYPES CATALOG
<!-- VI: 24 loại biểu đồ cho dashboards và analytics -->

> **PURPOSE**: Chart recommendations for data visualization
> Reference: UI-UX Pro Max Skill (24 types)

---

## COMPARISON CHARTS (6)

### 1. Bar Chart
```
Use when: Comparing categories
Data: Categorical vs numerical
Example: Sales by product, users by country
```
**Library**: Chart.js, Recharts, D3.js

### 2. Grouped Bar Chart
```
Use when: Comparing multiple series across categories
Data: Multiple categorical comparisons
Example: Sales by product by quarter
```

### 3. Stacked Bar Chart
```
Use when: Showing composition within categories
Data: Parts of a whole per category
Example: Revenue breakdown by region by product
```

### 4. Horizontal Bar Chart
```
Use when: Long category labels
Data: Same as bar chart
Example: Top 10 countries, feature popularity
```

### 5. Lollipop Chart
```
Use when: Clean alternative to bar chart
Data: Single values per category
Example: Performance scores, rankings
```

### 6. Bullet Chart
```
Use when: Showing progress vs target
Data: Actual vs goal
Example: KPIs, quota achievement
```

---

## TREND CHARTS (5)

### 7. Line Chart
```
Use when: Showing trends over time
Data: Time series
Example: Revenue over months, user growth
```

### 8. Area Chart
```
Use when: Emphasizing volume over time
Data: Time series with magnitude
Example: Total traffic, cumulative values
```

### 9. Stacked Area Chart
```
Use when: Showing composition over time
Data: Multiple time series
Example: Traffic by source over time
```

### 10. Step Chart
```
Use when: Showing discrete changes
Data: Non-continuous changes
Example: Pricing tiers, version changes
```

### 11. Sparkline
```
Use when: Inline trend indicators
Data: Small time series
Example: Stock prices in tables, mini KPIs
```

---

## COMPOSITION CHARTS (4)

### 12. Pie Chart
```
Use when: Parts of a whole (max 5-6 slices)
Data: Percentage breakdown
Example: Market share, budget allocation
```
**Tip**: Avoid for more than 6 categories

### 13. Donut Chart
```
Use when: Same as pie, with center metric
Data: Percentage with key number
Example: Completion %, primary KPI
```

### 14. Treemap
```
Use when: Hierarchical part-to-whole
Data: Nested categories with values
Example: Disk usage, portfolio allocation
```

### 15. Sunburst Chart
```
Use when: Multi-level hierarchy
Data: Nested categories
Example: Organization structure, file systems
```

---

## DISTRIBUTION CHARTS (4)

### 16. Histogram
```
Use when: Distribution of numerical data
Data: Frequency of ranges
Example: Age distribution, response times
```

### 17. Box Plot
```
Use when: Statistical distribution summary
Data: Min, max, quartiles, median
Example: Salary ranges, test scores
```

### 18. Violin Plot
```
Use when: Distribution shape comparison
Data: Probability density
Example: A/B test results
```

### 19. Scatter Plot
```
Use when: Relationship between two variables
Data: X-Y numerical pairs
Example: Height vs weight, price vs sales
```

---

## SPECIALIZED CHARTS (5)

### 20. Heatmap
```
Use when: Matrix with intensity
Data: Two dimensions with values
Example: Correlation matrix, activity by hour/day
```

### 21. Radar/Spider Chart
```
Use when: Multivariate comparison
Data: Multiple metrics per entity
Example: Skill assessment, product comparison
```

### 22. Gauge Chart
```
Use when: Single metric vs target
Data: Current value and max
Example: CPU usage, goal progress
```

### 23. Sankey Diagram
```
Use when: Flow between stages
Data: Source → destination with magnitude
Example: User journey, budget flow
```

### 24. Funnel Chart
```
Use when: Conversion stages
Data: Values decreasing through stages
Example: Sales funnel, signup process
```

---

## Quick Reference

| Need | Chart Type | Best Library |
|------|-----------|--------------|
| Compare categories | Bar, Grouped Bar | Chart.js |
| Show trend | Line, Area | Recharts |
| Parts of whole | Pie, Donut, Treemap | D3.js |
| Distribution | Histogram, Box | Plotly |
| Relationship | Scatter | Chart.js |
| Flow | Sankey, Funnel | D3.js |
| KPI indicator | Gauge, Sparkline | Custom |

---

## Implementation Tips

### React (Recharts)
```tsx
import { LineChart, Line, XAxis, YAxis, Tooltip } from 'recharts';

<LineChart data={data}>
  <XAxis dataKey="name" />
  <YAxis />
  <Tooltip />
  <Line type="monotone" dataKey="value" stroke="#3b82f6" />
</LineChart>
```

### Chart.js
```javascript
new Chart(ctx, {
  type: 'bar',
  data: {
    labels: ['Jan', 'Feb', 'Mar'],
    datasets: [{ label: 'Sales', data: [12, 19, 3] }]
  }
});
```

---

**Total Chart Types**: 24
**Reference**: UI-UX Pro Max Skill
