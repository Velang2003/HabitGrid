import React from 'react';
import { FlexWidget, TextWidget, SvgWidget } from 'react-native-android-widget';
import { format, subDays } from 'date-fns';
import { getHabitLogs } from '../database/HabitLogRepo';

interface ChartWidgetProps {
  habits: any[];
  selectedIndex: number;   // -1 = All, 0..N = specific habit
  menuOpen: boolean;       // true = show habit-list dropdown
  widgetInfo: any;
}

// ── Cumulative streak: +1 each done day, flat on missed ───────────────────────
function buildCumulative(logSet: Set<string>, dates: Date[]): number[] {
  let running = 0;
  return dates.map(d => {
    if (logSet.has(format(d, 'yyyy-MM-dd'))) running += 1;
    return running;
  });
}

// ── SVG string builder ────────────────────────────────────────────────────────
function buildSvg({
  datasets,      // [{ values: number[], color: string }]
  dates,
  svgW,
  svgH,
}: {
  datasets: { values: number[]; color: string }[];
  dates: Date[];
  svgW: number;
  svgH: number;
}) {
  const PAD_L = 28, PAD_R = 10, PAD_T = 10, PAD_B = 24;
  const plotW = svgW - PAD_L - PAD_R;
  const plotH = svgH - PAD_T - PAD_B;
  const n = dates.length;
  const step = n > 1 ? plotW / (n - 1) : plotW;

  const allVals = datasets.flatMap(d => d.values);
  const maxVal  = Math.max(...allVals, 1);

  const xOf = (i: number) => PAD_L + i * step;
  const yOf = (v: number) => PAD_T + plotH - (v / maxVal) * plotH;

  // Grid (3 lines)
  const gridVals = [0, Math.round(maxVal / 2), maxVal];
  let gridLines = '';
  gridVals.forEach(v => {
    gridLines += `<line x1="${PAD_L}" y1="${yOf(v)}" x2="${PAD_L + plotW}" y2="${yOf(v)}" stroke="#444" stroke-width="0.8" stroke-dasharray="4 3"/>`;
    gridLines += `<text x="${PAD_L - 3}" y="${yOf(v) + 4}" font-size="9" fill="#888" text-anchor="end">${v}</text>`;
  });

  // X labels
  let xLabels = '';
  dates.forEach((d, i) => {
    xLabels += `<text x="${xOf(i)}" y="${svgH - 4}" font-size="9" fill="#888" text-anchor="middle">${format(d, 'EEE')}</text>`;
  });

  // Lines + dots per dataset
  let linesAndDots = '';
  datasets.forEach(ds => {
    if (!ds.values.length) return;
    const pathParts = ds.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(v)}`);
    linesAndDots += `<path d="${pathParts.join(' ')}" fill="none" stroke="${ds.color}" stroke-width="2.5" stroke-linejoin="round" stroke-linecap="round"/>`;
    ds.values.forEach((v, i) => {
      const fill = v > 0 ? ds.color : '#1E1E1E';
      linesAndDots += `<circle cx="${xOf(i)}" cy="${yOf(v)}" r="4" fill="${fill}" stroke="${ds.color}" stroke-width="2"/>`;
    });
  });

  // X axis
  const xAxisLine = `<line x1="${PAD_L}" y1="${yOf(0)}" x2="${PAD_L + plotW}" y2="${yOf(0)}" stroke="#555" stroke-width="1.2"/>`;

  return `<svg width="${svgW}" height="${svgH}" viewBox="0 0 ${svgW} ${svgH}">${gridLines}${xAxisLine}${linesAndDots}${xLabels}</svg>`;
}

// ── Widget component ──────────────────────────────────────────────────────────
export function ChartWidget({ habits, selectedIndex, menuOpen, widgetInfo }: ChartWidgetProps) {
  const isAll   = selectedIndex === -1;
  const W = Math.max((widgetInfo?.width  || 320) - 0, 200);
  const H = Math.max((widgetInfo?.height || 220) - 0, 160);

  const HEADER_H = 44;
  const svgW = W - 16;           // full widget width minus 8px padding each side
  const svgH = H - HEADER_H - 8;

  const timeRange = 7;
  const dates = Array.from({ length: timeRange }).map((_, i) => subDays(new Date(), timeRange - 1 - i));

  // ── Empty state ────────────────────────────────────────────────────────────
  if (habits.length === 0) {
    return (
      <FlexWidget style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#1E1E1E', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }}>
        <TextWidget text="No Habits Found" style={{ fontSize: 14, color: '#aaa' }} />
      </FlexWidget>
    );
  }

  // ── MENU / DROPDOWN VIEW ───────────────────────────────────────────────────
  if (menuOpen) {
    return (
      <FlexWidget
        style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#1A1A1A', borderRadius: 16, padding: 10, flexDirection: 'column' }}
      >
        {/* Header row */}
        <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <TextWidget text="Select Habit" style={{ fontSize: 13, color: '#aaa', fontWeight: 'bold' }} />
          <FlexWidget clickAction="CLOSE_CHART_MENU" style={{ padding: 4, backgroundColor: '#333', borderRadius: 6 }}>
            <TextWidget text=" ✕ " style={{ fontSize: 13, color: '#fff' }} />
          </FlexWidget>
        </FlexWidget>

        {/* "All Habits" option */}
        <FlexWidget
          clickAction="SELECT_CHART_IDX_-1"
          style={{
            backgroundColor: isAll ? '#1982C4' : '#2a2a2a',
            borderRadius: 8, padding: 8, marginBottom: 5,
          }}
        >
          <TextWidget text="All Habits" style={{ fontSize: 13, color: '#fff', fontWeight: isAll ? 'bold' : 'normal' }} />
        </FlexWidget>

        {/* Individual habits */}
        {habits.slice(0, 5).map((h, idx) => (
          <FlexWidget
            key={h.id}
            clickAction={`SELECT_CHART_IDX_${idx}`}
            style={{
              backgroundColor: selectedIndex === idx ? `#${h.color_hex}` : '#2a2a2a',
              borderRadius: 8, padding: 8, marginBottom: 4,
              flexDirection: 'row', alignItems: 'center',
            }}
          >
            <TextWidget text={`● ${h.title}`} style={{ fontSize: 12, color: '#fff' }} />
          </FlexWidget>
        ))}
      </FlexWidget>
    );
  }

  // ── CHART VIEW ─────────────────────────────────────────────────────────────
  const habitsToPlot = isAll ? habits : [habits[selectedIndex]].filter(Boolean);
  const activeLabel  = isAll ? 'All Habits' : (habits[selectedIndex]?.title ?? '');

  const datasets = habitsToPlot.map(h => {
    let logSet = new Set<string>();
    try {
      const logs = getHabitLogs(h.id);
      logSet = new Set(logs.map((l: any) => l.log_date));
    } catch (_) {}
    return {
      values: buildCumulative(logSet, dates),
      color: `#${h.color_hex}`,
    };
  });

  const svgString = buildSvg({ datasets, dates, svgW, svgH });

  return (
    <FlexWidget
      style={{ height: 'match_parent', width: 'match_parent', backgroundColor: '#1E1E1E', borderRadius: 16, padding: 8, flexDirection: 'column' }}
    >
      {/* Header with dropdown trigger */}
      <FlexWidget style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4, height: HEADER_H }}>
        <TextWidget
          text="Streak Chart · Last 7 Days"
          style={{ fontSize: 11, color: '#888' }}
        />
        {/* Dropdown trigger button */}
        <FlexWidget
          clickAction="OPEN_CHART_MENU"
          style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#2a2a2a', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 }}
        >
          <TextWidget text={`${activeLabel}  ▾`} style={{ fontSize: 12, color: '#fff', fontWeight: 'bold' }} />
        </FlexWidget>
      </FlexWidget>

      {/* SVG chart fills full width */}
      <SvgWidget svg={svgString} style={{ width: svgW, height: svgH }} />
    </FlexWidget>
  );
}
