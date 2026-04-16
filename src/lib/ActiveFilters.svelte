<script>
  export let activeFilters = [];
  export let resetFilters = () => {};
</script>

<div class="filters active-filter-bar">
  <div>
    <strong>Active filters</strong>
    <span>{activeFilters.length ? activeFilters.join(' / ') : 'None'}</span>
  </div>

  <button on:click={resetFilters}>Reset all filters</button>
</div>

<style>
  .filters {
    text-align: center;
    margin-bottom: 16px;
  }

  .active-filter-bar {
    border: 1px solid #ddd;
    padding: 10px;
    margin-bottom: 16px;
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 12px;
    text-align: left;
  }

  .active-filter-bar > div {
    flex: 1;
    min-width: 0;
  }

  .active-filter-bar span {
    margin-left: 8px;
    color: #666;
    line-height: 1.35;
  }

  .active-filter-bar button {
    flex: 0 0 auto;
    white-space: nowrap;
    align-self: flex-start;
  }
</style>