import { normalizeName, parsePassengers, truncateText } from './utils.js'
import { getFilteredFlights, peopleData, peopleMap } from './data.js'

let chordData = null
let selectedCategory = null
let selectedPerson = null

export function getChordData() { return chordData }
export function getSelectedCategory() { return selectedCategory }
export function getSelectedPerson() { return selectedPerson }

export function setSelectedCategory(cat) { selectedCategory = cat }
export function setSelectedPerson(person) { selectedPerson = person }

export function buildCoTravelMatrix() {
  const counts = new Map()
  const peopleInFlight = new Map()
  const flightPairs = new Map()
  const filteredFlights = getFilteredFlights()
  const excludeNames = ['jeffrey epstein', 'jeffrey epstine']

  filteredFlights.forEach(flight => {
    const passengers = parsePassengers(flight.Passengers || flight.passengers || '')
    const canonical = []

    passengers.forEach(p => {
      const key = normalizeName(p)
      if (excludeNames.includes(key)) return
      const matched = peopleMap.get(key)
      if (matched) {
        const name = matched.displayName || matched.matchedName || p
        if (!canonical.includes(name)) canonical.push(name)
      }
    })

    for (let i = 0; i < canonical.length; i++) {
      for (let j = i + 1; j < canonical.length; j++) {
        const pair = [canonical[i], canonical[j]].sort().join('||')
        counts.set(pair, (counts.get(pair) || 0) + 1)
        
        if (!flightPairs.has(pair)) {
          flightPairs.set(pair, [])
        }
        flightPairs.get(pair).push(flight)
      }
    }

    canonical.forEach(name => {
      if (!peopleInFlight.has(name)) {
        peopleInFlight.set(name, peopleMap.get(normalizeName(name)) || {})
      }
    })
  })

  let people = [...peopleInFlight.entries()].map(([name, data]) => ({
    name,
    category: data.category || 'Unknown'
  }))

  const index = new Map(people.map((d, i) => [d.name, i]))
  const matrix = Array.from({ length: people.length }, () => Array(people.length).fill(0))

  counts.forEach((value, pair) => {
    const [a, b] = pair.split('||')
    const i = index.get(a)
    const j = index.get(b)
    if (i != null && j != null && value > 0 && i !== j) {
      matrix[i][j] = value
      matrix[j][i] = value
    }
  })

  const rowWithConnections = matrix.map((row, i) => {
    const sum = row.reduce((a, b) => a + b, 0)
    return { sum, idx: i }
  }).filter(r => r.sum > 0)

  if (rowWithConnections.length === 0) {
    return { people: [], matrix: [], flightPairs: new Map() }
  }

  const validIndices = new Set(rowWithConnections.map(r => r.idx))
  people = people.filter((_, i) => validIndices.has(i))
  
  const newIndex = new Map(people.map((d, i) => [d.name, i]))
  const newMatrix = Array.from({ length: people.length }, () => Array(people.length).fill(0))
  const newFlightPairs = new Map()

  counts.forEach((value, pair) => {
    const [a, b] = pair.split('||')
    const oldI = index.get(a)
    const oldJ = index.get(b)
    if (validIndices.has(oldI) && validIndices.has(oldJ) && value > 0) {
      const i = newIndex.get(a)
      const j = newIndex.get(b)
      if (i != null && j != null) {
        newMatrix[i][j] = value
        newMatrix[j][i] = value
        newFlightPairs.set(pair, flightPairs.get(pair))
      }
    }
  })
  
  return { people, matrix: newMatrix, flightPairs: newFlightPairs }
}

export function renderChordDiagram(personDetails, personTooltip, updateSelectionInfoFn, onSelectionChange, showFlightDetailFn, dateStart = null, dateEnd = null) {
  const chordContainer = document.getElementById('chord-panel')
  if (!chordContainer) return

  const chordSvg = d3.select('#chord-chart')
  if (!peopleData.length) return
  
  const data = buildCoTravelMatrix()
  if (!data.people.length || !data.matrix.length) return

  const isExpanded = chordContainer.classList.contains('expanded')
  const legendWidth = isExpanded ? 180 : 120
  const containerWidth = Math.max(200, chordContainer.clientWidth - legendWidth)
  const containerHeight = Math.max(200, chordContainer.clientHeight - 40)

  chordSvg.selectAll('*').remove()

  chordData = data

  const outerRadius = Math.min(containerWidth, containerHeight) * 0.42
  const innerRadius = outerRadius - 24

  const svgEl = chordSvg
    .attr('viewBox', [-containerWidth / 2, -containerHeight / 2, containerWidth, containerHeight])

  const chord = d3.chord().padAngle(0.04).sortSubgroups(d3.descending)
  let chords
  try {
    chords = chord(data.matrix)
    
    if (!chords || !chords.groups || !chords.length) {
      return
    }
    
    const validGroups = chords.groups.filter(g => g.value > 0 && isFinite(g.startAngle) && isFinite(g.endAngle))
    const validIndices = new Set(validGroups.map(g => g.index))
    const validChordsData = chords.filter(c => validIndices.has(c.source.index) && validIndices.has(c.target.index))
  } catch (e) {
    return
  }

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius)
  const ribbon = d3.ribbon().radius(innerRadius - 4)

  const categories = [...new Set(data.people.map(d => d.category))]
  const colors = ['#66c2a5', '#8da0cb', '#ffd92f', '#a6d854', '#5e3c99', '#e78ac3', '#fc8d62', '#1f78b4', '#b2df8a', '#80b1d3', '#fb9a99', '#cab2d6']
  const colorMap = new Map(categories.map((c, i) => [c, colors[i % colors.length]]))

  const group = svgEl.append('g')
    .selectAll('g')
    .data(chords.groups)
    .join('g')

  group.append('path')
    .attr('class', 'chord-arc')
    .attr('d', arc)
    .attr('fill', d => colorMap.get(data.people[d.index]?.category) || '#69b3a2')
    .attr('stroke', d => d3.color(colorMap.get(data.people[d.index]?.category) || '#69b3a2').darker(0.5))
    .attr('opacity', d => {
      if (selectedCategory && data.people[d.index]?.category !== selectedCategory) return 0.2
      if (selectedPerson && data.people[d.index]?.name !== selectedPerson) return 0.2
      return 1
    })
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      const p = data.people[d.index]
      if (selectedPerson === p.name) {
        selectedPerson = null
      } else {
        selectedPerson = p.name
        selectedCategory = null
      }
      updateSelectionInfoFn()
      if (onSelectionChange) onSelectionChange()
    })
    .on('mouseover', function(event, d) {
      const p = data.people[d.index]
      const details = personDetails.get(p.name) || { bio: '', imagePath: '' }

      let html = ''
      if (details.imagePath) {
        html += `<img src="${details.imagePath}" alt="${p.name}" onerror="this.style.display='none'">`
      }
      html += `<strong>${p.name}</strong>`
      html += `<em>${p.category}</em>`
      if (details.bio) {
        const shortBio = truncateText(details.bio, 200)
        html += `<p>${shortBio}</p>`
      }

      personTooltip.innerHTML = html
      personTooltip.style.opacity = 1

      const tooltipWidth = 320
      let left = event.clientX + 15
      if (left + tooltipWidth > window.innerWidth) {
        left = event.clientX - tooltipWidth - 15
      }
      personTooltip.style.left = left + 'px'
      personTooltip.style.top = (event.clientY + 15) + 'px'
    })
    .on('mousemove', function(event) {
      const tooltipWidth = 320
      let left = event.clientX + 15
      if (left + tooltipWidth > window.innerWidth) {
        left = event.clientX - tooltipWidth - 15
      }
      personTooltip.style.left = left + 'px'
      personTooltip.style.top = (event.clientY + 15) + 'px'
    })
    .on('mouseout', () => { personTooltip.style.opacity = 0 })

  svgEl.append('g')
    .attr('class', 'chord-ribbons')
    .attr('fill-opacity', d => {
      if (!d || d.source === undefined || d.target === undefined) return 0.1
      if (selectedPerson) {
        return (d.source.index === data.people.findIndex(p => p.name === selectedPerson) ||
                d.target.index === data.people.findIndex(p => p.name === selectedPerson)) ? 0.7 : 0.1
      }
      if (selectedCategory) {
        const sourceCat = data.people[d.source.index]?.category
        const targetCat = data.people[d.target.index]?.category
        if (sourceCat === selectedCategory || targetCat === selectedCategory) {
          return sourceCat === targetCat ? 0.6 : 0.45
        }
        return 0.05
      }
      return 0.5
    })
    .selectAll('path')
    .data(chords.filter(c => c.source.index !== c.target.index))
    .join('path')
    .attr('d', ribbon)
    .attr('fill', d => colorMap.get(data.people[d.source.index]?.category) || '#69b3a2')
    .attr('stroke', d => d3.color(colorMap.get(data.people[d.source.index]?.category) || '#69b3a2').darker(0.5))
    .style('mix-blend-mode', 'screen')
    .style('cursor', 'pointer')
    .on('click', function(event, d) {
      if (!d || d.source === undefined || d.target === undefined) return
      const person1 = data.people[d.source.index]?.name
      const person2 = data.people[d.target.index]?.name
      if (!person1 || !person2) return
      
      const pairKey = [person1, person2].sort().join('||')
      const allSharedFlights = data.flightPairs?.get(pairKey) || []
      
      if (allSharedFlights.length > 0) {
        if (typeof showFlightDetailFn === 'function') {
          showFlightDetailFn(allSharedFlights[0], allSharedFlights, dateStart, dateEnd, [person1, person2], 'chord')
        }
      }
    })
    .on('mouseover', function(event, d) {
      if (!d || d.source === undefined || d.target === undefined) return
      d3.select(this).attr('fill-opacity', 0.8)
    })
    .on('mouseout', function(event, d) {
      d3.select(this).attr('fill-opacity', null)
    })

  group.append('text')
    .each(d => { d.angle = (d.startAngle + d.endAngle) / 2 })
    .attr('dy', '0.35em')
    .attr('transform', d => {
      const rotate = d.angle * 180 / Math.PI - 90
      const translate = outerRadius + 10
      const flip = d.angle > Math.PI ? 180 : 0
      return `rotate(${rotate}) translate(${translate}) rotate(${flip})`
    })
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
    .style('font-size', '9px')
    .style('fill', '#fff')
    .style('pointer-events', 'none')
    .text(d => data.people[d.index].name.length > 12 ? data.people[d.index].name.substring(0, 10) + '...' : data.people[d.index].name)

  const legendItems = document.getElementById('legend-items')
  legendItems.innerHTML = ''

  const categoryCounts = d3.rollup(data.people, v => v.length, d => d.category)
  const sortedCategories = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])

  sortedCategories.forEach(([cat, count]) => {
    const item = document.createElement('div')
    item.className = 'legend-category' + (selectedCategory === cat ? ' selected' : '')
    item.innerHTML = `
      <span class="swatch" style="background:${colorMap.get(cat)}"></span>
      <span class="legend-label">${cat} (${count})</span>
    `
    item.addEventListener('click', () => {
      if (selectedCategory === cat) {
        selectedCategory = null
      } else {
        selectedCategory = cat
        selectedPerson = null
      }
      updateSelectionInfoFn()
      if (onSelectionChange) onSelectionChange()
    })
    legendItems.appendChild(item)
  })
}

export function updateSelectionInfo() {
  const selectionInfo = document.getElementById('selection-info')
  const selectionText = document.getElementById('selection-text')

  if (selectedPerson || selectedCategory) {
    selectionInfo.classList.add('visible')
    if (selectedPerson) {
      selectionText.innerHTML = `Selected person: <strong>${selectedPerson}</strong>`
      } else {
        selectionText.innerHTML = `Selected category: <strong>${selectedCategory}</strong>`
      }
  } else {
    selectionInfo.classList.remove('visible')
  }
}

export function clearSelection() {
  selectedCategory = null
  selectedPerson = null
  updateSelectionInfo()
}