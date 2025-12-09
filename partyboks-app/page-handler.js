const transitions = {
    'none': '',
    'fade': 'opacity: 0;',
    'strict': 'display: none;',
    'slide-down': 'top: 100%;',
    'slide-up': 'top: -100%;',
    'slide-left': 'left: -100%;',
    'slide-right': 'left: 100%;'
}

const navbar_links = document.querySelectorAll('nav a')
const pages = document.querySelectorAll('section[data-page]')

function hashChanged() {
    pages.forEach(e => {
        if (e.dataset.page == window.location.hash) {
            e.classList.remove('custom-hide')
            e.style.cssText = ''
        } else {
            if (e.dataset.transition == 'custom') {
                e.classList.add('custom-hide')
            } else {    
                e.style.cssText += transitions[e.dataset.transition]
            }
        }
    });
    navbar_links.forEach(e => {
        if (e.getAttribute('href') == window.location.hash) {
            e.classList.add('current')
        } else {
            e.classList.remove('current')
        }
    });
}

window.addEventListener('hashchange', hashChanged)

const initial_page = document.querySelector('section[data-initial]')
window.location.hash = initial_page.dataset.page
hashChanged()