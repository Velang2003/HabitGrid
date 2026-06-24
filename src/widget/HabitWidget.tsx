import React from 'react';
import { FlexWidget, TextWidget, WidgetInfo } from 'react-native-android-widget';
import { HabitWithStreak } from '../models/types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay } from 'date-fns';

interface Props {
  habit: HabitWithStreak | null;
  logs: Set<string>;
  widgetInfo?: WidgetInfo;
}

export function HabitWidget({ habit, logs, widgetInfo }: Props) {
  if (!habit) {
    return (
      <FlexWidget
        style={{
          height: 'match_parent',
          width: 'match_parent',
          backgroundColor: '#111111',
          justifyContent: 'center',
          alignItems: 'center',
          borderRadius: 20,
        }}
      >
        <TextWidget
          text="📋 No habits yet"
          style={{ color: '#888888', fontSize: 16 }}
          clickAction="OPEN_APP"
        />
        <TextWidget
          text="Tap to open HabitGrid"
          style={{ color: '#555555', fontSize: 12 }}
          clickAction="OPEN_APP"
        />
      </FlexWidget>
    );
  }

  const today = new Date();
  const todayStr = format(today, 'yyyy-MM-dd');
  const start = startOfMonth(today);
  const end = endOfMonth(today);
  const days = eachDayOfInterval({ start, end });
  const startDayOfWeek = getDay(start);

  const paddedDays: (Date | null)[] = [...Array(startDayOfWeek).fill(null), ...days];
  const remainder = paddedDays.length % 7;
  if (remainder > 0) {
    paddedDays.push(...Array(7 - remainder).fill(null));
  }
  const weeks: (Date | null)[][] = [];
  for (let i = 0; i < paddedDays.length; i += 7) {
    weeks.push(paddedDays.slice(i, i + 7));
  }

  // Retrieve exact physical dimensions of widget (fallback to 320x220)
  const width = widgetInfo?.width || 320;
  const height = widgetInfo?.height || 220;

  // Calculate maximum cell size that allows the calendar to remain square and center aligned
  const gridWidth = width - 28; // Padding margins
  const gridHeight = height - 94; // Header, day labels, margins, and footer height
  const numRows = weeks.length;

  const cellWidthLimit = Math.floor(gridWidth / 7);
  const cellHeightLimit = Math.floor(gridHeight / numRows);
  const cellSize = Math.max(24, Math.min(38, cellWidthLimit - 4, cellHeightLimit - 4));

  const accentColor = `#${habit.color_hex}`;
  const monthLabel = format(today, 'MMM yyyy');

  return (
    <FlexWidget
      style={{
        height: height,
        width: width,
        backgroundColor: '#0f0f0f',
        borderRadius: 20,
        padding: 14,
        flexDirection: 'column',
      }}
    >
      {/* Header row */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 10,
          width: 'match_parent',
        }}
      >
        {/* Prev button */}
        <FlexWidget
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#222',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="PREV_HABIT"
        >
          <TextWidget text="‹" style={{ color: '#ffffff', fontSize: 22 }} />
        </FlexWidget>

        {/* Habit title + streak */}
        <FlexWidget
          style={{ flex: 1, alignItems: 'center', marginHorizontal: 8 }}
          clickAction="OPEN_APP"
        >
          <TextWidget
            text={habit.title}
            style={{ color: '#ffffff', fontSize: 15, fontWeight: 'bold' }}
          />
          <FlexWidget style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
            <TextWidget
              text={`🔥 ${habit.current_streak}  ·  ${monthLabel}`}
              style={{ color: accentColor, fontSize: 11 }}
            />
          </FlexWidget>
        </FlexWidget>

        {/* Next button */}
        <FlexWidget
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            backgroundColor: '#222',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          clickAction="NEXT_HABIT"
        >
          <TextWidget text="›" style={{ color: '#ffffff', fontSize: 22 }} />
        </FlexWidget>
      </FlexWidget>

      {/* Day-of-week labels */}
      <FlexWidget
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          marginBottom: 4,
          width: 'match_parent',
        }}
      >
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <FlexWidget
            key={i}
            style={{
              width: cellSize,
              alignItems: 'center',
            }}
          >
            <TextWidget text={d} style={{ color: '#555', fontSize: 10 }} />
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* Calendar grid */}
      <FlexWidget
        style={{
          flexDirection: 'column',
          justifyContent: 'space-between',
          width: 'match_parent',
          flex: 1,
        }}
      >
        {weeks.map((week, wIdx) => (
          <FlexWidget
            key={wIdx}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center',
              width: 'match_parent',
              height: cellSize,
            }}
          >
            {week.map((day, dIdx) => {
              if (!day) {
                return (
                  <FlexWidget
                    key={`empty-${dIdx}`}
                    style={{
                      width: cellSize,
                      height: cellSize,
                    }}
                  />
                );
              }
              const dateStr = format(day, 'yyyy-MM-dd');
              const isMarked = logs.has(dateStr);
              const isToday = dateStr === todayStr;

              return (
                <FlexWidget
                  key={dateStr}
                  clickAction={`TOGGLE_${dateStr}`}
                  style={{
                    width: cellSize,
                    height: cellSize,
                    borderRadius: cellSize / 2,
                    backgroundColor: isMarked ? accentColor : isToday ? '#2a2a2a' : '#1a1a1a',
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: isToday && !isMarked ? 2 : 0,
                    borderColor: accentColor,
                  }}
                >
                  <TextWidget
                    text={format(day, 'd')}
                    style={{
                      color: isMarked ? '#ffffff' : isToday ? accentColor : '#888888',
                      fontSize: cellSize > 30 ? 13 : 11,
                      fontWeight: isToday || isMarked ? 'bold' : 'normal',
                    }}
                  />
                </FlexWidget>
              );
            })}
          </FlexWidget>
        ))}
      </FlexWidget>

      {/* Footer: Tap to toggle hint */}
      <FlexWidget
        style={{ alignItems: 'center', marginTop: 10 }}
        clickAction="OPEN_APP"
      >
        <TextWidget
          text="Tap a date to mark  ·  Tap name to open app"
          style={{ color: '#555555', fontSize: 11 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
