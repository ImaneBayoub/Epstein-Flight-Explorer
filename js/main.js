import { loadData, minDate, maxDate, getPeopleDetails, setEpsteinIslandFilter, getEpsteinIslandFilter } from './data.js'
import { initMap, renderWorldMap, renderFlights, updateMapSize } from './map.js'
import { renderChordDiagram, updateSelectionInfo, clearSelection, getSelectedCategory, getSelectedPerson, getChordData, setSelectedCategory, setSelectedPerson } from './chord.js'
import { showFlightDetail, hideFlightDetail } from './ui.js'
import { initOnboarding, hideVizHints, dismissHintsOnInteraction, setOnCompleteCallback, isOnboardingComplete, showVizHints } from './onboarding.js'
import { initTutorial, startTutorial, isTutorialComplete } from './tutorial.js'

let renderFlightsCallback = null

function populateDateSelects() {
  const daySelect = document.getElementById('date-start-day')
  const monthSelect = document.getElementById('date-start-month')
  const yearSelect = document.getElementById('date-start-year')
  const daySelectEnd = document.getElementById('date-end-day')
  const monthSelectEnd = document.getElementById('date-end-month')
  const yearSelectEnd = document.getElementById('date-end-year')
  
  for (let i = 1; i <= 31; i++) {
    daySelect.innerHTML += `<option value="${i}">${i}</option>`
    daySelectEnd.innerHTML += `<option value="${i}">${i}</option>`
  }
  
  const months = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc']
  months.forEach((m, i) => {
    monthSelect.innerHTML += `<option value="${i + 1}">${m}</option>`
    monthSelectEnd.innerHTML += `<option value="${i + 1}">${m}</option>`
  })
  
  const startYear = minDate.getFullYear()
  const endYear = maxDate.getFullYear()
  for (let y = startYear; y <= endYear; y++) {
    yearSelect.innerHTML += `<option value="${y}">${y}</option>`
    yearSelectEnd.innerHTML += `<option value="${y}">${y}</option>`
  }
}

function getDateFromSelects(prefix) {
  const day = parseInt(document.getElementById(`${prefix}-day`).value)
  const month = parseInt(document.getElementById(`${prefix}-month`).value) - 1
  const year = parseInt(document.getElementById(`${prefix}-year`).value)
  return new Date(year, month, day)
}

function setSelectsFromDate(prefix, date) {
  document.getElementById(`${prefix}-day`).value = date.getDate()
  document.getElementById(`${prefix}-month`).value = date.getMonth() + 1
  document.getElementById(`${prefix}-year`).value = date.getFullYear()
}

function getDateValue(prefix) {
  return document.getElementById(`${prefix}-year`).value + '-' + 
         String(document.getElementById(`${prefix}-month`).value).padStart(2, '0') + '-' + 
         String(document.getElementById(`${prefix}-day`).value).padStart(2, '0')
}

async function init() {
  let worldData
  try {
    const result = await loadData()
    worldData = result.worldData
  } catch(e) {
    console.error('Error loading data:', e)
    return
  }

  initMap()
  renderWorldMap(worldData)

  populateDateSelects()
  setSelectsFromDate('date-start', minDate)
  setSelectsFromDate('date-end', maxDate)

  const flightCountEl = document.getElementById('flight-count')
  const resetBtn = document.getElementById('reset-dates')
  const chordPanel = document.getElementById('chord-panel')
  const expandBtn = document.getElementById('expand-chord')
  const resetChordBtn = document.getElementById('reset-chord')
  const clearSelectionBtn = document.getElementById('clear-selection')
  const closeFlightDetailBtn = document.getElementById('close-flight-detail')
  const personTooltip = document.getElementById('person-tooltip')
  const flightTooltip = document.getElementById('flight-tooltip')
  const flightDetail = document.getElementById('flight-detail')

  const personDetails = getPeopleDetails()

  function doRenderFlights() {
    const startDate = getDateFromSelects('date-start')
    const endDate = getDateFromSelects('date-end')
    renderFlights(startDate, endDate, flightCountEl, getSelectedCategory(), getSelectedPerson(), showFlightDetail, personTooltip, flightTooltip, dismissHintsOnInteraction)
    renderChordDiagram(personDetails, personTooltip, updateSelectionInfo, () => {
      dismissHintsOnInteraction()
      doRenderFlights()
    }, showFlightDetail, startDate, endDate)
  }

  renderFlightsCallback = doRenderFlights
  doRenderFlights()

  const dateSelects = document.querySelectorAll('.date-select')
  dateSelects.forEach(select => {
    select.addEventListener('change', () => {
      dismissHintsOnInteraction()
      doRenderFlights()
    })
  })

  resetBtn.addEventListener('click', () => {
    setSelectsFromDate('date-start', minDate)
    setSelectsFromDate('date-end', maxDate)
    setEpsteinIslandFilter(false)
    document.getElementById('epstein-island-filter').classList.remove('active')
    clearSelection()
    doRenderFlights()
  })

  const epsteinIslandBtn = document.getElementById('epstein-island-filter')
  epsteinIslandBtn.addEventListener('click', () => {
    const isActive = epsteinIslandBtn.classList.toggle('active')
    setEpsteinIslandFilter(isActive)
    doRenderFlights()
  })

  expandBtn.addEventListener('click', () => {
    dismissHintsOnInteraction()
    chordPanel.classList.toggle('expanded')
    expandBtn.textContent = chordPanel.classList.contains('expanded') ? 'Réduire' : 'Agrandir'
    setTimeout(() => {
      const startDate = getDateFromSelects('date-start')
      const endDate = getDateFromSelects('date-end')
      renderChordDiagram(personDetails, personTooltip, updateSelectionInfo, () => {
        dismissHintsOnInteraction()
        doRenderFlights()
      }, showFlightDetail, startDate, endDate)
    }, 350)
  })

  resetChordBtn.addEventListener('click', () => {
    clearSelection()
    document.getElementById('chord-search').value = ''
    doRenderFlights()
  })

  const searchInput = document.getElementById('chord-search')
  const searchResults = document.getElementById('chord-search-results')
  
  searchInput.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim()
    const chordData = getChordData()
    
    searchResults.innerHTML = ''
    searchResults.classList.remove('visible')
    
    if (!chordData || !query) {
      setSelectedPerson(null)
      setSelectedCategory(null)
      updateSelectionInfo()
      doRenderFlights()
      return
    }

    const matchedPersons = chordData.people
      .filter(p => p.name.toLowerCase().includes(query))
      .slice(0, 10)

    if (matchedPersons.length > 0) {
      matchedPersons.forEach(person => {
        const div = document.createElement('div')
        div.textContent = person.name
        div.addEventListener('click', () => {
          searchInput.value = person.name
          searchResults.classList.remove('visible')
          setSelectedPerson(person.name)
          setSelectedCategory(null)
          updateSelectionInfo()
          doRenderFlights()
        })
        searchResults.appendChild(div)
      })
      searchResults.classList.add('visible')
    }
  })

  searchInput.addEventListener('blur', () => {
    setTimeout(() => searchResults.classList.remove('visible'), 200)
  })

  clearSelectionBtn.addEventListener('click', () => {
    clearSelection()
    doRenderFlights()
  })

  closeFlightDetailBtn.addEventListener('click', hideFlightDetail)

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && flightDetail.classList.contains('visible')) {
      hideFlightDetail()
    }
  })

  window.addEventListener('resize', () => {
    updateMapSize()
    doRenderFlights()
  })

  setOnCompleteCallback(() => {
    console.log('Onboarding complete, starting tutorial...')
    initTutorial()
    if (!isTutorialComplete()) {
      console.log('Starting tutorial now')
      setTimeout(() => startTutorial(), 500)
    } else {
      console.log('Tutorial already complete')
      showVizHints()
    }
  })
  
  initOnboarding()
}

document.addEventListener('DOMContentLoaded', init)

export { getDateValue }
