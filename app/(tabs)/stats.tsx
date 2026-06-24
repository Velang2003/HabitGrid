import React, { useState, useMemo } from 'react';
import {
  StyleSheet, ScrollView, TouchableOpacity, Dimensions,
  Modal, View as RNView,
} from 'react-native';
import { Text, View } from '@/components/Themed';
import { useTheme } from '../../src/utils/ThemeContext';
import { useHabits } from '../../src/hooks/useHabits';
import { getHabitLogs } from '../../src/database/HabitLogRepo';
import { format, subDays } from 'date-fns';
import Svg, { Path, Line, Circle, Text as SvgText } from 'react-native-svg';

const SCREEN_WIDTH = Dimensions.get('window').width;

// ── Chart constants ───────────────────────────────────────────────────────────
const PAD_LEFT  = 34;
const PAD_RIGHT = 12;
const PAD_TOP   = 14;
const PAD_BOT   = 28;

// ── Cumulative streak builder ─────────────────────────────────────────────────
function buildCumulative(logSet: Set<string>, dates: Date[]): number[] {
  let running = 0;
  return dates.map(d => {
    if (logSet.has(format(d, 'yyyy-MM-dd'))) running += 1;
    return running;              // flat if missed, +1 if done
  });
}

// ── SVG multi-line chart ──────────────────────────────────────────────────────
interface LineData { values: number[]; color: string; label: string }

function MultiLineChart({
  datasets,
  xLabels,
  colors,
  chartWidth,
  chartHeight,
}: {
  datasets: LineData[];
  xLabels: string[];
  colors: any;
  chartWidth: number;
  chartHeight: number;
}) {
  const plotW = chartWidth - PAD_LEFT - PAD_RIGHT;
  const plotH = chartHeight - PAD_TOP - PAD_BOT;
  const n = Math.max(xLabels.length, 2);
  const step = plotW / (n - 1);

  // Max value across all datasets for Y-scale
  const allVals = datasets.flatMap(d => d.values);
  const maxVal  = Math.max(...allVals, 1);

  const xOf = (i: number) => PAD_LEFT + i * step;
  const yOf = (v: number) => PAD_TOP + plotH - (v / maxVal) * plotH;

  // Horizontal grid lines (0, 25%, 50%, 75%, 100% of maxVal)
  const gridCount = Math.min(maxVal, 5);
  const gridStep  = maxVal / gridCount;
  const gridVals  = Array.from({ length: gridCount + 1 }, (_, i) => Math.round(i * gridStep));

  return (
    <Svg width={chartWidth} height={chartHeight}>
      {/* Grid lines + Y labels */}
      {gridVals.map(v => (
        <React.Fragment key={v}>
          <Line
            x1={PAD_LEFT} y1={yOf(v)}
            x2={PAD_LEFT + plotW} y2={yOf(v)}
            stroke={colors.border} strokeWidth={1} strokeDasharray="4 3"
          />
          <SvgText
            x={PAD_LEFT - 4} y={yOf(v) + 4}
            fontSize={9} fill={colors.subText} textAnchor="end"
          >
            {v}
          </SvgText>
        </React.Fragment>
      ))}

      {/* X-axis baseline */}
      <Line
        x1={PAD_LEFT} y1={yOf(0)}
        x2={PAD_LEFT + plotW} y2={yOf(0)}
        stroke={colors.border} strokeWidth={1.5}
      />

      {/* X labels */}
      {xLabels.map((lbl, i) => lbl ? (
        <SvgText
          key={i}
          x={xOf(i)} y={chartHeight - 6}
          fontSize={9} fill={colors.subText} textAnchor="middle"
        >
          {lbl}
        </SvgText>
      ) : null)}

      {/* Lines + dots per habit */}
      {datasets.map((ds, di) => {
        if (!ds.values.length) return null;
        const pathD = ds.values
          .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i)} ${yOf(v)}`)
          .join(' ');

        return (
          <React.Fragment key={di}>
            <Path
              d={pathD} fill="none"
              stroke={ds.color} strokeWidth={2.5}
              strokeLinejoin="round" strokeLinecap="round"
            />
            {ds.values.map((v, i) => (
              <Circle
                key={i}
                cx={xOf(i)} cy={yOf(v)} r={4}
                fill={v > 0 ? ds.color : colors.card}
                stroke={ds.color} strokeWidth={2}
              />
            ))}
          </React.Fragment>
        );
      })}
    </Svg>
  );
}

// ── Dropdown ──────────────────────────────────────────────────────────────────
interface DropdownOption { label: string; value: string; color?: string }

function Dropdown({ options, selected, onSelect, colors }: {
  options: DropdownOption[];
  selected: string;
  onSelect: (v: string) => void;
  colors: any;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find(o => o.value === selected);

  return (
    <>
      <TouchableOpacity
        style={[st.ddTrigger, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
      >
        <RNView style={st.ddRow}>
          {current?.color && <RNView style={[st.dot, { backgroundColor: current.color }]} />}
          <Text style={[st.ddLabel, { color: colors.text }]}>{current?.label}</Text>
        </RNView>
        <Text style={{ color: colors.subText, fontSize: 16 }}>▾</Text>
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <TouchableOpacity style={st.backdrop} activeOpacity={1} onPress={() => setOpen(false)}>
          <RNView style={[st.ddMenu, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {options.map((opt, i) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  st.ddItem,
                  { borderBottomColor: i < options.length - 1 ? colors.border : 'transparent' },
                  selected === opt.value && { backgroundColor: colors.inputBackground },
                ]}
                onPress={() => { onSelect(opt.value); setOpen(false); }}
              >
                <RNView style={st.ddRow}>
                  {opt.color && <RNView style={[st.dot, { backgroundColor: opt.color }]} />}
                  <Text style={[st.ddItemText, { color: colors.text }]}>{opt.label}</Text>
                </RNView>
                {selected === opt.value && (
                  <Text style={{ color: '#1982C4', fontWeight: 'bold' }}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </RNView>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

// ── Legend ────────────────────────────────────────────────────────────────────
function Legend({ habits, colors }: { habits: any[]; colors: any }) {
  if (habits.length <= 1) return null;
  return (
    <RNView style={st.legendRow}>
      {habits.map(h => (
        <RNView key={h.id} style={st.legendItem}>
          <RNView style={[st.dot, { backgroundColor: `#${h.color_hex}` }]} />
          <Text style={[st.legendText, { color: colors.subText }]} numberOfLines={1}>
            {h.title}
          </Text>
        </RNView>
      ))}
    </RNView>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function StatsScreen() {
  const { colors } = useTheme();
  const { habits } = useHabits();

  const [selectedHabitId, setSelectedHabitId] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<7 | 30>(7);

  const dropdownOptions: DropdownOption[] = [
    { label: 'All Habits', value: 'all' },
    ...habits.map(h => ({ label: h.title, value: h.id.toString(), color: `#${h.color_hex}` })),
  ];

  const dates = useMemo(
    () => Array.from({ length: timeRange }).map((_, i) => subDays(new Date(), timeRange - 1 - i)),
    [timeRange],
  );

  // X-axis labels — show all for 7 days, every 5th for 30 days
  const xLabels = useMemo(() =>
    dates.map((d, i) =>
      timeRange === 7 ? format(d, 'EEE') : (i % 5 === 0 || i === dates.length - 1 ? format(d, 'dd') : '')
    ),
    [dates, timeRange],
  );

  const habitsToShow = useMemo(
    () => selectedHabitId === 'all' ? habits : habits.filter(h => h.id.toString() === selectedHabitId),
    [habits, selectedHabitId],
  );

  // Build cumulative datasets — each day: +1 if done, same if missed
  const datasets: LineData[] = useMemo(() =>
    habitsToShow.map(h => {
      let logSet = new Set<string>();
      try {
        const logs = getHabitLogs(h.id);
        logSet = new Set(logs.map((l: any) => l.log_date));
      } catch (_) {}
      return {
        values: buildCumulative(logSet, dates),
        color: `#${h.color_hex}`,
        label: h.title,
      };
    }),
    [habitsToShow, dates],
  );

  // Per-habit summary
  const summaryStats = useMemo(() =>
    habitsToShow.map(h => {
      const ds = datasets.find(d => d.label === h.title);
      const completed = ds ? ds.values[ds.values.length - 1] : 0; // final cumulative = total done
      return { habit: h, completed, total: timeRange };
    }),
    [habitsToShow, datasets, timeRange],
  );

  // Chart fills screen width minus outer padding (20 each side)
  const chartWidth  = SCREEN_WIDTH - 40;
  const chartHeight = 260;

  if (habits.length === 0) {
    return (
      <View style={[st.center, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.subText, fontSize: 16 }}>No habits yet. Create one first!</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.background }}
      contentContainerStyle={{ padding: 20, paddingBottom: 40 }}
    >
      <Text style={[st.title, { color: colors.text }]}>Statistics</Text>

      {/* Dropdown filter */}
      <Text style={[st.label, { color: colors.subText }]}>Habit Filter</Text>
      <Dropdown options={dropdownOptions} selected={selectedHabitId} onSelect={setSelectedHabitId} colors={colors} />

      {/* Time range toggle */}
      <Text style={[st.label, { color: colors.subText, marginTop: 16 }]}>Time Range</Text>
      <RNView style={[st.rangeRow, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
        {([7, 30] as const).map(r => (
          <TouchableOpacity
            key={r}
            style={[st.rangeBtn, timeRange === r && { backgroundColor: colors.card, elevation: 2 }]}
            onPress={() => setTimeRange(r)}
          >
            <Text style={{ fontWeight: 'bold', color: timeRange === r ? colors.text : colors.subText }}>
              {r} Days
            </Text>
          </TouchableOpacity>
        ))}
      </RNView>

      {/* Chart card — no horizontal padding so chart fills edge-to-edge */}
      <RNView style={[st.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[st.cardTitle, { color: colors.text, paddingHorizontal: 12 }]}>
          {selectedHabitId === 'all' ? 'All Habits — Cumulative Streaks' : `${habitsToShow[0]?.title ?? ''} — Cumulative Streak`}
        </Text>
        <Text style={[st.cardSub, { color: colors.subText, paddingHorizontal: 12 }]}>
          Y = total days done · line stays flat on missed days
        </Text>

        <RNView style={{ marginTop: 8 }}>
          {datasets.length > 0
            ? <MultiLineChart datasets={datasets} xLabels={xLabels} colors={colors} chartWidth={chartWidth} chartHeight={chartHeight} />
            : <Text style={{ color: colors.subText, textAlign: 'center', padding: 40 }}>No data</Text>
          }
        </RNView>

        {/* Legend */}
        <RNView style={{ paddingHorizontal: 12 }}>
          <Legend habits={habitsToShow} colors={colors} />
        </RNView>
      </RNView>

      {/* Per-habit summary cards */}
      {summaryStats.map(({ habit, completed, total }) => (
        <RNView
          key={habit.id}
          style={[st.summaryCard, { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: `#${habit.color_hex}` }]}
        >
          <RNView style={st.ddRow}>
            <RNView style={[st.dot, { backgroundColor: `#${habit.color_hex}`, width: 12, height: 12, borderRadius: 6 }]} />
            <Text style={[st.summaryTitle, { color: colors.text }]}>{habit.title}</Text>
          </RNView>
          <RNView style={{ alignItems: 'flex-end' }}>
            <Text style={[st.summaryCount, { color: `#${habit.color_hex}` }]}>{completed}/{total}</Text>
            <Text style={[st.legendText, { color: colors.subText }]}>days done</Text>
          </RNView>
        </RNView>
      ))}
    </ScrollView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20 },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 6 },
  dot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },

  // Dropdown
  ddTrigger: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 13 },
  ddRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  ddLabel: { fontSize: 15, fontWeight: '600' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: 20 },
  ddMenu: { borderRadius: 12, borderWidth: 1, overflow: 'hidden', maxHeight: 340 },
  ddItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  ddItemText: { fontSize: 15 },

  // Range toggle
  rangeRow: { flexDirection: 'row', borderWidth: 1, borderRadius: 8, padding: 4, marginBottom: 20 },
  rangeBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', borderRadius: 6 },

  // Chart card — no horizontal padding so SVG fills edge to edge
  card: { borderRadius: 16, paddingTop: 14, paddingBottom: 14, borderWidth: 1, marginBottom: 16, overflow: 'hidden' },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 2 },
  cardSub: { fontSize: 11, marginBottom: 4 },

  // Legend
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center' },
  legendText: { fontSize: 11, maxWidth: 90 },

  // Summary cards
  summaryCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderLeftWidth: 4 },
  summaryTitle: { fontSize: 14, fontWeight: '600', marginLeft: 6 },
  summaryCount: { fontSize: 18, fontWeight: 'bold' },
});
