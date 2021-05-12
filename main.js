const PAGES = [
  'page_main', 'page_bibliographies', 'page_primary_sources', 'page_student_publications'
]

const NAVBAR_TABS = [
  'tab_search', 'tab_bibliographies', 'tab_primary_sources', 'tab_student_publications', 'tab_guest_lectures', 'tab_local_archives', 'tab_course_syllabus'
]

const SCROLL_POINTS = {
  'bryx-scrollpoint-search': 'tab_search',
  'bryx-scrollpoint-bibliographies': 'tab_bibliographies',
  'bryx-scrollpoint-primary-sources': 'tab_primary_sources',
  'bryx-scrollpoint-student-publications': 'tab_student_publications',
  'bryx-scrollpoint-speakers': 'tab_guest_lectures',
  'bryx-scrollpoint-localarch': 'tab_local_archives',
  'bryx-scrollpoint-syllabus': 'tab_course_syllabus'
}

function goToPage (pageid, scrollTop) {
  for (const p of PAGES) {
    document.getElementById(p).classList.remove('bryx-page-active')
  }
  document.getElementById(pageid).classList.add('bryx-page-active')

  // Scroll to top
  if (scrollTop === true) {
    document.body.scrollTop = 0 // For Safari
    document.documentElement.scrollTop = 0 // For Chrome, Firefox, IE and Opera
  }

  myScroll(null)
  burgerToggle();
}

function scrollToElementOnPage (pageid, elementid, tabid) {
  goToPage(pageid, false)
  document.getElementById(elementid).scrollIntoView({
    behavior: 'smooth',
    block: 'start',
    inline: 'nearest'
  })
}

function modalToggle (elementid, op) {
  if (op === 1) {
    document.getElementById(elementid).classList.add('is-active')
  } else if (op === -1) {
    document.getElementById(elementid).classList.remove('is-active')
  }
}

function activateTab (tabid) {
  for (const tab of NAVBAR_TABS) {
    document.getElementById(tab).classList.remove('is-active')
  }
  document.getElementById(tabid).classList.add('is-active')
}

const MAX_DIST = 128

function myScroll (event) {
  let nearestDist = MAX_DIST
  let nearestElem = ''
  for (const p of Object.keys(SCROLL_POINTS)) {
    const BBrect = document.getElementById(p).getClientRects()[0]
    if (BBrect !== undefined && Math.abs(BBrect.y) < nearestDist) {
      nearestDist = Math.abs(BBrect.y)
      nearestElem = p
    }
  }

  if (nearestDist < MAX_DIST) {
    activateTab(SCROLL_POINTS[nearestElem])
  }
}
document.onscroll = myScroll

// ----------------  KEYWORD SEARCH ALGORITHM ---------------- //
const UIsearchInputElement = document.getElementById('bryx-input-keywords')
const UIsearchResultCount = document.getElementById('bryx-search-results-count')
const UIsearchResultQuery = document.getElementById('bryx-search-results-query')
const UIsearchResultList = document.getElementById('bryx-search-results-list')

const UIcheckboxBook = document.getElementById('check_book')
const UIcheckboxJournal = document.getElementById('check_journal')
const UIcheckboxWebsite = document.getElementById('check_website')
const UIcheckboxOthers = document.getElementById('check_others')

const index_types_wo_BJW = Object.keys(LUT.index_types).filter((x) => !['book', 'journal', 'website'].includes(x))

let lastSearchQuery = ''

const fuzzyTypes = FuzzySet(Object.keys(LUT.all_keywords))
function searchKeyword (input) {
  if (input.length < 2) return // too short
  const words = input.toLowerCase().match(/\w+/g)
  if (words.length < 1) return // no words

  const possibleResults = []
  for (const word of words) {
    if (word.length < 2) continue
    const r0 = fuzzyTypes.get(word)
    if (r0 !== null) possibleResults.push(r0[0][1])
  }

  if (possibleResults.length < 1) return // no results
  lastSearchQuery = input // last valid query

  UIsearchResultQuery.innerText = possibleResults.join(', ')

  let intersection = LUT.all_keywords[possibleResults[0]]
  for (let i = 1; i < possibleResults.length; i++) {
    intersection = intersection.filter(value => LUT.all_keywords[possibleResults[i]].includes(value))
  }

  const results = []
  for (const objID of intersection) {
    if (!(objID in results)) results[objID] = 0
    results[objID] += LUT.objects[objID][7]
  }

  const sorted = []
  for (const key in results) {
    sorted.push([results[key], key])
  }
  sorted.sort((f, s) => { return f[0] <= s[0] ? 1 : -1 })

  let resultCount = 0
  let filteredResults = false

  UIsearchResultList.innerHTML = ''
  for (const row of sorted) {
    const objID = parseInt(row[1])
    const obj = LUT.objects[objID]

    let skip = false
    if (!UIcheckboxBook.checked && LUT.index_types.book.includes(objID)) skip = true
    else if (!UIcheckboxJournal.checked && LUT.index_types.journal.includes(objID)) skip = true
    else if (!UIcheckboxWebsite.checked && LUT.index_types.website.includes(objID)) skip = true
    else if (!UIcheckboxOthers.checked) {
      const lowercase_types = obj[0].toLowerCase()
      for (const type of index_types_wo_BJW) {
        if (lowercase_types.includes(type)) {
          skip = true
          break
        }
      }
    }

    if (skip) {
      filteredResults = true
      continue
    }

    resultCount++
    UIsearchResultList.innerHTML += `<li>[&star;${row[0]} | ${obj[0]}] <a target="_blank" href="${obj[6]}">${obj[5]}</a>, by ${obj[2]} (${obj[1]}).</li>`
  }

  UIsearchResultCount.innerText = resultCount + (filteredResults ? ' filtered' : '')
}

const UIsearchSuggestions = document.getElementById('bryx-search-suggestions')
function searchSuggestions (input) {
  UIsearchSuggestions.innerHTML = ''
  if (input.length < 1) { // too short
    UIsearchSuggestions.innerHTML += '<tr><td>Begin typing to search</td></tr>'
    return
  }

  const words = input.toLowerCase().match(/\w+/g)
  if (words.length < 1) return // no words

  const fixedResults = []
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i]
    if (word.length < 1) continue
    const r0 = fuzzyTypes.get(word)
    fixedResults.push(r0[0][1])
  }
  const fixedPartStr = fixedResults.join(' ')

  const lastword = words[words.length - 1]
  const r0 = fuzzyTypes.get(lastword)
  for (let i = 0; i < Math.min(8, r0.length); i++) {
    if (r0 !== null) {
      UIsearchSuggestions.innerHTML += `<tr ${(i === 0 ? 'style="color:green;font-weight:bold;font-size:150%;"' : '')}><td>${fixedPartStr} ${r0[i][1]}</td></tr>`
    }
  }
}

function redirectToSearch (input) {
  goToPage('page_bibliographies', true)
  UIsearchInputElement.value = input
  searchKeyword(input)
}

function union (setA, setB) {
  const _union = new Set(setA)
  for (const elem of setB) {
    _union.add(elem)
  }
  return _union
}

const UIburger = document.getElementById('bryx-burger')
const UIburgermenu = document.getElementById('bryx-burger-menu')
function burgerToggle () {
  UIburger.classList.toggle('is-active')
  UIburgermenu.classList.toggle('is-active')
}

const UIbibCount = document.getElementById('bryx-all-bib-counter')
const UIallBibProgress = document.getElementById('bryx-all-bib-progress')
const UIallBibList = document.getElementById('bryx-all-bib-list')
let allBibGenerating = false
let allBibBuilderIndex = 0
function slowlyBuildTable () {
  let i = allBibBuilderIndex
  let scratchSpace = ''
  for (; i < allBibBuilderIndex + 100; i++) {
    if (i >= LUT.objects.length) break
    const obj = LUT.objects[i]
    scratchSpace += `<tr><td>${i}</td><td>${obj[7]}</td><td>${obj[0]}</td><td><a target="_blank" href="${obj[6]}">${obj[5]}</a></td><td>${obj[2]}</td><td>${obj[3]}</td></tr>`
  }
  UIallBibList.innerHTML += scratchSpace
  allBibBuilderIndex = i
  UIallBibProgress.value = i
  UIbibCount.innerText = i
  if (allBibBuilderIndex < LUT.objects.length) {
    requestAnimationFrame(slowlyBuildTable)
  }
}

function generateAllBibTable () {
  allBibGenerating = true
  UIallBibProgress.max = LUT.objects.length - 1
  UIallBibList.innerHTML = ''
  allBibBuilderIndex = 0
  requestAnimationFrame(slowlyBuildTable)
}

const UIsearchPanel = document.getElementById('bryx-search-panel')
const UIsearchResultPanel = document.getElementById('bryx-panel-search-results')
const UIallBibPanel = document.getElementById('bryx-panel-all-bib')
const UIbibTitle = document.getElementById('bryx-bib-title')
const UIbibToggleBtn = document.getElementById('bryx-bib-toggle')

let allBibState = 1
function allBibToggle () {
  if (allBibState === 1) {
    UIsearchPanel.classList.remove('bryx-page-active')
    UIbibToggleBtn.innerText = 'Hide All Bibliographies'
    UIbibTitle.innerText = 'All Bibliographies'
    UIsearchResultPanel.classList.remove('bryx-page-active')
    UIallBibPanel.classList.add('bryx-page-active')
    if (!allBibGenerating) generateAllBibTable()
  } else {
    UIsearchPanel.classList.add('bryx-page-active')
    UIbibToggleBtn.innerText = 'Show All Bibliographies'
    UIbibTitle.innerText = 'Search Bibliographies'
    UIsearchResultPanel.classList.add('bryx-page-active')
    UIallBibPanel.classList.remove('bryx-page-active')
  }

  allBibState *= -1
}
