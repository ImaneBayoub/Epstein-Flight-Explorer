import { normalizeName, parsePassengers } from './utils.js'
import { cityCoords, allFlights, peopleData, peopleMap } from './data.js'

let currentStep = 0
let isComplete = false
let vizInitialized = { chord: false, map: false }
let onCompleteCallback = null

export function setOnCompleteCallback(callback) {
  onCompleteCallback = callback
}

export function initOnboarding() {
  renderOnboardingBackground()

  const skipBtn = document.getElementById('onboarding-skip')
  if (skipBtn) {
    skipBtn.addEventListener('click', completeOnboarding)
  }

  const dismissBtn = document.getElementById('dismiss-hints')
  if (dismissBtn) {
    dismissBtn.addEventListener('click', hideVizHints)
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      completeOnboarding()
    } else if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowRight') {
      advanceOnboarding()
    }
  })

  setTimeout(() => {
    startIntroAnimation()
  }, 500)
}

function getPlaneElements() {
  const container = document.getElementById('plane-container')
  const plane = document.getElementById('onboarding-plane')
  return { container, plane }
}

function startIntroAnimation() {
  const { container, plane } = getPlaneElements()
  const intro = document.getElementById('step-intro')
  
  if (!plane || !container || !intro) return

  intro.classList.add('active')
  
  container.classList.add('visible')
  container.style.left = '50%'
  container.style.top = 'auto'
  container.style.bottom = '180px'
  container.style.right = 'auto'
  container.style.transform = 'translateX(-50%)'
  
  setTimeout(() => {
    plane.classList.add('clickable')
    plane.addEventListener('click', advanceOnboarding)
  }, 800)
}

function advanceOnboarding() {
  const { plane } = getPlaneElements()
  if (!plane || !plane.classList.contains('clickable')) return
  
  plane.classList.remove('clickable')
  plane.removeEventListener('click', advanceOnboarding)

  if (currentStep === 0) {
    goToStep1()
  } else if (currentStep === 1) {
    goToStep2()
  } else {
    completeOnboarding()
  }
}

function goToStep1() {
  const intro = document.getElementById('step-intro')
  const chordStep = document.getElementById('step-chord')
  const { container } = getPlaneElements()
  
  intro.classList.remove('active')
  intro.classList.add('sliding-out')
  
  if (container) {
    container.classList.remove('visible')
  }
  
  setTimeout(() => {
    intro.classList.add('hidden')
    chordStep.classList.add('active')
    
    if (!vizInitialized.chord) {
      renderMiniChord()
      vizInitialized.chord = true
    }
    
    currentStep = 1
    
    setTimeout(() => {
      const { plane } = getPlaneElements()
      if (plane) {
        plane.addEventListener('click', advanceOnboarding)
      }
      animatePlaneFlight(1)
    }, 300)
  }, 500)
}

function goToStep2() {
  const chordStep = document.getElementById('step-chord')
  const mapStep = document.getElementById('step-map')
  const { container } = getPlaneElements()
  
  chordStep.classList.remove('active')
  chordStep.classList.add('sliding-out')
  
  if (container) {
    container.classList.remove('visible')
  }
  
  setTimeout(() => {
    chordStep.classList.add('hidden')
    mapStep.classList.add('active')
    
    if (!vizInitialized.map) {
      renderMiniMap()
      vizInitialized.map = true
    }
    
    currentStep = 2
    
    setTimeout(() => {
      const { plane } = getPlaneElements()
      if (plane) {
        plane.addEventListener('click', advanceOnboarding)
      }
      animatePlaneFlight(2)
    }, 300)
  }, 500)
}

function animatePlaneFlight(targetStep) {
  const { container, plane } = getPlaneElements()
  const pathSvg = document.getElementById('flight-path-svg')
  
  if (!plane || !container || !pathSvg) return
  
  pathSvg.innerHTML = ''
  
  container.classList.remove('intro-position')
  container.classList.add('visible')
  
  const startX = -80
  const startY = window.innerHeight * 0.5
  const endX = window.innerWidth - 100
  const endY = window.innerHeight * 0.5
  
  const loopHeight = 100
  const midX = window.innerWidth / 2
  
  const pathD = `
    M${startX},${startY}
    C${midX * 0.3},${startY - loopHeight} ${midX * 0.7},${startY - loopHeight} ${midX},${startY}
    C${midX + window.innerWidth * 0.2},${startY + loopHeight} ${midX + window.innerWidth * 0.25},${startY + loopHeight} ${endX},${endY}
  `
  
  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  path.setAttribute('d', pathD)
  path.setAttribute('class', 'flight-dashed-path')
  path.setAttribute('fill', 'none')
  path.setAttribute('stroke', '#69b3a2')
  path.setAttribute('stroke-width', '3')
  path.setAttribute('stroke-dasharray', '12,8')
  pathSvg.appendChild(path)
  
  const pathLength = path.getTotalLength()
  
  container.style.left = startX + 'px'
  container.style.top = startY + 'px'
  container.style.right = 'auto'
  container.style.transform = 'translate(-50%, -50%)'
  plane.style.transform = 'scaleX(-1)'
  
  const duration = 3000
  const startTime = performance.now()
  
  function animate(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / duration, 1)
    
    const easeProgress = 1 - Math.pow(1 - progress, 3)
    
    const currentPoint = path.getPointAtLength(pathLength * easeProgress)
    
    container.style.left = currentPoint.x + 'px'
    container.style.top = currentPoint.y + 'px'
    
    let angle = 0
    if (progress < 0.95) {
      const nextPoint = path.getPointAtLength(pathLength * Math.min(easeProgress + 0.02, 1))
      angle = Math.atan2(
        nextPoint.y - currentPoint.y,
        nextPoint.x - currentPoint.x
      ) * 180 / Math.PI
    }
    
    plane.style.transform = `scaleX(-1) rotate(${-angle}deg)`
    
    if (progress < 1) {
      requestAnimationFrame(animate)
    } else {
      plane.classList.add('clickable')
      plane.style.transform = 'scaleX(-1)'
      container.style.left = endX + 'px'
    }
  }
  
  requestAnimationFrame(animate)
}

function completeOnboarding() {
  isComplete = true
  const layer = document.getElementById('onboarding-layer')
  const { container } = getPlaneElements()
  
  if (container) {
    container.classList.remove('visible')
  }
  
  if (layer) {
    layer.style.transition = 'opacity 0.8s ease'
    layer.style.opacity = '0'
    setTimeout(() => {
      layer.style.display = 'none'
      if (onCompleteCallback) {
        onCompleteCallback()
      } else {
        showVizHints()
      }
    }, 800)
  }
}

let hintsTimeout = null

export function showVizHints() {
  const hints = document.getElementById('viz-hints')
  if (hints) {
    setTimeout(() => {
      hints.classList.add('visible')
      
      setTimeout(() => {
        const datesHint = document.getElementById('hint-dates')
        if (datesHint) datesHint.style.opacity = '1'
      }, 500)
      
      setTimeout(() => {
        const flightsHint = document.getElementById('hint-flights')
        if (flightsHint) flightsHint.style.opacity = '1'
      }, 1500)
      
      setTimeout(() => {
        const chordHint = document.getElementById('hint-chord')
        if (chordHint) chordHint.style.opacity = '1'
      }, 2500)
      
      if (hintsTimeout) clearTimeout(hintsTimeout)
      hintsTimeout = setTimeout(() => {
        hideVizHints()
      }, 10000)
    }, 300)
  }
}

export function dismissHintsOnInteraction() {
  if (hintsTimeout) {
    clearTimeout(hintsTimeout)
    hintsTimeout = null
  }
  hideVizHints()
}

export function hideVizHints() {
  const hints = document.getElementById('viz-hints')
  if (hints) {
    hints.classList.remove('visible')
    const dateHint = document.getElementById('hint-dates')
    const flightsHint = document.getElementById('hint-flights')
    const chordHint = document.getElementById('hint-chord')
    if (dateHint) dateHint.style.opacity = '0'
    if (flightsHint) flightsHint.style.opacity = '0'
    if (chordHint) chordHint.style.opacity = '0'
  }
}

function buildMiniChordData() {
  const counts = new Map()
  const peopleInFlight = new Map()
  const excludeNames = ['jeffrey epstein', 'jeffrey epstine']

  allFlights.forEach(flight => {
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
      }
    }

    canonical.forEach(name => {
      if (!peopleInFlight.has(name)) {
        peopleInFlight.set(name, peopleMap.get(normalizeName(name)) || {})
      }
    })
  })

  const people = [...peopleInFlight.entries()].map(([name, data]) => ({
    name,
    category: data.category || 'Unknown'
  }))

  const index = new Map(people.map((d, i) => [d.name, i]))
  const matrix = Array.from({ length: people.length }, () => Array(people.length).fill(0))

  counts.forEach((value, pair) => {
    const [a, b] = pair.split('||')
    const i = index.get(a)
    const j = index.get(b)
    if (i != null && j != null) {
      matrix[i][j] = value
      matrix[j][i] = value
    }
  })

  return { people, matrix }
}

function renderMiniChord() {
  const svg = d3.select('#mini-chord')
  if (svg.empty()) return

  const data = buildMiniChordData()
  if (!data.people.length || data.people.length < 2) {
    svg.html('<text x="50%" y="50%" text-anchor="middle" fill="#94a3b8">Pas assez de données</text>')
    return
  }

  const width = 500
  const height = 500
  const size = Math.min(width, height)
  const outerRadius = size * 0.42
  const innerRadius = outerRadius - 30

  svg
    .attr('viewBox', [-width / 2, -height / 2, width, height])
    .attr('width', width)
    .attr('height', height)

  const categories = [...new Set(data.people.map(d => d.category))]
  const colors = ['#66c2a5', '#8da0cb', '#ffd92f', '#a6d854', '#5e3c99', '#e78ac3', '#fc8d62', '#1f78b4', '#b2df8a', '#80b1d3', '#fb9a99', '#cab2d6']
  const colorMap = new Map(categories.map((c, i) => [c, colors[i % colors.length]]))

  const limitedPeople = data.people.slice(0, 12)
  const limitedMatrix = data.matrix.slice(0, 12).map(row => row.slice(0, 12).map(v => {
    if (!isFinite(v) || v < 0 || isNaN(v)) return 0
    return v
  }))

  const hasNonZero = limitedMatrix.some(row => row.some(v => v > 0))
  if (!hasNonZero) {
    return
  }

  const chord = d3.chord().padAngle(0.06).sortSubgroups(d3.descending)
  let chords
  try {
    chords = chord(limitedMatrix)
    
    if (!chords || !chords.groups || !chords.length) {
      return
    }
  } catch (e) {
    return
  }

  const validGroups = chords.groups.filter(g => g.value > 0 && isFinite(g.startAngle) && isFinite(g.endAngle) && g.endAngle > g.startAngle)
  const validIndices = new Set(validGroups.map(g => g.index))
  const validChordsData = chords.filter(c => validIndices.has(c.source.index) && validIndices.has(c.target.index))

  const arc = d3.arc().innerRadius(innerRadius).outerRadius(outerRadius)
  const ribbon = d3.ribbon().radius(innerRadius - 6)

  let selectedCategory = null

  let tooltipEl = document.querySelector('.mini-chord-tooltip')
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'mini-chord-tooltip'
    document.body.appendChild(tooltipEl)
  }

  const glowFilter = svg.append('defs')
    .append('filter')
    .attr('id', 'chord-glow')
    .attr('x', '-50%')
    .attr('y', '-50%')
    .attr('width', '200%')
    .attr('height', '200%')
  
  glowFilter.append('feGaussianBlur')
    .attr('stdDeviation', '3')
    .attr('result', 'coloredBlur')
  
  const glowMerge = glowFilter.append('feMerge')
  glowMerge.append('feMergeNode').attr('in', 'coloredBlur')
  glowMerge.append('feMergeNode').attr('in', 'SourceGraphic')

  const group = svg.append('g')
    .selectAll('g')
    .data(validGroups)
    .join('g')

  const arcPaths = group.append('path')
    .attr('class', 'mini-arc')
    .attr('d', d => arc(d) || '')
    .attr('fill', d => colorMap.get(limitedPeople[d.index]?.category) || '#69b3a2')
    .attr('stroke', d => d3.color(colorMap.get(limitedPeople[d.index]?.category) || '#69b3a2').darker(0.3))
    .attr('stroke-width', 1)
    .style('cursor', 'pointer')
    .attr('opacity', 0)

  arcPaths
    .on('mouseover', function(event, d) {
      const person = limitedPeople[d.index]
      d3.select(this)
        .attr('filter', 'url(#chord-glow)')
        .attr('opacity', 1)
      
      tooltipEl.innerHTML = `
        <strong style="color: ${colorMap.get(person.category)}">${person.name}</strong>
        <br><span style="color: #94a3b8; font-size: 11px;">${person.category}</span>
      `
      tooltipEl.style.opacity = '1'
      tooltipEl.style.left = (event.clientX + 15) + 'px'
      tooltipEl.style.top = (event.clientY - 10) + 'px'
    })
    .on('mousemove', function(event) {
      tooltipEl.style.left = (event.clientX + 15) + 'px'
      tooltipEl.style.top = (event.clientY - 10) + 'px'
    })
    .on('mouseout', function() {
      d3.select(this).attr('filter', null).attr('opacity', 1)
      tooltipEl.style.opacity = '0'
    })
    .on('click', function(event, d) {
      const person = limitedPeople[d.index]
      
      if (selectedCategory === person.category) {
        selectedCategory = null
        arcPaths.attr('opacity', 1)
        ribbons.attr('opacity', 0.5)
      } else {
        selectedCategory = person.category
        arcPaths.attr('opacity', p => {
          const cat = limitedPeople[p.index]?.category
          return cat === selectedCategory ? 1 : 0.3
        })
        ribbons.attr('opacity', p => {
          const sourceCat = limitedPeople[p.source.index]?.category
          const targetCat = limitedPeople[p.target.index]?.category
          return sourceCat === selectedCategory || targetCat === selectedCategory ? 0.8 : 0.1
        })
      }
    })

  arcPaths.transition()
    .delay((d, i) => i * 80)
    .duration(400)
    .attr('opacity', 1)

  group.append('text')
    .each(function(d) { d.angle = (d.startAngle + d.endAngle) / 2 })
    .attr('dy', '0.35em')
    .attr('transform', d => {
      if (!isFinite(d.angle)) return ''
      const rotate = d.angle * 180 / Math.PI - 90
      const translate = outerRadius + 12
      const flip = d.angle > Math.PI ? 180 : 0
      return `rotate(${rotate}) translate(${translate}) rotate(${flip})`
    })
    .attr('text-anchor', d => d.angle > Math.PI ? 'end' : 'start')
    .style('font-size', '10px')
    .style('fill', '#94a3b8')
    .style('pointer-events', 'none')
    .text(d => {
      const name = limitedPeople[d.index]?.name || ''
      return name.length > 10 ? name.substring(0, 8) + '...' : name
    })
    .attr('opacity', 0)
    .transition()
    .delay((d, i) => i * 80 + 300)
    .duration(300)
    .attr('opacity', 0.8)

  const ribbons = svg.append('g')
    .selectAll('path')
    .data(validChordsData)
    .join('path')
    .attr('class', 'mini-ribbon')
    .attr('d', d => ribbon(d) || '')
    .attr('fill', d => colorMap.get(limitedPeople[d.source.index]?.category) || '#69b3a2')
    .style('cursor', 'pointer')
    .style('mix-blend-mode', 'screen')
    .attr('opacity', 0)

  ribbons
    .on('mouseover', function(event, d) {
      d3.select(this).attr('opacity', 1)
      
      const person1 = limitedPeople[d.source.index]
      const person2 = limitedPeople[d.target.index]
      
      tooltipEl.innerHTML = `
        <strong>${person1?.name || '?'}</strong> <span style="color: #64748b;">et</span> <strong>${person2?.name || '?'}</strong>
        <br><span style="color: #94a3b8; font-size: 11px;">${d.source.value || d.target.value} vol(s) ensemble</span>
      `
      tooltipEl.style.opacity = '1'
      tooltipEl.style.left = (event.clientX + 15) + 'px'
      tooltipEl.style.top = (event.clientY - 10) + 'px'
    })
    .on('mousemove', function(event) {
      tooltipEl.style.left = (event.clientX + 15) + 'px'
      tooltipEl.style.top = (event.clientY - 10) + 'px'
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', selectedCategory ? 0.1 : 0.5)
      tooltipEl.style.opacity = '0'
    })

  ribbons.transition()
    .delay((d, i) => 600 + i * 50)
    .duration(400)
    .attr('opacity', 0.5)

  const legendContainer = document.getElementById('mini-legend')
  if (legendContainer) {
    legendContainer.innerHTML = ''
    const legendDiv = document.createElement('div')
    legendDiv.className = 'mini-legend-grid'
    
    categories.slice(0, 6).forEach(cat => {
      const item = document.createElement('div')
      item.className = 'mini-legend-item'
      item.innerHTML = `
        <span class="swatch" style="background:${colorMap.get(cat)}"></span>
        <span class="legend-label">${cat}</span>
      `
      item.style.cursor = 'pointer'
      item.addEventListener('click', () => {
        if (selectedCategory === cat) {
          selectedCategory = null
          arcPaths.attr('opacity', 1)
          ribbons.attr('opacity', 0.5)
        } else {
          selectedCategory = cat
          arcPaths.attr('opacity', p => {
            const pCat = limitedPeople[p.index]?.category
            return pCat === selectedCategory ? 1 : 0.3
          })
          ribbons.attr('opacity', p => {
            const sourceCat = limitedPeople[p.source.index]?.category
            const targetCat = limitedPeople[p.target.index]?.category
            return sourceCat === selectedCategory || targetCat === selectedCategory ? 0.8 : 0.1
          })
        }
      })
      legendDiv.appendChild(item)
    })
    legendContainer.appendChild(legendDiv)
  }
}

function renderMiniMap() {
  const svg = d3.select('#mini-map')
  if (svg.empty()) return

  const width = 580
  const height = 380

  svg
    .attr('viewBox', [0, 0, width, height])
    .attr('width', width)
    .attr('height', height)

  const projection = d3.geoNaturalEarth1()
    .scale(width / 5.2)
    .translate([width / 2, height / 2])

  const pathGen = d3.geoPath().projection(projection)

  let tooltipEl = document.querySelector('.mini-map-tooltip')
  if (!tooltipEl) {
    tooltipEl = document.createElement('div')
    tooltipEl.className = 'mini-map-tooltip'
    document.body.appendChild(tooltipEl)
  }

  const sampleRoutes = [
    { origin: 'New York', dest: 'London', date: '15 Jan 2015' },
    { origin: 'Paris', dest: 'New York', date: '22 Mar 2016' },
    { origin: 'Los Angeles', dest: 'Tokyo', date: '8 Jul 2017' },
    { origin: 'Miami', dest: 'Paris', date: '3 Nov 2018' },
    { origin: 'New York', dest: 'Paris', date: '14 Feb 2019' },
    { origin: 'London', dest: 'New York', date: '29 Dec 2019' }
  ]

  const citiesSet = new Set()
  sampleRoutes.forEach(f => {
    citiesSet.add(f.origin)
    citiesSet.add(f.dest)
  })

  const countriesGroup = svg.append('g').attr('class', 'mini-countries')
  const routesGroup = svg.append('g').attr('class', 'mini-routes')
  const labelsGroup = svg.append('g').attr('class', 'mini-labels')

  d3.json('data/world.geojson').then(worldData => {
    countriesGroup.selectAll('path')
      .data(worldData.features)
      .join('path')
      .attr('class', 'mini-country')
      .attr('d', pathGen)
      .attr('fill', '#1e293b')
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.5)
      .attr('opacity', 0)
      .transition()
      .duration(500)
      .attr('opacity', 1)

    sampleRoutes.forEach((f, i) => {
      const originCoords = cityCoords.get(f.origin.toLowerCase())
      const destCoords = cityCoords.get(f.dest.toLowerCase())
      
      if (!originCoords || !destCoords) return

      const start = projection([originCoords.lon, originCoords.lat])
      const end = projection([destCoords.lon, destCoords.lat])

      if (!start || !end) return

      const midX = (start[0] + end[0]) / 2
      const midY = (start[1] + end[1]) / 2
      const dx = end[0] - start[0]
      const dy = end[1] - start[1]
      const dist = Math.sqrt(dx * dx + dy * dy)
      const curveOffset = Math.min(dist * 0.2, 50)
      const ctrlX = midX - (dy / dist) * curveOffset
      const ctrlY = midY + (dx / dist) * curveOffset

      const curvePath = `M${start[0]},${start[1]} Q${ctrlX},${ctrlY} ${end[0]},${end[1]}`

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      pathEl.setAttribute('d', curvePath)
      pathEl.setAttribute('fill', 'none')
      pathEl.setAttribute('stroke', '#69b3a2')
      pathEl.setAttribute('stroke-width', '2.5')
      pathEl.setAttribute('stroke-linecap', 'round')
      pathEl.setAttribute('class', 'flight-line')
      pathEl.style.cursor = 'pointer'
      pathEl.style.opacity = '0'
      
      const pathLength = pathEl.getTotalLength()
      
      routesGroup.node().appendChild(pathEl)

      pathEl.addEventListener('mouseover', function(event) {
        this.style.stroke = '#fcd34d'
        this.style.strokeWidth = '3.5'
        this.style.opacity = '1'
        
        tooltipEl.innerHTML = `
          <div style="margin-bottom: 6px; color: #69b3a2; font-weight: 600;">${f.date}</div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span>${f.origin}</span>
            <span style="color: #64748b;">></span>
            <span>${f.dest}</span>
          </div>
        `
        tooltipEl.style.opacity = '1'
        tooltipEl.style.left = (event.clientX + 15) + 'px'
        tooltipEl.style.top = (event.clientY - 10) + 'px'
      })

      pathEl.addEventListener('mousemove', function(event) {
        tooltipEl.style.left = (event.clientX + 15) + 'px'
        tooltipEl.style.top = (event.clientY - 10) + 'px'
      })

      pathEl.addEventListener('mouseout', function() {
        this.style.stroke = '#69b3a2'
        this.style.strokeWidth = '2.5'
        this.style.opacity = '0.7'
        tooltipEl.style.opacity = '0'
      })

      const animatePath = () => {
        pathEl.style.transition = 'none'
        pathEl.style.strokeDasharray = pathLength
        pathEl.style.strokeDashoffset = pathLength
        
        requestAnimationFrame(() => {
          pathEl.style.transition = `stroke-dashoffset ${800 + i * 100}ms ease-out, opacity 0.3s ease`
          pathEl.style.strokeDashoffset = '0'
          pathEl.style.opacity = '0.7'
        })
      }

      setTimeout(animatePath, 300 + i * 150)

      routesGroup.append('circle')
        .attr('cx', start[0])
        .attr('cy', start[1])
        .attr('r', 0)
        .attr('fill', '#69b3a2')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .transition()
        .delay(200 + i * 150)
        .duration(300)
        .attr('r', 6)

      routesGroup.append('circle')
        .attr('cx', end[0])
        .attr('cy', end[1])
        .attr('r', 0)
        .attr('fill', '#fcd34d')
        .attr('stroke', '#fff')
        .attr('stroke-width', 2)
        .transition()
        .delay(600 + i * 150)
        .duration(300)
        .attr('r', 7)

      if (citiesSet.has(f.origin)) {
        labelsGroup.append('text')
          .attr('x', start[0])
          .attr('y', start[1] - 12)
          .attr('text-anchor', 'middle')
          .style('font-size', '9px')
          .style('fill', '#94a3b8')
          .style('pointer-events', 'none')
          .text(f.origin)
          .attr('opacity', 0)
          .transition()
          .delay(400 + i * 150)
          .duration(300)
          .attr('opacity', 0.8)
        
        citiesSet.delete(f.origin)
      }

      if (citiesSet.has(f.dest)) {
        labelsGroup.append('text')
          .attr('x', end[0])
          .attr('y', end[1] - 12)
          .attr('text-anchor', 'middle')
          .style('font-size', '9px')
          .style('fill', '#fcd34d')
          .style('pointer-events', 'none')
          .text(f.dest)
          .attr('opacity', 0)
          .transition()
          .delay(800 + i * 150)
          .duration(300)
          .attr('opacity', 0.9)
        
        citiesSet.delete(f.dest)
      }
    })
  })
}

function renderOnboardingBackground() {
  const svg = d3.select('#onboarding-world')
  if (svg.empty()) return

  const width = window.innerWidth
  const height = window.innerHeight

  svg.attr('viewBox', [0, 0, width, height])

  const projection = d3.geoNaturalEarth1()
    .scale(width / 6)
    .translate([width / 2, height / 2])

  const pathGen = d3.geoPath().projection(projection)

  d3.json('data/world.geojson').then(worldData => {
    svg.selectAll('path')
      .data(worldData.features)
      .join('path')
      .attr('d', pathGen)
      .attr('fill', '#1e293b')
      .attr('stroke', '#334155')
      .attr('stroke-width', 0.5)
  })
}

export function isOnboardingComplete() {
  return isComplete
}

export function getCurrentStep() {
  return currentStep
}
