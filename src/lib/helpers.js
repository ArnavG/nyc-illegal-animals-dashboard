import * as d3 from 'd3';

export const parseDate = d3.timeParse('%Y %b %d %I:%M:%S %p');
export const monthFormat = d3.timeFormat('%Y-%m');

export function toggleSelection(list, value) {
  return list.includes(value)
    ? list.filter(d => d !== value)
    : [...list, value];
}

export function monthLabel(date) {
  return d3.timeFormat('%B %Y')(date);
}

export function ntaName(feature) {
  return (
    feature.properties.NTAName ||
    feature.properties.ntaname ||
    feature.properties.NTANAME ||
    feature.properties.name ||
    feature.properties.Name ||
    'Unknown'
  );
}

export function findNeighborhood(row, ntaGeoData) {
  if (!ntaGeoData || !Number.isFinite(row.longitude) || !Number.isFinite(row.latitude)) {
    return 'Unknown';
  }

  const point = [row.longitude, row.latitude];
  const match = ntaGeoData.features.find((feature) => d3.geoContains(feature, [row.longitude, row.latitude]));

  return match ? ntaName(match) : 'Unknown';
}