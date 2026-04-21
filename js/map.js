import { parsePassengers, normalizeName, truncateText, formatShortDate } from './utils.js'
import { cityCoords, allFlights, peopleData, peopleMap, minDate, maxDate, getEpsteinIslandFilter, filterEpsteinIslandFlights } from './data.js'
import { setFilteredFlights, getFilteredFlights } from './data.js'

let svg, projection, path, mapGroup, flightsGroup, airportsGroup

export function initMap() {
  const width = window.innerWidth
  const height = window.innerHeight

  svg = d3.select('#map')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])

  projection = d3.geoNaturalEarth1()
    .scale(width / 6)
    .translate([width / 2, height / 2])

  path = d3.geoPath().projection(projection)

  mapGroup = svg.append('g').attr('class', 'map-layer')
  flightsGroup = svg.append('g').attr('class', 'flights-layer')
  airportsGroup = svg.append('g').attr('class', 'airports-layer')

  return { svg, projection, path }
}

export function renderWorldMap(worldData) {
  mapGroup.selectAll('path')
    .data(worldData.features)
    .join('path')
    .attr('class', 'country')
    .attr('d', path)
}

export function parseLocation(loc) {
  if (!loc) return null
  loc = loc.trim()

  const normalizedLoc = loc.toLowerCase()

  if (cityCoords.has(normalizedLoc)) {
    return { coords: [cityCoords.get(normalizedLoc).lon, cityCoords.get(normalizedLoc).lat], name: normalizedLoc }
  }

  const parts = normalizedLoc.split(',').map(p => p.trim())
  if (parts.length >= 1 && cityCoords.has(parts[0])) {
    return { coords: [cityCoords.get(parts[0]).lon, cityCoords.get(parts[0]).lat], name: parts[0] }
  }

  for (const part of parts) {
    if (cityCoords.has(part)) {
      return { coords: [cityCoords.get(part).lon, cityCoords.get(part).lat], name: part }
    }
  }

  for (const [key, coords] of cityCoords.entries()) {
    if (normalizedLoc.includes(key) || key.includes(normalizedLoc)) {
      return { coords: [coords.lon, coords.lat], name: key }
    }
  }

  return null
}

export function getAirportCoords(location) {
  const parsed = parseLocation(location)
  if (parsed) {
    const projected = projection(parsed.coords)
    return projected
  }
  return null
}

export function getRouteSegments(flightsByDate) {
  const segments = []
  flightsByDate.forEach((flights, date) => {
    flights.forEach(f => {
      const originCoords = getAirportCoords(f.Origin)
      const destCoords = getAirportCoords(f.Destination)
      if (originCoords && destCoords) {
        segments.push({
          ...f,
          startX: originCoords[0],
          startY: originCoords[1],
          endX: destCoords[0],
          endY: destCoords[1]
        })
      }
    })
  })
  return segments
}

export function renderFlights(dateStart, dateEnd, flightCountEl, selectedCategory, selectedPerson, showFlightDetailFn, personTooltip, flightTooltip, onFlightClick) {
  if (!allFlights.length || !minDate) return

  flightsGroup.selectAll('*').remove()
  airportsGroup.selectAll('*').remove()

  const start = dateStart || minDate
  const end = dateEnd || maxDate
  
  const currentDateStart = start
  const currentDateEnd = end

  let filtered = allFlights.filter(f => {
    if (!f.Date) return false
    const flightDate = new Date(f.Date)
    if (isNaN(flightDate.getTime())) return false
    if (flightDate < start || flightDate > end) return false

    if (selectedPerson || selectedCategory) {
      const passengers = parsePassengers(f.Passengers || f.passengers || '')
      for (const p of passengers) {
        const key = normalizeName(p)
        const matched = peopleMap.get(key)
        if (matched) {
          const name = matched.displayName || matched.matchedName || p
          if (selectedPerson && name === selectedPerson) return true
          if (selectedCategory && matched.category === selectedCategory) return true
        }
      }
      return false
    }
    return true
  })

  const epsteinIslandActive = getEpsteinIslandFilter()
  if (epsteinIslandActive) {
    filtered = filterEpsteinIslandFlights(filtered, true)
  }
  
  setFilteredFlights(filtered)
  const filteredFlights = filtered

  flightCountEl.textContent = filteredFlights.length

  const flightsByDate = d3.group(filteredFlights, d => d.Date)
  const routeSegments = getRouteSegments(flightsByDate)
  
  const routeCounts = new Map()
  routeSegments.forEach(f => {
    const key = `${f.Origin}|${f.Destination}`
    routeCounts.set(key, (routeCounts.get(key) || 0) + 1)
  })
  
  const maxCount = Math.max(...routeCounts.values(), 1)
  const minWidth = 1
  const maxWidth = 8

  const airports = new Set()
  routeSegments.forEach(f => {
    if (getAirportCoords(f.Origin)) airports.add(f.Origin)
    if (getAirportCoords(f.Destination)) airports.add(f.Destination)
  })

  const routeLayer = flightsGroup.append('g').attr('class', 'route-layer')
  const linesLayer = flightsGroup.append('g').attr('class', 'lines-layer')

  flightsGroup.append('defs').append('marker')
    .attr('id', 'arrowhead')
    .attr('viewBox', '0 -5 10 10')
    .attr('refX', 8)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-5L10,0L0,5')
    .attr('fill', '#69b3a2')

  const lineGenerator = d3.line()
    .curve(d3.curveBasis)

  routeSegments.forEach((f, i) => {
    const group = routeLayer.append('g').attr('class', 'route-group').attr('data-index', i)

    const isHighlighted = selectedPerson || selectedCategory
    const strokeColor = isHighlighted ? '#fcd34d' : '#69b3a2'
    
    const routeKey = `${f.Origin}|${f.Destination}`
    const count = routeCounts.get(routeKey) || 1
    const width = minWidth + (count / maxCount) * (maxWidth - minWidth)

    const midX = (f.startX + f.endX) / 2
    const midY = (f.startY + f.endY) / 2
    const dx = f.endX - f.startX
    const dy = f.endY - f.startY
    const dist = Math.sqrt(dx * dx + dy * dy)
    const offset = dist * 0.1
    const perpX = -dy / dist * offset
    const perpY = dx / dist * offset
    const ctrlX = midX + perpX
    const ctrlY = midY + perpY

    group.append('path')
      .attr('d', lineGenerator([[f.startX, f.startY], [ctrlX, ctrlY], [f.endX, f.endY]]))
      .attr('fill', 'none')
      .attr('stroke', strokeColor)
      .attr('stroke-width', isHighlighted ? 2 : width)
      .attr('stroke-opacity', isHighlighted ? 0.9 : 0.5)
      .attr('marker-end', 'url(#arrowhead)')
      .style('cursor', 'pointer')

    group.append('circle')
      .attr('cx', f.startX)
      .attr('cy', f.startY)
      .attr('r', isHighlighted ? 5 : 3)
      .attr('fill', strokeColor)
      .attr('stroke', '#fff')
      .attr('stroke-width', 1)

    if (i === routeSegments.length - 1 || routeSegments[i + 1].Date !== f.Date) {
      group.append('circle')
        .attr('cx', f.endX)
        .attr('cy', f.endY)
        .attr('r', isHighlighted ? 5 : 3)
        .attr('fill', '#fcd34d')
        .attr('stroke', '#fff')
        .attr('stroke-width', 1)
    }

    const allFlightsSameDate = flightsByDate.get(f.Date) || []
    const flightPassengers = parsePassengers(f.Passengers || f.passengers || '')

    group.on('mouseover', function(event) {
      d3.select(this).select('path').attr('stroke', '#fcd34d').attr('stroke-width', 3).attr('stroke-opacity', 1)
      const date = formatShortDate(f.Date)
      const route = `${f.Origin} → ${f.Destination}`
      let html = `<strong>${date}</strong><br><br>`
      html += `<em>Itinéraire</em><br>${route}<br><br>`
      html += `<strong>Passagers (${flightPassengers.length})</strong><br>`
      html += flightPassengers.slice(0, 10).join(', ')
      if (flightPassengers.length > 10) html += `... +${flightPassengers.length - 10}`
      flightTooltip.innerHTML = html
      flightTooltip.style.opacity = 1
      flightTooltip.style.left = (event.clientX + 15) + 'px'
      flightTooltip.style.top = event.clientY + 'px'
    })
    .on('mousemove', function(event) {
      flightTooltip.style.left = (event.clientX + 15) + 'px'
      flightTooltip.style.top = event.clientY + 'px'
    })
    .on('mouseout', function() {
      d3.select(this).select('path').attr('stroke', strokeColor).attr('stroke-width', isHighlighted ? 2 : width).attr('stroke-opacity', isHighlighted ? 0.9 : 0.5)
      flightTooltip.style.opacity = 0
    })
    .on('click', function() {
      if (onFlightClick) onFlightClick()
      const sameRoute = filteredFlights.filter(fl => 
        fl.Origin === f.Origin && fl.Destination === f.Destination
      )
      showFlightDetailFn(f, sameRoute, currentDateStart, currentDateEnd, null, 'route')
    })
  })

  airportsGroup.selectAll('circle')
    .data([...airports])
    .join('circle')
    .attr('cx', d => getAirportCoords(d)?.[0])
    .attr('cy', d => getAirportCoords(d)?.[1])
    .attr('r', 5)
    .attr('fill', '#69b3a2')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .style('display', d => getAirportCoords(d) ? null : 'none')
}

export function updateMapSize() {
  const width = window.innerWidth
  const height = window.innerHeight
  svg.attr('viewBox', [0, 0, width, height])
  projection.scale(width / 6).translate([width / 2, height / 2])
}
