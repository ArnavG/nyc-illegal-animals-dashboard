<script>
  export let title = '';
  export let rows = [];
  export let selectedValues = [];
  export let width = 500;
  export let height = 210;
  export let margin = { top: 12, right: 120, bottom: 12, left: 160 };
  export let xScale;
  export let yScale;
  export let baseColor = 'steelblue';
  export let activeColor = '#2f5f8f';
  export let toggleValue = () => {};
  export let valueKey = 'name';
  export let boxClass = '';
  export let labelFontSize = 16;

  function rowName(d) {
    return d[valueKey];
  }
</script>

<section class="chart-box {boxClass}">
  <h2>{title}</h2>

  <svg {width} {height}>
    <g transform="translate({margin.left}, {margin.top})">
      {#each rows as d}
        <g>
          <rect
            class="bar"
            class:selected-bar={selectedValues.includes(rowName(d))}
            style:--active-color={activeColor}
            x="0"
            y={yScale(rowName(d))}
            width={xScale(d.count)}
            height={yScale.bandwidth()}
            fill={selectedValues.includes(rowName(d)) ? activeColor : baseColor}
            opacity={selectedValues.length && !selectedValues.includes(rowName(d)) ? 0.35 : 1}
            on:click={() => toggleValue(rowName(d))}
          />

          <text
            x="-8"
            y={yScale(rowName(d)) + yScale.bandwidth() / 2}
            text-anchor="end"
            dominant-baseline="middle"
            font-size={labelFontSize}
          >
            {rowName(d)}
          </text>

          <text
            x={xScale(d.count) + 5}
            y={yScale(rowName(d)) + yScale.bandwidth() / 2}
            dominant-baseline="middle"
            font-size={labelFontSize}
          >
            {d.count}
          </text>
        </g>
      {/each}
    </g>
  </svg>
</section>

<style>
  .chart-box {
    border: 1px solid #ddd;
    padding: 10px;
    background: white;
  }

  .chart-box h2 {
    margin-top: 0;
    margin-bottom: 6px;
    text-align: center;
  }

  svg {
    max-width: 100%;
  }

  .bar {
    cursor: pointer;
    stroke: transparent;
    stroke-width: 2px;
  }

  .bar:hover,
  .bar.selected-bar {
    stroke: black;
  }

  .bar:hover {
    fill: var(--active-color);
  }
</style>