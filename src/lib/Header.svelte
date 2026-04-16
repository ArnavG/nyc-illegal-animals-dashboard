<script>
  export let filteredCount = 0;
  export let totalCount = 0;

  $: percentSelected = totalCount
    ? Math.round((filteredCount / totalCount) * 100)
    : 0;
</script>

<header class="dashboard-header">
  <div>
    <p class="eyebrow">NYC 311 Complaints, Jan 2020-Apr 2026</p>
    <h1>Illegal Animal Complaints in New York City</h1>
    <p class="dashboard-description">
      Explore where complaints are concentrated, which animals are reported most often, how case status
      differs, and how reports changed over time.
    </p>
  </div>

  <div class="header-metric">
    <strong>
      {filteredCount.toLocaleString()}
      ({percentSelected}%)
    </strong>
    <span>of {totalCount.toLocaleString()} complaints selected</span>
  </div>
</header>

<style>
  .dashboard-header {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 300px;
    gap: 24px;
    align-items: center;
    margin-bottom: 20px;
  }

  .dashboard-header > div:first-child {
    display: grid;
    grid-template-columns: 1fr;
  }

  .eyebrow {
    margin: 0 0 10px;
    color: #5d6670;
    font-size: 13px;
    font-weight: bold;
    letter-spacing: 2px;
    text-align: left;
    text-transform: uppercase;
  }

  h1 {
    margin: 0 0 12px;
    font-size: 40px;
    font-weight: bold;
    line-height: 1.05;
    text-align: left;
  }

  .dashboard-description {
    max-width: 820px;
    margin: 0;
    color: #666;
    line-height: 1.4;
    text-align: left;
  }

  .header-metric {
    width: 250px;
    justify-self: start;
    margin-left: -10px;
    border: 1px solid #ddd;
    border-radius: 8px;
    padding: 14px 20px;
    background: white;
    text-align: left;
  }

  .header-metric strong {
    display: block;
    font-size: 24px;
    line-height: 1;
  }

  .header-metric span {
    color: #666;
    white-space: nowrap;
  }

  @media (max-width: 800px) {
    .dashboard-header {
      display: block;
    }

    h1 {
      font-size: 40px;
    }

    .header-metric {
      margin-top: 16px;
    }
  }
</style>