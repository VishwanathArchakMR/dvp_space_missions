# Orbital Atlas — A Visual Analysis of Global Space Missions

Frontend-only React + TypeScript interactive analytics dashboard for exploring global space missions with Tableau-inspired data visualization and analytical capabilities.

## Run

```bash
npm install
npm run dev
```

Build for production:
```bash
npm run build
npm run preview
```

## Data Management & Multi-Dataset Relationships

The application loads and joins three datasets locally in the browser:
- `public/data/launches.csv`: 7,651 global space launches (1957–present) with orbital parameters, vehicles, providers, and spaceports.
- `public/data/satellites.csv`: 5,500+ NORAD-catalogued payloads joined to launches via `launch_id`.
- `public/data/space_missions.csv`: 4,324 missions with validated launch cost data ($M) joined on date and organization.
- **Upload CSV**: Allows uploading any custom space mission dataset with instant parsing and visual mapping.
- **Data Health & Validation Layer**: Safe date handling, zero-division shields, missing value handling, and completeness metrics.

## Tableau-Inspired Analytical Features

- **Dimensions & Measures Schema**: Interactive collapsible shelf categorizing fields into discrete Dimensions (Country, Region, Organization, Site, Rocket, Outcome, Year, Month) and continuous Measures (Missions, Cost, Success Rate, Payloads, Avg Spend).
- **Interactive Global World Map**: Geographic network of global spaceports with beacon pulse indicators, coordinates, zoom/pan controls, and click-to-filter cross-chart actions.
- **Sorting & Top-N Analysis**: Sort country charts by Highest, Lowest, or Alphabetical; toggle Top 5, Top 10, or All countries/organizations.
- **Reference Lines**: Selectable Average or Median reference lines on temporal trajectories.
- **Time-Series Forecasting**: 5-Year statistical projection with confidence interval cones and clear estimation labeling.
- **Multidimensional Heat Map**: Switch between Country × Year, Organization × Year, and Month × Year seasonality.
- **Distribution Histograms**: Dynamic frequency binning for satellite payloads and mission costs with adjustable bin counts (6, 8, 12).
- **Box Plot Five-Number Summaries**: Statistical dispersion analysis (Min, Q1, Median, Q3, Max whiskers, and Outliers) grouped by Country or Organization.
- **Scatter Plot with OLS Trend Line**: Bivariate regression analysis comparing Launch Vehicle Cost ($M) vs Payload Count.
- **Statistical Outlier Detection**: Automatic upper IQR fence detection highlighting high-budget missions.
- **Dismissible Quick Filter Pills**: Interactive filter pills with single-click dismissal and instant cross-chart updates.
- **Complete Mission Log**: Multi-column sorting, full-text search, paginated browsing, and CSV export.
- **Liquid-Glass Design**: Responsive dark and light themes, accessible typography, and skippable 3D CSS Earth animation.
