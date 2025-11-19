const locations = [
    {x: 20, y: -10, r: 70},
    {x: 15, y: -9, r: 60},
    {x: 10, y: -7, r: 30},
    {x: 7, y: -4, r: 15},
    {x: 5, y: -1, r: 0},
    {x: 6, y: 3, r: -30},
    {x: 8, y: 5, r: -45},
    {x: 12, y: 7, r: -60},
    {x: 17, y: 8, r: -75},
    {x: 23, y: 9, r: -75},
    {x: 27, y: 10, r: -70},
    {x: 32, y: 10, r: -40},
    {x: 34, y: 13, r: -10},
    {x: 35, y: 15, r: 15},
    {x: 35, y: 18, r: 35},
    {x: 31, y: 19, r: 70},
    {x: 27, y: 18, r: 90},
    {x: 19, y: 19, r: 80},
    {x: 12, y: 20, r: 60},
    {x: 7, y: 23, r: 10},
    {x: 6, y: 26, r: -10},
    {x: 8, y: 30, r: -20},
    {x: 11, y: 34, r: -20},
    {x: 14, y: 37, r: -10},
    {x: 15, y: 42, r: 20},
    {x: 14, y: 44, r: 40},
    {x: 12, y: 46, r: 60},
    {x: 6, y: 46, r: 80},
    {x: 0, y: 47, r: 60},
    {x: -5, y: 50, r: 30},
    {x: -7, y: 52, r: 10},
    {x: -7, y: 55, r: -20},
    {x: -5, y: 57, r: -50},
    {x: 0, y: 60, r: -80},
    {x: 5, y: 60, r: -85},
    {x: 13, y: 61, r: -85},
    {x: 17, y: 61, r: -85},
    {x: 20, y: 61, r: -75},
    {x: 23, y: 62, r: -70},
    {x: 27, y: 63, r: -50},
    {x: 32, y: 65, r: -20},
    {x: 33, y: 67, r: 0},
    {x: 32, y: 69, r: 20},
    {x: 28, y: 71, r: 50},
    {x: 23, y: 73, r: 80},
    {x: 18, y: 73, r: 80},
    {x: 14, y: 74, r: 60},
    {x: 10, y: 76, r: 40},
    {x: 7, y: 78, r: 10},
    {x: 7, y: 80, r: -20},
    {x: 9, y: 82, r: -30},
    {x: 13, y: 85, r: -30},
    {x: 16, y: 87, r: -40}
]

const route66 = document.querySelector('#route66')
const lightning_mcqueen_top = document.querySelector('#lightning-mcqueen-top')
const top_offset = 650

window.addEventListener('scroll', (e) => {
    if (window.scrollY < top_offset) {
        route66.classList.remove('visible')
        lightning_mcqueen_top.classList.remove('visible')
        return
    }
    route66.classList.add('visible')
    lightning_mcqueen_top.classList.add('visible')

    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const scrollPercent = (window.scrollY - top_offset) / (maxScroll - top_offset);
    const target_index = (locations.length - 2) * scrollPercent
    
    const x = locations[Math.floor(target_index)].x + ((locations[Math.ceil(target_index)].x - locations[Math.floor(target_index)].x) * (target_index - Math.floor(target_index)))
    const y = locations[Math.floor(target_index)].y + ((locations[Math.ceil(target_index)].y - locations[Math.floor(target_index)].y) * (target_index - Math.floor(target_index)))
    const r = locations[Math.floor(target_index)].r + ((locations[Math.ceil(target_index)].r - locations[Math.floor(target_index)].r) * (target_index - Math.floor(target_index)))

    lightning_mcqueen_top.style.setProperty('--x',  `${x}%`)
    lightning_mcqueen_top.style.setProperty('--y',  `${y}%`)
    lightning_mcqueen_top.style.setProperty('--r',  `${r}deg`)
})