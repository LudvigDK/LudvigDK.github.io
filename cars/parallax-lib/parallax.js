const parallax_elements = document.querySelectorAll('[data-parallax]')

parallax_elements.forEach((e) => {
    e.style.zIndex = e.dataset.parallaxLayer || 0
})

function Updateparallax(type) {
    parallax_elements.forEach(e => {
        if (type in e.dataset || type == 'all') {
            let offset_x;
            let offset_y;
            if ('scroll' in e.dataset && 'mouse' in e.dataset) { ({ offset_x, offset_y } = GetOffset(e.closest('parallax'), 'all')) }
            else if ('scroll' in e.dataset) { ({ offset_x, offset_y } = GetOffset(e.closest('parallax'), 'scroll')) }
            else if ('mouse' in e.dataset) { ({ offset_x, offset_y } = GetOffset(e.closest('parallax'), 'mouse')) }
            let data_parallax = parseFloat(e.dataset.parallax)
            e.style.transform = `translate(${offset_x*data_parallax}px, ${offset_y*data_parallax}px)`
        }
    })
}
function GetOffset(parallax_container, type) {
    let mx = 0
    let my = 0
    let sx = 0
    let sy = 0

    if (type == 'mouse' || type == 'all') {
        // Get mouse x, y offset
        const centerX = window.innerWidth / 2
        const centerY = window.innerHeight / 2

        mx = mouse.x - centerX
        my = mouse.y - centerY
    }

    if (type == 'scroll' || type == 'all') {
        // Get scroll offset
        sx = (window.scrollX - (parallax_container.getBoundingClientRect().left + window.scrollX)) * -5
        sy = (window.scrollY - (parallax_container.getBoundingClientRect().top + window.scrollY)) * -5
    }

    return { offset_x: mx + sx, offset_y: my + sy }
}

let mouse = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
window.addEventListener('mousemove', (e) => {
    mouse = { x: e.clientX, y: e.clientY }
})

window.addEventListener('scroll', (e) => {
    Updateparallax('scroll')
})

window.addEventListener('mousemove', (e) => {
    Updateparallax('mouse')
})

Updateparallax('all')