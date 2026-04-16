<script>
  import * as d3 from 'd3';
  import { tick } from 'svelte';
  import { monthFormat, monthLabel } from './helpers.js';

  export let monthCounts = [];
  export let selectedMonthRange = [];
  export let startMonth = '';
  export let endMonth = '';
  export let setMonthRange = () => {};
  export let setStartMonth = () => {};
  export let setEndMonth = () => {};

  let showMonthFilter = false;
  let brushGroup;
  let brush;
  let hoveredMonth = null;
  let monthTooltipX = 0;
  let monthTooltipY = 0;

  let hadMonthSelection = false;

  let timeWidth = 1100;
  let timeHeight = 260;
  let timeMargin = { top: 20, right: 40, bottom: 40, left: 50 };

  $: timeChartWidth = timeWidth - timeMargin.left - timeMargin.right;
  $: timeChartHeight = timeHeight - timeMargin.top - timeMargin.bottom;

  $: timeExtent = d3.extent(monthCounts, d => d.month);

  $: timeXScale = d3.scaleTime()
    .domain(timeExtent[0] && timeExtent[1]
      ? [timeExtent[0], d3.timeMonth.offset(timeExtent[1], 1)]
      : [new Date(2020, 0, 1), new Date(2026, 4, 1)]
    )
    .range([0, timeChartWidth]);

  $: timeBarWidth = monthCounts.length
    ? timeChartWidth / monthCounts.length
    : 0;

  $: timeYScale = d3.scaleLinear()
    .domain([0, d3.max(monthCounts, d => d.count) || 0])
    .range([timeChartHeight, 0]);

  $: if (brushGroup && monthCounts.length > 0 && !brush) {
    setupBrush();
  }

  $: if (selectedMonthRange.length === 2) {
    hadMonthSelection = true;
  }
  
  $: if (brushGroup && brush && selectedMonthRange.length === 0 && hadMonthSelection) {
    hadMonthSelection = false;
    d3.select(brushGroup).call(brush.move, null);
  }


  async function setupBrush() {
    await tick();

    if (!brushGroup) return;

    brush = d3.brushX()
      .extent([[0, 0], [timeChartWidth, timeChartHeight]])
      .handleSize(10)
      .on('brush end', (event) => {
        if (!event.selection) {
          setMonthRange([]);
          setStartMonth('');
          setEndMonth('');
          return;
        }

        const [x0, x1] = event.selection;
        const start = d3.timeMonth.floor(timeXScale.invert(x0));
        const end = d3.timeMonth.ceil(timeXScale.invert(x1));

        setMonthRange([start, end]);
        setStartMonth(monthFormat(start));
        setEndMonth(monthFormat(d3.timeMonth.offset(end, -1)));
      });

    const brushSelection = d3.select(brushGroup).call(brush);

    if (selectedMonthRange.length === 2) {
      brushSelection.call(brush.move, [
        timeXScale(selectedMonthRange[0]),
        timeXScale(selectedMonthRange[1])
      ]);
    }
  }

  async function applyMonthFilter() {
    if (!startMonth || !endMonth) return;

    const start = new Date(`${startMonth}-01T00:00:00`);
    const end = d3.timeMonth.offset(new Date(`${endMonth}-01T00:00:00`), 1);

    setMonthRange([start, end]);

    await tick();

    if (brushGroup && brush) {
      d3.select(brushGroup).call(brush.move, [
        timeXScale(start),
        timeXScale(end)
      ]);
    }
  }

  function clearMonthFilter() {
    setStartMonth('');
    setEndMonth('');
    setMonthRange([]);

    if (brushGroup && brush) {
      d3.select(brushGroup).call(brush.move, null);
    }
  }

  function toggleMonthFilter() {
    showMonthFilter = !showMonthFilter;
    hoveredMonth = null;
    brush = null;
  }

  function monthIsSelected(month) {
    if (selectedMonthRange.length !== 2) return false;
    return month >= selectedMonthRange[0] && month < selectedMonthRange[1];
  }

  function moveMonthTooltipFromBrush(event) {
    if (!brushGroup) return;

    const [x, y] = d3.pointer(event, brushGroup);
    const month = d3.timeMonth.floor(timeXScale.invert(x));

    const found = monthCounts.find(d => +d.month === +month);

    hoveredMonth = found || {
      month,
      count: 0
    };

    monthTooltipX = Math.min(x + 12, timeChartWidth - 170);
    monthTooltipY = Math.max(y - 12, 12);
  }
</script>

<section class="month-filter">
  <button class="dropdown-button" on:click={toggleMonthFilter}>
    Click to Filter by Complaint Month {showMonthFilter ? '▲' : '▼'}
  </button>

  {#if showMonthFilter}
    <div class="dropdown-content">
      <div class="month-controls">
        <label>
          Start month
          <input
            type="month"
            value={startMonth}
            on:input={(event) => setStartMonth(event.currentTarget.value)}
          />
        </label>

        <label>
          End month
          <input
            type="month"
            value={endMonth}
            on:input={(event) => setEndMonth(event.currentTarget.value)}
          />
        </label>

        <button on:click={applyMonthFilter}>Apply month filter</button>
        <button on:click={clearMonthFilter}>Clear month filter</button>
      </div>

      <p class="month-note">Use the month fields for exact filtering, or brush the chart below to set the same start and end months.</p>

      <svg width={timeWidth} height={timeHeight}>
        <g transform="translate({timeMargin.left}, {timeMargin.top})">
          {#each monthCounts as d}
            <rect
              x={timeXScale(d.month)}
              y={timeYScale(d.count)}
              width={timeBarWidth}
              height={timeChartHeight - timeYScale(d.count)}
              fill={hoveredMonth && +hoveredMonth.month === +d.month
                ? '#2f6f73'
                : selectedMonthRange.length === 2
                  ? monthIsSelected(d.month) ? '#2f6f73' : '#d9ddca'
                  : '#89995c'}
            />
          {/each}

          {#each monthCounts.filter((d, i) => i % 12 === 0) as d}
            <text
              x={timeXScale(d.month)}
              y={timeChartHeight + 20}
              font-size="11"
            >
              {d.month.getFullYear()}
            </text>
          {/each}

          <g
            bind:this={brushGroup}
            on:mousemove={moveMonthTooltipFromBrush}
            on:mouseleave={() => hoveredMonth = null}
          ></g>

          {#if hoveredMonth}
            <g transform="translate({monthTooltipX}, {monthTooltipY})" class="month-tooltip">
              <rect width="150" height="54" rx="4" />
              <text x="10" y="21">{monthLabel(hoveredMonth.month)}</text>
              <text x="10" y="40">{hoveredMonth.count} complaints</text>
            </g>
          {/if}
        </g>
      </svg>
    </div>
  {/if}
</section>

<style>
  .month-filter {
    padding: 0;
    margin-bottom: 20px;
    background: white;
    border: none;
    width: 100%;
    box-sizing: border-box;
  }

  .dropdown-button {
    width: 100%;
    box-sizing: border-box;
    text-align: left;
    font-weight: bold;
    background: white;
    border: 1px solid #b8c1cc;
    border-radius: 6px;
    padding: 8px 12px;
    cursor: pointer;
  }

  .dropdown-content {
    margin-top: 12px;
  }

  .month-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 14px;
    align-items: end;
    margin: 18px 0 12px;
  }

  .month-controls label {
    display: grid;
    gap: 6px;
    color: #666;
    font-size: 15px;
  }

  .month-note {
    margin-top: 0;
    color: #666;
  }

  svg {
    max-width: 100%;
  }

  rect {
    cursor: pointer;
  }

  :global(.selection) {
    fill: #d7dde4;
    fill-opacity: 0.55;
    stroke: #506070;
  }

  :global(.handle) {
    fill: #506070;
  }

  .month-tooltip {
    pointer-events: none;
  }

  .month-tooltip rect {
    fill: #171722;
    opacity: 0.95;
    stroke: none;
  }

  .month-tooltip text {
    fill: white;
    font-size: 13px;
    pointer-events: none;
  }

  input[type="month"] {
    border: 1px solid #b8c1cc;
    border-radius: 6px;
    background: white;
    color: #222;
    font: inherit;
    padding: 6px 10px;
  }

  input[type="month"]:hover {
    border-color: #555;
  }

  input[type="month"]:focus {
    border-color: #555;
    outline: none;
  }
</style>