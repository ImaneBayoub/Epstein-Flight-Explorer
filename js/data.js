import { normalizeName } from './utils.js'

export let cityCoords = new Map()
export let allFlights = []
export let filteredFlights = []
export let peopleData = []
export let peopleMap = new Map()
export let minDate = null
export let maxDate = null

export async function loadData() {
  const [worldData, cityData, flightsData, peopleRows] = await Promise.all([
    d3.json('data/world.geojson'),
    d3.json('data/cities.json'),
    d3.csv('data/flights.csv'),
    d3.csv('data/persons_enriched.csv')
  ])

  Object.entries(cityData).forEach(([key, value]) => {
    cityCoords.set(key, value)
  })

  allFlights = flightsData
  peopleData = peopleRows

  buildPeopleMap()

  const dates = allFlights.map(f => new Date(f.Date)).filter(d => !isNaN(d))
  minDate = new Date(Math.min(...dates))
  maxDate = new Date(Math.max(...dates))

  return {
    worldData,
    minDate,
    maxDate
  }
}

export function buildPeopleMap() {
  peopleMap = new Map()
  const personDetails = new Map()

  peopleData.forEach(row => {
    const displayName = normalizeName(row.display_name || '')
    const matchedName = normalizeName(row.matched_name || '')
    const passenger = normalizeName(row.passenger || '')
    const bio = (row.ref_bio || '').toString().trim()
    const imagePath = (row.image_path || '').toString().trim()
    const canonicalName = row.display_name || row.matched_name || ''

    const entry = {
      displayName: row.display_name || '',
      matchedName: row.matched_name || '',
      category: row.ref_category || 'Unknown'
    }

    ;[displayName, matchedName, passenger].forEach(key => {
      if (key) peopleMap.set(key, entry)
    })

    if (canonicalName) {
      personDetails.set(canonicalName, { bio, imagePath })
    }
  })

  return personDetails
}

export function getPeopleDetails() {
  const personDetails = new Map()
  peopleData.forEach(row => {
    const canonicalName = row.display_name || row.matched_name || ''
    if (canonicalName) {
      personDetails.set(canonicalName, {
        bio: (row.ref_bio || '').toString().trim(),
        imagePath: (row.image_path || '').toString().trim()
      })
    }
  })
  return personDetails
}

export function getFilteredFlights() {
  return filteredFlights
}

export function setFilteredFlights(flights) {
  filteredFlights = flights
}

let epsteinIslandFilter = false

export function setEpsteinIslandFilter(active) {
  epsteinIslandFilter = active
}

export function getEpsteinIslandFilter() {
  return epsteinIslandFilter
}

export function filterEpsteinIslandFlights(flights, active = null) {
  if (active === null) {
    active = epsteinIslandFilter
  }
  if (!active) return flights
  
  const epsteinIslandKeywords = ['cyril e. king', 'tist airport', 'tist']
  
  return flights.filter(f => {
    const origin = (f.Origin || '').toLowerCase()
    const dest = (f.Destination || '').toLowerCase()
    return epsteinIslandKeywords.some(k => origin.includes(k) || dest.includes(k))
  })
}
