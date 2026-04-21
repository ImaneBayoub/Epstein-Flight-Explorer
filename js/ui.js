import { normalizeName, parsePassengers, formatDate, truncateText, formatShortDate } from './utils.js'
import { peopleMap, peopleData, allFlights, getFilteredFlights, getEpsteinIslandFilter } from './data.js'
import { getSelectedPerson, getSelectedCategory } from './chord.js'

let sharedFlights = []
let currentFlightIndex = 0
let selectedPassengers = []
let sharedPassengerPair = []
let currentDisplayMode = null

function getFilterInfoHtml(dateStart, dateEnd) {
  const filterParts = []
  
  const startStr = dateStart ? formatShortDate(dateStart).split(' ')[0] : 'min'
  const endStr = dateEnd ? formatShortDate(dateEnd).split(' ')[0] : 'max'
  filterParts.push(`Période: ${startStr} → ${endStr}`)
  
  if (getEpsteinIslandFilter()) {
    filterParts.push('Île Epstein')
  }
  
  const category = getSelectedCategory()
  if (category) {
    filterParts.push(`Catégorie: ${category}`)
  }
  
  const person = getSelectedPerson()
  if (person) {
    filterParts.push(`Personne: ${person}`)
  }
  
  return filterParts.length > 0 ? filterParts.join(' • ') : 'Tous vols'
}

function renderSharedFlightInfo(infoEl, currentFlight, totalFlights, dateStart, dateEnd) {
  const filterInfo = getFilterInfoHtml(dateStart, dateEnd)
  
  infoEl.innerHTML = `
    <div class="filter-info" style="color:#64748b;font-size:10px;margin-bottom:4px">${filterInfo}</div>
  `
  
  if (!currentFlight) return
  
  if (currentDisplayMode === 'chord') {
    const flightDate = currentFlight?.Date ? formatShortDate(currentFlight.Date) : ''
    let origin = currentFlight?.Origin || 'Inconnu'
    let dest = currentFlight?.Destination || 'Inconnu'
    
    infoEl.innerHTML += `
      <div class="passenger-names" style="font-weight:bold">${origin} ↔ ${dest}</div>
      ${flightDate ? `<div style="color:#94a3b8;font-size:11px;margin-top:2px">${flightDate}</div>` : ''}
      <div style="color:#fbbf24;font-size:12px;font-weight:bold;margin-top:4px">${totalFlights} vol${totalFlights > 1 ? 's' : ''} ensemble</div>
    `
  } else if (currentDisplayMode === 'route') {
    const flightDate = currentFlight?.Date ? formatShortDate(currentFlight.Date) : ''
    const origin = currentFlight?.Origin || 'Inconnu'
    const dest = currentFlight?.Destination || 'Inconnu'
    
    infoEl.innerHTML += `
      <div class="passenger-names" style="font-weight:bold">${origin} → ${dest}</div>
      ${flightDate ? `<div style="color:#94a3b8;font-size:11px;margin-top:2px">${flightDate}</div>` : ''}
      <div style="color:#fbbf24;font-size:12px;font-weight:bold;margin-top:4px">${totalFlights} vol${totalFlights > 1 ? 's' : ''}</div>
    `
  } else if (currentDisplayMode === 'person') {
    const flightDate = currentFlight?.Date ? formatShortDate(currentFlight.Date) : ''
    const origin = currentFlight?.Origin || 'Inconnu'
    const dest = currentFlight?.Destination || 'Inconnu'
    
    infoEl.innerHTML += `
      <div class="passenger-names" style="font-weight:bold">${origin} → ${dest}</div>
      ${flightDate ? `<div style="color:#94a3b8;font-size:11px;margin-top:2px">${flightDate}</div>` : ''}
    `
  } else if (sharedPassengerPair.length > 0) {
    const flightText = totalFlights === 1 ? '1 vol' : `${totalFlights} vols`
    
    const flightDate = currentFlight?.Date ? formatShortDate(currentFlight.Date) : ''
    const origin = currentFlight?.Origin || 'Inconnu'
    const dest = currentFlight?.Destination || 'Inconnu'
    
    infoEl.innerHTML += `
      <div class="passenger-names" style="font-weight:bold">${origin} → ${dest}</div>
      ${flightDate ? `<div style="color:#94a3b8;font-size:11px;margin-top:2px">${flightDate}</div>` : ''}
    `
  }
  
  infoEl.style.display = 'block'
}

function findSharedFlights(passenger1, passenger2, dateStart, dateEnd) {
  const key1 = normalizeName(passenger1)
  const key2 = normalizeName(passenger2)
  
  let flightsToSearch = getFilteredFlights()
  
  if (dateStart && dateEnd) {
    const startTime = dateStart.getTime()
    const endTime = dateEnd.getTime()
    
    flightsToSearch = flightsToSearch.filter(flight => {
      if (!flight.Date) return false
      const flightDate = new Date(flight.Date)
      if (isNaN(flightDate.getTime())) return false
      return flightDate.getTime() >= startTime && flightDate.getTime() <= endTime
    })
  }
  
  const shared = []
  flightsToSearch.forEach(flight => {
    const passengers = parsePassengers(flight.Passengers)
    const passengerKeys = passengers.map(p => normalizeName(p))
    
    if (passengerKeys.includes(key1) && passengerKeys.includes(key2)) {
      shared.push(flight)
    }
  })
  
  shared.sort((a, b) => new Date(a.Date) - new Date(b.Date))
  return shared
}

function findFlightsForPerson(personName, dateStart, dateEnd) {
  const key = normalizeName(personName)
  
  let flightsToSearch = getFilteredFlights()
  
  if (dateStart && dateEnd) {
    const startTime = dateStart.getTime()
    const endTime = dateEnd.getTime()
    
    flightsToSearch = flightsToSearch.filter(flight => {
      if (!flight.Date) return false
      const flightDate = new Date(flight.Date)
      if (isNaN(flightDate.getTime())) return false
      return flightDate.getTime() >= startTime && flightDate.getTime() <= endTime
    })
  }
  
  const personFlights = []
  flightsToSearch.forEach(flight => {
    const passengers = parsePassengers(flight.Passengers)
    const passengerKeys = passengers.map(p => normalizeName(p))
    
    if (passengerKeys.includes(key)) {
      personFlights.push(flight)
    }
  })
  
  personFlights.sort((a, b) => new Date(a.Date) - new Date(b.Date))
  return personFlights
}

function renderFlight(flight, allFlightsSameDate) {
  const date = formatDate(flight.Date)
  const route = `${flight.Origin} → ${flight.Destination}`

  const flightDetailDate = document.getElementById('flight-detail-date')
  const flightDetailRoute = document.getElementById('flight-detail-route')
  const passengersOnPlane = document.getElementById('passengers-on-plane')
  const flightCounter = document.getElementById('flight-counter')
  const prevBtn = document.getElementById('prev-flight')
  const nextBtn = document.getElementById('next-flight')
  const flightNav = document.getElementById('flight-detail-nav')

  if (currentDisplayMode === 'route') {
    const totalVols = sharedFlights.length
    const flightText = totalVols === 1 ? '1 vol' : `${totalVols} vols`
    flightDetailDate.textContent = flightText
    flightDetailRoute.textContent = route.replace(' → ', ' ↔ ')
  } else if (currentDisplayMode === 'chord') {
    const getDisplayName = (name) => {
      if (!name) return ''
      const key = normalizeName(name)
      const matched = peopleMap.get(key)
      return matched ? matched.displayName || matched.matchedName || name : name
    }
    const name1 = getDisplayName(sharedPassengerPair[0])
    const name2 = getDisplayName(sharedPassengerPair[1])
    const totalVols = sharedFlights.length
    const flightText = totalVols === 1 ? '1 vol' : `${totalVols} vols`
    flightDetailDate.textContent = flightText
    flightDetailRoute.textContent = `${name1} ↔ ${name2}`
  } else if (currentDisplayMode === 'person') {
    const getDisplayName = (name) => {
      if (!name) return ''
      const key = normalizeName(name)
      const matched = peopleMap.get(key)
      return matched ? matched.displayName || matched.matchedName || name : name
    }
    const name1 = getDisplayName(sharedPassengerPair[0])
    const totalVols = sharedFlights.length
    const flightText = totalVols === 1 ? '1 vol' : `${totalVols} vols`
    flightDetailDate.textContent = flightText
    flightDetailRoute.textContent = name1
  } else {
    flightDetailDate.textContent = date
    flightDetailRoute.textContent = route
  }
  
  if (sharedFlights.length > 1 && flightNav) {
    flightCounter.textContent = `Vol ${currentFlightIndex + 1} / ${sharedFlights.length}`
    if (prevBtn) prevBtn.disabled = currentFlightIndex === 0
    if (nextBtn) nextBtn.disabled = currentFlightIndex === sharedFlights.length - 1
    flightNav.style.display = 'flex'
  } else if (flightNav) {
    flightNav.style.display = 'none'
  }

  const allPassengers = []
  allFlightsSameDate.forEach(fl => {
    const passengers = parsePassengers(fl.Passengers)
    passengers.forEach(p => {
      const key = normalizeName(p)
      const matched = peopleMap.get(key)
      if (matched) {
        const row = peopleData.find(r => normalizeName(r.display_name || '') === key || normalizeName(r.matched_name || '') === key)
        allPassengers.push({
          name: matched.displayName || matched.matchedName || p,
          category: matched.category,
          imagePath: row ? row.image_path : '',
          bio: row ? (row.ref_bio || '') : ''
        })
      } else {
        allPassengers.push({ name: p, category: 'Unknown', imagePath: '', bio: '' })
      }
    })
  })

  const uniquePassengers = []
  const seen = new Set()
  allPassengers.forEach(p => {
    const key = normalizeName(p.name)
    if (!seen.has(key)) {
      seen.add(key)
      uniquePassengers.push(p)
    }
  })

  passengersOnPlane.innerHTML = ''

  const containerWidth = 600
  const totalPassengers = uniquePassengers.length
  const cols = Math.min(totalPassengers, 9)
  const circleSize = 45
  const rowSpacing = circleSize + 8
  const rows = Math.ceil(totalPassengers / cols)
  const gridWidth = cols * (circleSize + 8)
  const startX = (containerWidth - gridWidth) / 2 + 20
  const startY = (280 - rows * rowSpacing) / 2

  uniquePassengers.forEach((p, i) => {
    const row = Math.floor(i / cols)
    const col = i % cols
    const x = startX + col * (circleSize + 8)
    const y = startY + row * rowSpacing

    const seat = document.createElement('div')
    seat.className = 'passenger-seat'
    seat.style.left = x + 'px'
    seat.style.top = y + 'px'
    seat.style.width = circleSize + 'px'
    seat.style.height = circleSize + 'px'
    seat.style.fontSize = (circleSize * 0.4) + 'px'

    if (p.imagePath) {
      seat.innerHTML = `<img src="${p.imagePath}" alt="${p.name}" onerror="this.style.display='none'; this.parentElement.innerHTML='${p.name.charAt(0).toUpperCase()}';">`
    } else {
      seat.textContent = p.name.charAt(0).toUpperCase()
    }

    const personTooltip = document.getElementById('person-tooltip')
    seat.addEventListener('mouseover', function(event) {
      let html = `<strong>${p.name}</strong><br><em>${p.category}</em>`
      if (p.bio) {
        const shortBio = truncateText(p.bio, 150)
        html += `<br><br><span style="font-size:11px;opacity:0.85">${shortBio}</span>`
      }
      personTooltip.innerHTML = html
      personTooltip.style.opacity = 1
      personTooltip.style.left = (event.clientX + 15) + 'px'
      personTooltip.style.top = (event.clientY - 80) + 'px'
    })
    seat.addEventListener('mousemove', function(event) {
      personTooltip.style.left = (event.clientX + 15) + 'px'
      personTooltip.style.top = (event.clientY - 80) + 'px'
    })
    seat.addEventListener('mouseout', () => { personTooltip.style.opacity = 0 })

    passengersOnPlane.appendChild(seat)
  })
}

function getFlightsOnDate(flightDate) {
  return allFlights.filter(f => f.Date === flightDate)
}

export function showFlightDetail(flightData, allFlightsSameDate, dateStart = null, dateEnd = null, passengerPair = null, displayMode = null) {
  selectedPassengers = parsePassengers(flightData.Passengers)
  const selectedPerson = getSelectedPerson()
  currentDisplayMode = displayMode
  
  if (passengerPair && passengerPair.length === 2 && displayMode === 'chord') {
    sharedPassengerPair = passengerPair
    sharedFlights = allFlightsSameDate || [flightData]
    currentFlightIndex = 0
  } else if (displayMode === 'route') {
    sharedPassengerPair = []
    sharedFlights = allFlightsSameDate
    currentFlightIndex = sharedFlights.findIndex(f => f === flightData)
    if (currentFlightIndex === -1) currentFlightIndex = 0
  } else if (selectedPerson) {
    currentDisplayMode = 'person'
    sharedPassengerPair = [selectedPerson]
    sharedFlights = findFlightsForPerson(selectedPerson, dateStart, dateEnd)
    currentFlightIndex = sharedFlights.findIndex(f => f === flightData)
    if (currentFlightIndex === -1) currentFlightIndex = 0
  } else {
    sharedPassengerPair = selectedPassengers.slice(0, 2)
    if (dateStart && dateEnd) {
      sharedFlights = findSharedFlights(sharedPassengerPair[0] || '', sharedPassengerPair[1] || '', dateStart, dateEnd)
      currentFlightIndex = 0
    } else {
      sharedFlights = [flightData]
      currentFlightIndex = 0
    }
  }
  
  const prevBtn = document.getElementById('prev-flight')
  const nextBtn = document.getElementById('next-flight')
  
  prevBtn.onclick = () => {
    if (currentFlightIndex > 0) {
      currentFlightIndex--
      const flight = sharedFlights[currentFlightIndex]
      const sameDate = getFlightsOnDate(flight.Date)
      renderFlight(flight, sameDate)
      updateSharedFlightsInfo(sharedFlights, dateStart, dateEnd)
    }
  }
  
  nextBtn.onclick = () => {
    if (currentFlightIndex < sharedFlights.length - 1) {
      currentFlightIndex++
      const flight = sharedFlights[currentFlightIndex]
      const sameDate = getFlightsOnDate(flight.Date)
      renderFlight(flight, sameDate)
      updateSharedFlightsInfo(sharedFlights, dateStart, dateEnd)
    }
  }

  const flightDetail = document.getElementById('flight-detail')
  const displayFlight = sharedFlights.length > 0 ? sharedFlights[currentFlightIndex] : flightData
  const displaySameDate = getFlightsOnDate(displayFlight.Date)
  renderFlight(displayFlight, displaySameDate)
  updateSharedFlightsInfo(sharedFlights, dateStart, dateEnd)
  flightDetail.classList.add('visible')
}

function updateSharedFlightsInfo(flights, periodStart = null, periodEnd = null) {
  const infoEl = document.getElementById('shared-flights-info')
  if (!infoEl) return
  
  const currentFlight = sharedFlights[currentFlightIndex]
  const totalFlights = sharedFlights.length
  
renderSharedFlightInfo(infoEl, currentFlight, totalFlights, periodStart, periodEnd)
}

export function hideFlightDetail() {
  const flightDetail = document.getElementById('flight-detail')
  const infoEl = document.getElementById('shared-flights-info')
  flightDetail.classList.remove('visible')
  if (infoEl) {
    infoEl.innerHTML = ''
    infoEl.style.display = 'none'
  }
  sharedFlights = []
  currentFlightIndex = 0
  selectedPassengers = []
  sharedPassengerPair = []
  currentDisplayMode = null
}
