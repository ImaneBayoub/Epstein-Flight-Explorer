let currentStep = 0
let tutorialActive = false
let stepCompleted = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false }
let originalDates = { start: null, end: null }

const tutorialSteps = [
  {
    id: 'step-calendar',
    title: 'Step 1: The Calendar',
    text: 'Select a new date',
    targetType: 'calendar',
    targetId: 'date-controls'
  },
  {
    id: 'step-epstein',
    title: 'Step 2: Epstein Island',
    text: 'Click this button to filter flights to Jeffrey Epstein’s island',
    targetType: 'epstein',
    targetId: 'epstein-island-filter'
  },
  {
    id: 'step-flight',
    title: 'Step 3: Flights',
    text: 'Click on a flight route',
    targetType: 'flight',
    targetId: 'map'
  },
  {
    id: 'step-close-detail',
    title: 'Step 3b: Close',
    text: 'Click the X to close',
    targetType: 'close-detail',
    targetId: 'close-flight-detail'
  },
  {
    id: 'step-chord',
    title: 'Step 4: The Network',
    text: 'Click on a category',
    targetType: 'chord',
    targetId: 'chord-panel'
  },
  {
    id: 'step-expand',
    title: 'Step 5: Expand',
    text: 'Click "Expand"',
    targetType: 'expand',
    targetId: 'expand-chord'
  },
  {
    id: 'step-ribbon',
    title: 'Step 6: Connections',
    text: 'Click on a link to see shared flights',
    targetType: 'ribbon',
    targetId: 'chord-panel'
  }
];

const targetSelectors = {
  epstein: '#epstein-island-filter',
  calendar: '#date-controls',
  flight: '#map',
  'close-detail': '#close-flight-detail',
  chord: '#chord-panel',
  expand: '#expand-chord',
  ribbon: '#chord-panel'
}

function getDateValue(prefix) {
  const day = document.getElementById(`${prefix}-day`)?.value || ''
  const month = document.getElementById(`${prefix}-month`)?.value || ''
  const year = document.getElementById(`${prefix}-year`)?.value || ''
  return `${year}-${month}-${day}`
}

export function initTutorial() {
  const skipBtn = document.getElementById('tutorial-skip')
  if (skipBtn) {
    skipBtn.addEventListener('click', completeTutorial)
  }
  
  const dateSelects = document.querySelectorAll('.date-select')
  dateSelects.forEach(select => {
    select.addEventListener('change', handleDateChange)
  })
}

export function startTutorial() {
  if (tutorialActive) return
  
  tutorialActive = true
  currentStep = 0
  stepCompleted = { 0: false, 1: false, 2: false, 3: false, 4: false, 5: false, 6: false }
  
  originalDates.start = getDateValue('date-start')
  originalDates.end = getDateValue('date-end')
  
  setupTutorialListeners()
  highlightCurrentTarget()
  showStep(0)
}

function setupTutorialListeners() {
  document.addEventListener('click', handleTutorialClick, false)
}

function removeTutorialListeners() {
  document.removeEventListener('click', handleTutorialClick, false)
}

function highlightCurrentTarget() {
  document.querySelectorAll('.tutorial-active').forEach(el => {
    el.classList.remove('tutorial-active')
  })
  clearTutorialHighlights()
  
  const step = tutorialSteps[currentStep]
  if (step && targetSelectors[step.targetType]) {
    const target = document.querySelector(targetSelectors[step.targetType])
    if (target) {
      target.classList.add('tutorial-active')
    }
  }
  
  if (step.targetType === 'flight') {
    highlightTutorialRoute()
  } else if (step.targetType === 'chord') {
    highlightTutorialCategory()
  } else if (step.targetType === 'ribbon') {
    highlightTutorialRibbon()
    highlightTutorialSharedInfo()
  }
}

function highlightTutorialSharedInfo() {
  const infoEl = document.getElementById('shared-flights-info')
  if (infoEl) {
    infoEl.classList.add('tutorial-highlight')
  }
}

function highlightTutorialRoute() {
  const routes = document.querySelectorAll('.route-group')
  if (routes.length > 0) {
    const route = routes[Math.floor(Math.random() * routes.length)]
    route.classList.add('tutorial-highlight')
    const line = route.querySelector('line')
    if (line) {
      line.setAttribute('stroke', '#69b3a2')
      line.setAttribute('stroke-width', '3')
      line.setAttribute('stroke-opacity', '1')
    }
  }
}

function highlightTutorialCategory() {
  const categories = document.querySelectorAll('.legend-category')
  if (categories.length > 0) {
    const category = categories[Math.floor(Math.random() * categories.length)]
    category.classList.add('tutorial-highlight')
    category.style.border = '2px solid #69b3a2'
    category.style.boxShadow = '0 0 15px rgba(105, 179, 162, 0.6)'
    category.style.background = 'rgba(105, 179, 162, 0.15)'
  }
}

function highlightTutorialRibbon() {
  const ribbons = document.querySelectorAll('.chord-ribbons path')
  if (ribbons.length > 0) {
    const ribbon = ribbons[Math.floor(Math.random() * ribbons.length)]
    ribbon.classList.add('tutorial-highlight')
    ribbon.setAttribute('fill-opacity', '1')
    ribbon.setAttribute('stroke', '#69b3a2')
    ribbon.setAttribute('stroke-width', '2')
  }
}

function clearTutorialHighlights() {
  document.querySelectorAll('.tutorial-highlight').forEach(el => {
    el.classList.remove('tutorial-highlight')
    if (el.tagName === 'line') {
      el.setAttribute('stroke', '')
      el.setAttribute('stroke-width', '')
      el.setAttribute('stroke-opacity', '')
    } else if (el.tagName === 'path' && el.closest('.chord-ribbons')) {
      el.setAttribute('fill-opacity', '')
      el.setAttribute('stroke', '')
      el.setAttribute('stroke-width', '')
    } else {
      el.style.border = ''
      el.style.boxShadow = ''
      el.style.background = ''
    }
  })
}

function handleDateChange(event) {
  if (!tutorialActive) return
  if (tutorialSteps[currentStep].targetType !== 'calendar') return
  
  const currentStart = getDateValue('date-start')
  const currentEnd = getDateValue('date-end')
  
  if (currentStart !== originalDates.start || currentEnd !== originalDates.end) {
    completeStep(currentStep)
  }
}

function handleTutorialClick(event) {
  if (!tutorialActive) return
  
  const step = tutorialSteps[currentStep]
  if (!step) return
  
  let validClick = false
  
  if (step.targetType === 'epstein') {
    validClick = event.target.closest('#epstein-island-filter') !== null
  } else if (step.targetType === 'calendar') {
    validClick = event.target.classList.contains('date-select')
  } else if (step.targetType === 'flight') {
    validClick = event.target.closest('.route-group') !== null
  } else if (step.targetType === 'close-detail') {
    validClick = event.target.closest('#close-flight-detail') !== null
  } else if (step.targetType === 'chord') {
    validClick = event.target.closest('.legend-category') !== null
  } else if (step.targetType === 'expand') {
    validClick = event.target.closest('#expand-chord') !== null
  } else if (step.targetType === 'ribbon') {
    validClick = event.target.tagName === 'path' && event.target.closest('.chord-ribbons')
  }
  
  if (validClick) {
    completeStep(currentStep)
  }
}

function showStep(stepIndex) {
  const step = tutorialSteps[stepIndex]
  if (!step) return
  
  const title = document.getElementById('tutorial-title')
  const text = document.getElementById('tutorial-text')
  const hintText = document.getElementById('tutorial-hint-text')
  const progressDots = document.querySelectorAll('.tutorial-step-dot')
  const tutorialContent = document.getElementById('tutorial-content')
  const tutorialOverlay = document.getElementById('tutorial-overlay')
  
  if (title) title.textContent = step.title
  if (text) text.textContent = step.text
  if (hintText) hintText.textContent = 'Click on the highlighted element'
  
  progressDots.forEach((dot, i) => {
    dot.classList.remove('active', 'completed')
    if (i < stepIndex) dot.classList.add('completed')
    if (i === stepIndex) dot.classList.add('active')
  })
  
  tutorialOverlay.classList.add('active')
  tutorialContent.style.pointerEvents = 'none'
}

function completeStep(stepIndex) {
  if (stepCompleted[stepIndex]) return
  
  stepCompleted[stepIndex] = true
  currentStep++
  
  if (currentStep < tutorialSteps.length) {
    highlightCurrentTarget()
    showStep(currentStep)
  } else {
    completeTutorial()
  }
}

function completeTutorial() {
  tutorialActive = false
  removeTutorialListeners()
  
  document.querySelectorAll('.tutorial-active').forEach(el => {
    el.classList.remove('tutorial-active')
  })
  clearTutorialHighlights()
  
  const overlay = document.getElementById('tutorial-overlay')
  const tutorialContent = document.getElementById('tutorial-content')
  if (overlay) {
    overlay.classList.remove('active')
  }
  if (tutorialContent) {
    tutorialContent.style.pointerEvents = 'none'
  }
}

export function isTutorialComplete() {
  return stepCompleted[0] && stepCompleted[1] && stepCompleted[2] && stepCompleted[3] && stepCompleted[4] && stepCompleted[5] && stepCompleted[6]
}

export function isTutorialActive() {
  return tutorialActive
}
