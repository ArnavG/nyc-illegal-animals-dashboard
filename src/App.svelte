<script>
  import * as d3 from 'd3';
  import { onMount } from 'svelte';
  import Header from './lib/Header.svelte';
  import ActiveFilters from './lib/ActiveFilters.svelte';
  import BarChart from './lib/BarChart.svelte';
  import MonthFilter from './lib/MonthFilter.svelte';
  import { parseDate, toggleSelection, ntaName, findNeighborhood } from './lib/helpers.js';

  let loading = true;

  let data = [];
  let geoData;
  let ntaGeoData;

  let mapMode = 'borough';
  let colorMode = 'absolute';

  let selectedAnimals = [];
  let selectedBoroughs = [];
  let selectedStatuses = [];
  let selectedNeighborhoods = [];
  let selectedMonthRange = [];
  let startMonth = '';
  let endMonth = '';

  let hoveredBorough = '';
  let hoveredNeighborhood = '';
  let tooltipX = 0;
  let tooltipY = 0;

  let mapZoomGroup;
  let mapZoomBehavior;
  let mapZoomReady = false;

  let statusWidth = 470;
  let statusHeight = 170;
  let statusMargin = { top: 12, right: 70, bottom: 15, left: 90 };

  let mapWidth = 540;
  let mapHeight = 380;

  const animalBaseColor = 'steelblue';
  const animalActiveColor = '#2f5f8f';

  const statusBaseColor = 'purple';
  const statusActiveColor = '#4f1268';

  const fixedMapMax = 1300;
  const fixedNeighborhoodMax = 125;

  let width = 500;
  let height = 230;
  let margin = { top: 12, right: 120, bottom: 12, left: 160 };

  $: filteredData = data.filter(d => {
    if (selectedAnimals.length && !selectedAnimals.includes(d.animal)) return false;
    if (selectedBoroughs.length && !selectedBoroughs.includes(d.borough)) return false;
    if (selectedNeighborhoods.length && !selectedNeighborhoods.includes(d.neighborhood)) return false;
    if (selectedStatuses.length && !selectedStatuses.includes(d.status)) return false;

    if (selectedMonthRange.length === 2) {
      if (d.month < selectedMonthRange[0] || d.month >= selectedMonthRange[1]) return false;
    }

    return true;
  });

  $: animalChartData = data.filter(d => {
    if (selectedBoroughs.length && !selectedBoroughs.includes(d.borough)) return false;
    if (selectedNeighborhoods.length && !selectedNeighborhoods.includes(d.neighborhood)) return false;
    if (selectedStatuses.length && !selectedStatuses.includes(d.status)) return false;

    if (selectedMonthRange.length === 2) {
      if (d.month < selectedMonthRange[0] || d.month >= selectedMonthRange[1]) return false;
    }

    return true;
  });

  $: boroughChartData = data.filter(d => {
    if (selectedAnimals.length && !selectedAnimals.includes(d.animal)) return false;
    if (selectedStatuses.length && !selectedStatuses.includes(d.status)) return false;
    if (selectedNeighborhoods.length && !selectedNeighborhoods.includes(d.neighborhood)) return false;

    if (selectedMonthRange.length === 2) {
      if (d.month < selectedMonthRange[0] || d.month >= selectedMonthRange[1]) return false;
    }

    return true;
  });

  // Neighborhood map colors should not collapse to zero when neighborhoods are selected.
  // This lets unselected neighborhoods keep their original filtered base color, then fade by opacity.
  $: neighborhoodChartData = data.filter(d => {
    if (selectedAnimals.length && !selectedAnimals.includes(d.animal)) return false;
    if (selectedBoroughs.length && !selectedBoroughs.includes(d.borough)) return false;
    if (selectedStatuses.length && !selectedStatuses.includes(d.status)) return false;

    if (selectedMonthRange.length === 2) {
      if (d.month < selectedMonthRange[0] || d.month >= selectedMonthRange[1]) return false;
    }

    return true;
  });

  $: statusChartData = data.filter(d => {
    if (selectedAnimals.length && !selectedAnimals.includes(d.animal)) return false;
    if (selectedBoroughs.length && !selectedBoroughs.includes(d.borough)) return false;
    if (selectedNeighborhoods.length && !selectedNeighborhoods.includes(d.neighborhood)) return false;

    if (selectedMonthRange.length === 2) {
      if (d.month < selectedMonthRange[0] || d.month >= selectedMonthRange[1]) return false;
    }

    return true;
  });

  $: timeChartData = data.filter(d => {
    if (selectedAnimals.length && !selectedAnimals.includes(d.animal)) return false;
    if (selectedBoroughs.length && !selectedBoroughs.includes(d.borough)) return false;
    if (selectedNeighborhoods.length && !selectedNeighborhoods.includes(d.neighborhood)) return false;
    if (selectedStatuses.length && !selectedStatuses.includes(d.status)) return false;

    return true;
  });

  $: animalCounts = Array.from(
    d3.rollup(animalChartData, v => v.length, d => d.animal),
    ([animal, count]) => ({ animal, count })
  ).sort((a, b) => b.count - a.count);

  $: statusCounts = Array.from(
    d3.rollup(statusChartData, v => v.length, d => d.status),
    ([status, count]) => ({ status, count })
  ).sort((a, b) => b.count - a.count);

  $: monthCounts = Array.from(
    d3.rollup(timeChartData, v => v.length, d => +d.month),
    ([month, count]) => ({ month: new Date(+month), count })
  ).sort((a, b) => a.month - b.month);

  $: mapBoroughCounts = d3.rollup(
    boroughChartData,
    v => v.length,
    d => d.borough
  );

  $: mapNeighborhoodCounts = d3.rollup(
    neighborhoodChartData,
    v => v.length,
    d => d.neighborhood
  );

  $: relativeMapMax = d3.max(Array.from(mapBoroughCounts.values())) || 0;
  $: relativeNeighborhoodMax = d3.max(Array.from(mapNeighborhoodCounts.values())) || 0;

  $: mapScaleMax = colorMode === 'absolute'
    ? fixedMapMax
    : relativeMapMax;

  $: neighborhoodScaleMax = colorMode === 'absolute'
    ? fixedNeighborhoodMax
    : relativeNeighborhoodMax;

  $: mapColorScale = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, mapScaleMax || 1])
    .clamp(true);

  $: neighborhoodColorScale = d3.scaleSequential(d3.interpolateYlOrRd)
    .domain([0, neighborhoodScaleMax || 1])
    .clamp(true);

  $: legendValues = d3.range(0, 6).map(i =>
    Math.round(((mapScaleMax || 1) / 5) * i)
  );

  $: neighborhoodLegendValues = d3.range(0, 6).map(i =>
    Math.round(((neighborhoodScaleMax || 1) / 5) * i)
  );

  $: chartWidth = width - margin.left - margin.right;
  $: chartHeight = height - margin.top - margin.bottom;

  $: xScale = d3.scaleLinear()
    .domain([0, d3.max(animalCounts, d => d.count) || 0])
    .range([0, chartWidth]);

  $: yScale = d3.scaleBand()
    .domain(animalCounts.map(d => d.animal))
    .range([0, chartHeight])
    .padding(0.2);

  $: statusChartWidth = statusWidth - statusMargin.left - statusMargin.right;
  $: statusChartHeight = statusHeight - statusMargin.top - statusMargin.bottom;

  $: statusXScale = d3.scaleLinear()
    .domain([0, d3.max(statusCounts, d => d.count) || 0])
    .range([0, statusChartWidth]);

  $: statusYScale = d3.scaleBand()
    .domain(statusCounts.map(d => d.status))
    .range([0, statusChartHeight])
    .padding(0.2);

  $: currentMapGeo = mapMode === 'neighborhood' && ntaGeoData
    ? ntaGeoData
    : geoData;

  $: projection = currentMapGeo
    ? d3.geoMercator().fitSize([mapWidth, mapHeight], currentMapGeo)
    : null;

  $: pathGenerator = projection
    ? d3.geoPath().projection(projection)
    : null;

  $: if (mapZoomGroup && mapMode === 'neighborhood' && !mapZoomReady) {
    setupMapZoom();
    mapZoomReady = true;
  }

  $: activeFilters = [
    selectedAnimals.length ? `Animal: ${selectedAnimals.join(', ')}` : '',
    selectedBoroughs.length ? `Borough: ${selectedBoroughs.join(', ')}` : '',
    selectedNeighborhoods.length ? `Neighborhood: ${selectedNeighborhoods.join(', ')}` : '',
    selectedStatuses.length ? `Status: ${selectedStatuses.join(', ')}` : '',
    selectedMonthRange.length === 2
      ? `Months: ${d3.timeFormat('%b %Y')(selectedMonthRange[0])} - ${d3.timeFormat('%b %Y')(d3.timeMonth.offset(selectedMonthRange[1], -1))}`
      : ''
  ].filter(Boolean);

  onMount(async () => {
    const loadedRows = await d3.csv('/illegal_animals.csv', (d) => {
      return {
        id: d['Unique Key'],
        createdDate: parseDate(d['Created Date']),
        month: d3.timeMonth.floor(parseDate(d['Created Date'])),
        animal: d['Problem Detail (formerly Descriptor)'] === 'Turtle Under 4 inches Long'
          ? 'Turtle (< 4 in.)'
          : d['Problem Detail (formerly Descriptor)'],
        borough: d['Borough'],
        status: d['Status'],
        locationType: d['Location Type'],
        zip: d['Incident Zip'],
        latitude: +d['Latitude'],
        longitude: +d['Longitude'],
        neighborhood: 'Unknown'
      };
    });

    geoData = await d3.json('/nyc-boroughs.geojson');
    ntaGeoData = await d3.json('/nyc-ntas.geojson');

    data = loadedRows.map((d) => {
      return {
        ...d,
        neighborhood: findNeighborhood(d, ntaGeoData)
      };
    });

    loading = false;
  });

  function resetFilters() {
    selectedAnimals = [];
    selectedBoroughs = [];
    selectedNeighborhoods = [];
    selectedStatuses = [];
    selectedMonthRange = [];
    startMonth = '';
    endMonth = '';
  }

  function boroughName(feature) {
    return feature.properties.name.toUpperCase();
  }

  function moveTooltip(event, feature) {
    const [x, y] = d3.pointer(event);
    hoveredBorough = boroughName(feature);
    tooltipX = Math.min(x + 12, mapWidth - 180);
    tooltipY = Math.max(y - 12, 12);
  }

  function moveNeighborhoodTooltip(event, feature) {
    const [x, y] = d3.pointer(event);
    hoveredNeighborhood = ntaName(feature);
    tooltipX = Math.min(x + 12, mapWidth - 190);
    tooltipY = Math.max(y - 12, 12);
  }

  function switchToBoroughMap() {
    mapMode = 'borough';
    mapZoomGroup = null;
    mapZoomReady = false;
  }

  function switchToNeighborhoodMap() {
    mapMode = 'neighborhood';
    mapZoomGroup = null;
    mapZoomReady = false;
  }

  function setupMapZoom() {
    if (!mapZoomGroup) return;

    const svg = d3.select(mapZoomGroup.ownerSVGElement);

    mapZoomBehavior = d3.zoom()
      .scaleExtent([1, 8])
      .translateExtent([[0, 0], [mapWidth, mapHeight]])
      .extent([[0, 0], [mapWidth, mapHeight]])
      .on('zoom', (event) => {
        d3.select(mapZoomGroup).attr('transform', event.transform);
      });

    svg.call(mapZoomBehavior);
  }

  function zoomInMap() {
    if (!mapZoomGroup || !mapZoomBehavior) return;

    d3.select(mapZoomGroup.ownerSVGElement)
      .transition()
      .duration(250)
      .call(mapZoomBehavior.scaleBy, 1.4);
  }

  function zoomOutMap() {
    if (!mapZoomGroup || !mapZoomBehavior) return;

    d3.select(mapZoomGroup.ownerSVGElement)
      .transition()
      .duration(250)
      .call(mapZoomBehavior.scaleBy, 0.7);
  }

  function resetMapZoom() {
    if (!mapZoomGroup || !mapZoomBehavior) return;

    d3.select(mapZoomGroup.ownerSVGElement)
      .transition()
      .duration(250)
      .call(mapZoomBehavior.transform, d3.zoomIdentity);
  }
</script>

<main>
  <Header filteredCount={filteredData.length} totalCount={data.length} />

  {#if loading}
    <section class="loading-message">
      Loading complaint data and neighborhood boundaries...
    </section>
  {:else}
    <MonthFilter
      {monthCounts}
      {selectedMonthRange}
      {startMonth}
      {endMonth}
      setMonthRange={(value) => selectedMonthRange = value}
      setStartMonth={(value) => startMonth = value}
      setEndMonth={(value) => endMonth = value}
    />

    <ActiveFilters {activeFilters} {resetFilters} />

    <div class="dashboard">
      <div class="animal-box">
        <BarChart
          boxClass="animal-box"
          title="Complaints by Animal Type"
          rows={animalCounts}
          selectedValues={selectedAnimals}
          {width}
          {height}
          {margin}
          xScale={xScale}
          yScale={yScale}
          baseColor={animalBaseColor}
          activeColor={animalActiveColor}
          valueKey="animal"
          toggleValue={(value) => selectedAnimals = toggleSelection(selectedAnimals, value)}
        />
      </div>

      <section class="chart-box map-box">
        <h2>{mapMode === 'borough' ? 'Complaints by Borough' : 'Neighborhood Map'}</h2>
        <h5>
          {mapMode === 'borough'
            ? `Hover to see counts. Click to filter. ${colorMode === 'relative' ? 'Relative scale.' : 'Fixed scale.'}`
            : `Hover to see counts. Click to filter. Pinch to zoom. ${colorMode === 'relative' ? 'Relative scale.' : 'Fixed scale.'}`}
        </h5>

        <div class="map-mode-buttons">
          <button
            class:active-map-mode={mapMode === 'borough'}
            on:click={switchToBoroughMap}
          >
            Borough
          </button>

          <button
            class:active-map-mode={mapMode === 'neighborhood'}
            on:click={switchToNeighborhoodMap}
          >
            Neighborhood
          </button>
        </div>

        <div class="map-mode-buttons scale-mode-buttons">
          <button
            class:active-map-mode={colorMode === 'relative'}
            on:click={() => colorMode = 'relative'}
          >
            Relative
          </button>

          <button
            class:active-map-mode={colorMode === 'absolute'}
            on:click={() => colorMode = 'absolute'}
          >
            Absolute
          </button>
        </div>

        {#if currentMapGeo && pathGenerator}
          <svg width={mapWidth} height={mapHeight}>
            {#if mapMode === 'borough'}
              {#each geoData.features as feature}
                <path
                  d={pathGenerator(feature)}
                  fill={mapColorScale(mapBoroughCounts.get(boroughName(feature)) || 0)}
                  opacity={selectedBoroughs.length && !selectedBoroughs.includes(boroughName(feature)) ? 0.25 : 1}
                  stroke="white"
                  on:click={() => {
                    selectedBoroughs = toggleSelection(selectedBoroughs, boroughName(feature));
                    selectedNeighborhoods = [];
                  }}
                  on:mousemove={(event) => moveTooltip(event, feature)}
                  on:mouseleave={() => hoveredBorough = ''}
                />
              {/each}

              {#if hoveredBorough}
                <g transform="translate({tooltipX}, {tooltipY})" class="map-tooltip">
                  <rect width="165" height="54" rx="4" />
                  <text x="10" y="21">{hoveredBorough}</text>
                  <text x="10" y="40">{mapBoroughCounts.get(hoveredBorough) || 0} complaints</text>
                </g>
              {/if}

              <g transform="translate({mapWidth - 340}, {mapHeight - 38})">
                <text x="0" y="-8" font-size="12">Complaints</text>

                {#each legendValues.slice(0, -1) as value, i}
                  <rect
                    x={i * 42}
                    y="0"
                    width="42"
                    height="12"
                    fill={mapColorScale(value)}
                  />
                  <text x={i * 42} y="30" font-size="11">{value}</text>
                {/each}
              </g>
            {:else}
              <g bind:this={mapZoomGroup}>
                {#each ntaGeoData.features as feature}
                  <path
                    d={pathGenerator(feature)}
                    fill={neighborhoodColorScale(mapNeighborhoodCounts.get(ntaName(feature)) || 0)}
                    opacity={selectedNeighborhoods.length && !selectedNeighborhoods.includes(ntaName(feature)) ? 0.4 : 1}
                    stroke="white"
                    stroke-width="0.6"
                    on:click={() => {
                      selectedNeighborhoods = toggleSelection(selectedNeighborhoods, ntaName(feature));
                      selectedBoroughs = [];
                    }}
                    on:mousemove={(event) => moveNeighborhoodTooltip(event, feature)}
                    on:mouseleave={() => hoveredNeighborhood = ''}
                  />
                {/each}
              </g>

              {#if hoveredNeighborhood}
                <g transform="translate({tooltipX}, {tooltipY})" class="map-tooltip">
                  <rect width="205" height="54" rx="4" />
                  <text x="10" y="21">{hoveredNeighborhood}</text>
                  <text x="10" y="40">{mapNeighborhoodCounts.get(hoveredNeighborhood) || 0} complaints</text>
                </g>
              {/if}

              <g transform="translate({mapWidth - 340}, {mapHeight - 38})">
                <text x="0" y="-8" font-size="12">Complaints</text>

                {#each neighborhoodLegendValues.slice(0, -1) as value, i}
                  <rect
                    x={i * 42}
                    y="0"
                    width="42"
                    height="12"
                    fill={neighborhoodColorScale(value)}
                  />
                  <text x={i * 42} y="30" font-size="11">{value}</text>
                {/each}
              </g>

              <g class="svg-zoom-controls" transform="translate({mapWidth - 58}, {mapHeight - 132})">
                <text x="0" y="-8">Zoom</text>

                <g class="svg-zoom-button" on:click={zoomInMap}>
                  <rect x="0" y="0" width="44" height="30" rx="6" />
                  <text x="22" y="20" text-anchor="middle">+</text>
                </g>

                <g class="svg-zoom-button" transform="translate(0, 36)" on:click={zoomOutMap}>
                  <rect x="0" y="0" width="44" height="30" rx="6" />
                  <text x="22" y="20" text-anchor="middle">-</text>
                </g>

                <g class="svg-zoom-button" transform="translate(0, 72)" on:click={resetMapZoom}>
                  <rect x="0" y="0" width="44" height="30" rx="6" />
                  <text x="22" y="20" text-anchor="middle">Reset</text>
                </g>
              </g>
            {/if}
          </svg>
        {/if}
      </section>

      <div class="status-box">
        <BarChart
          boxClass="status-box"
          title="Complaints by Status"
          rows={statusCounts}
          selectedValues={selectedStatuses}
          width={statusWidth}
          height={statusHeight}
          margin={statusMargin}
          xScale={statusXScale}
          yScale={statusYScale}
          baseColor={statusBaseColor}
          activeColor={statusActiveColor}
          valueKey="status"
          labelFontSize={11}
          toggleValue={(value) => selectedStatuses = toggleSelection(selectedStatuses, value)}
        />
      </div>
    </div>
  {/if}

  <style>
    main {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding-top: 24px;
      padding-bottom: 48px;
    }

    .loading-message {
      border: 1px solid #ddd;
      border-radius: 6px;
      padding: 18px;
      color: #666;
      text-align: center;
      background: white;
    }

    .dashboard {
      display: grid;
      grid-template-columns: 0.9fr 1.1fr;
      grid-template-areas:
        "animal map"
        "status map";
      gap: 12px 24px;
      align-items: stretch;
    }

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

    .animal-box {
      grid-area: animal;
    }

    .map-box {
      grid-area: map;
      padding-bottom: 18px;
    }

    .map-box h5 {
      text-align: center;
      margin-top: 18px;
      margin-bottom: 12px;
      color: #666;
    }

    .status-box {
      grid-area: status;
    }

    svg {
      max-width: 100%;
    }

    rect,
    path {
      cursor: pointer;
    }

    path:hover {
      stroke: black;
      stroke-width: 2;
    }

    .map-tooltip {
      pointer-events: none;
    }

    .map-tooltip rect {
      fill: #171722;
      opacity: 0.95;
      stroke: none;
    }

    .map-tooltip text {
      fill: white;
      font-size: 13px;
      pointer-events: none;
    }

    button {
      background: white;
      border: 1px solid #b8c1cc;
      border-radius: 6px;
      color: #222;
      cursor: pointer;
      font: inherit;
      padding: 6px 12px;
    }

    button:hover {
      border-color: #555;
      background: #f6f6f6;
    }

    button:active {
      background: #eeeeee;
    }

    .map-mode-buttons {
      display: flex;
      justify-content: center;
      gap: 8px;
      margin-bottom: 8px;
    }

    .scale-mode-buttons {
      margin-top: -2px;
      margin-bottom: 8px;
    }

    .scale-mode-buttons button {
      font-size: 13px;
      padding: 4px 10px;
    }

    .active-map-mode {
      background: #eeeeee;
      border-color: #555;
    }

    .svg-zoom-controls text {
      fill: #666;
      font-size: 11px;
      pointer-events: none;
    }

    .svg-zoom-button {
      cursor: pointer;
    }

    .svg-zoom-button rect {
      fill: white;
      stroke: #b8c1cc;
    }

    .svg-zoom-button:hover rect {
      fill: #f6f6f6;
      stroke: #555;
    }

    .svg-zoom-button text {
      fill: #222;
      font-size: 12px;
      pointer-events: none;
    }
  </style>
</main>